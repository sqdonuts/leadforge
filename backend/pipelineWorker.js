// ============================================================
// agents/pipelineWorker.js — Master pipeline orchestrator
// ============================================================
const { v4: uuidv4 }  = require('uuid');
const pLimit           = require('p-limit');

const { logger }       = require('../utils/logger');
const db               = require('../db/database');
const LinkedInAgent    = require('./linkedinAgent');
const EnrichmentAgent  = require('./enrichmentAgent');
const EmailAgent       = require('./emailAgent');
const GoogleAgent      = require('./googleAgent');
const { scoreLeads }   = require('./leadScorer');

class PipelineWorker {
  constructor({ searchId, category, location, limit, linkedinCreds, socket }) {
    this.searchId       = searchId;
    this.category       = category;
    this.location       = location;
    this.limit          = Math.min(parseInt(limit) || 100, 500);
    this.linkedinCreds  = linkedinCreds;
    this.socket         = socket;
    this._cancelled     = false;

    this.concurrency    = parseInt(process.env.PIPELINE_CONCURRENCY) || 3;
    this.limiter        = pLimit(this.concurrency);
  }

  emit(event, data) {
    this.socket.emit(event, { searchId: this.searchId, ...data });
  }

  cancel() {
    this._cancelled = true;
    logger.info(`Pipeline cancelled: ${this.searchId}`);
    this.emit('pipeline_cancelled', {});
  }

  async run() {
    logger.info(`Pipeline starting: category="${this.category}" location="${this.location}" limit=${this.limit}`);
    this.emit('pipeline_start', { category: this.category, location: this.location, limit: this.limit });

    try {
      // ── Stage 1: LinkedIn scraping ─────────────────────
      await this._stage('linkedin', 'Scraping LinkedIn profiles', async () => {
        const agent  = new LinkedInAgent(this.linkedinCreds);
        const leads  = await agent.search(this.category, this.location, this.limit);

        for (const lead of leads) {
          if (this._cancelled) break;
          const id = uuidv4();
          db.upsertLead({ id, search_id: this.searchId, linkedin_done: 1, ...lead });
          db.updateSearch(this.searchId, { total_found: db.countLeads(this.searchId) });
          this.emit('lead_added', { lead: { id, ...lead } });
        }
        return leads.length;
      });

      if (this._cancelled) return this._finish('cancelled');

      // ── Stage 2–4: Parallel enrichment per lead ────────
      const leads = db.getLeads(this.searchId);
      let enrichedCount = 0;

      const tasks = leads.map(lead => this.limiter(async () => {
        if (this._cancelled) return;

        try {
          // Stage 2: Company enrichment
          const enrichment = await new EnrichmentAgent().enrich(lead);
          db.updateLead(lead.id, { ...enrichment, enrichment_done: 1 });
          this.emit('lead_enriched', { leadId: lead.id, step: 'company', data: enrichment });

          // Stage 3: Email finder
          const emailData = await new EmailAgent().findEmail({
            name: lead.full_name,
            domain: enrichment.company_domain,
            company: lead.company,
            linkedinUrl: lead.linkedin_url
          });
          db.updateLead(lead.id, { ...emailData, email_done: 1 });
          this.emit('lead_enriched', { leadId: lead.id, step: 'email', data: emailData });

          // Stage 4: Google Business
          const googleData = await new GoogleAgent().scrape(lead.company, this.location);
          const scored     = scoreLeads({ ...lead, ...enrichment, ...emailData, ...googleData });
          db.updateLead(lead.id, { ...googleData, ...scored, google_done: 1 });
          this.emit('lead_enriched', { leadId: lead.id, step: 'google', data: { ...googleData, ...scored } });

          enrichedCount++;
          db.updateSearch(this.searchId, { total_enriched: enrichedCount });
          this.emit('pipeline_progress', { enriched: enrichedCount, total: leads.length });

        } catch (err) {
          logger.error(`Lead enrichment failed for ${lead.id}: ${err.message}`);
          db.updateLead(lead.id, { pipeline_error: err.message });
          this.emit('lead_error', { leadId: lead.id, message: err.message });
        }
      }));

      this.emit('stage_start', { stage: 'enrichment', label: 'Enriching leads (company + email + Google)', total: leads.length });
      await Promise.allSettled(tasks);

      this._finish('done');

    } catch (err) {
      logger.error('Pipeline fatal error:', err);
      db.updateSearch(this.searchId, { status: 'error' });
      this.emit('pipeline_error', { message: err.message });
      throw err;
    }
  }

  async _stage(name, label, fn) {
    logger.info(`[${this.searchId}] Stage: ${name}`);
    this.emit('stage_start', { stage: name, label });
    const result = await fn();
    this.emit('stage_done', { stage: name, result });
    return result;
  }

  _finish(status) {
    db.updateSearch(this.searchId, { status, finished_at: new Date().toISOString() });
    this.emit('pipeline_done', { status, leads: db.getLeads(this.searchId) });
    logger.info(`Pipeline finished [${status}]: ${this.searchId}`);
  }
}

module.exports = { PipelineWorker };
