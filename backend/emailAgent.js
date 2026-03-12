// ============================================================
// agents/emailAgent.js — Multi-provider email enrichment
// ============================================================
const axios  = require('axios');
const { logger } = require('../utils/logger');

const sleep  = (ms) => new Promise(r => setTimeout(r, ms));

class EmailAgent {
  constructor() {
    this.apolloKey = process.env.APOLLO_API_KEY;
    this.hunterKey = process.env.HUNTER_API_KEY;
    this.snovKey   = process.env.SNOV_CLIENT_ID;
    this.snovSecret= process.env.SNOV_CLIENT_SECRET;
  }

  async findEmail({ name, domain, company, linkedinUrl }) {
    if (!name && !domain) return {};

    const [firstName, ...rest] = (name || '').split(' ');
    const lastName = rest.join(' ');
    const result   = { email_professional: '', email_generic: '', phone: '', email_source: '', email_verified: 0 };

    // ── Try providers in order ────────────────────────────
    const providers = [
      () => this._apollo(firstName, lastName, domain, linkedinUrl),
      () => this._hunter(firstName, lastName, domain),
      () => this._snov(firstName, lastName, domain),
      () => this._guessEmails(firstName, lastName, domain),
    ];

    for (const pFn of providers) {
      try {
        const data = await pFn();
        if (data?.email) {
          result.email_professional = data.email;
          result.email_source       = data.source || 'unknown';
          result.email_verified     = data.verified ? 1 : 0;
          result.phone              = data.phone || '';
          break;
        }
      } catch (e) {
        logger.debug(`Email provider failed: ${e.message}`);
      }
      await sleep(500);
    }

    // Generic fallback
    if (!result.email_professional && domain) {
      result.email_generic = `info@${domain}`;
    }

    return result;
  }

  // ── Apollo.io ─────────────────────────────────────────
  async _apollo(firstName, lastName, domain, linkedinUrl) {
    if (!this.apolloKey) return null;

    const res = await axios.post('https://api.apollo.io/v1/people/match', {
      first_name:   firstName,
      last_name:    lastName,
      domain,
      linkedin_url: linkedinUrl,
      reveal_personal_emails: false,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': this.apolloKey,
      },
      timeout: 12000
    });

    const person = res.data?.person;
    if (!person) return null;

    const email = person.email || (person.email_status === 'verified' ? person.email : null);
    return {
      email:    email || '',
      phone:    person.phone_numbers?.[0]?.sanitized_number || '',
      source:   'apollo',
      verified: person.email_status === 'verified',
    };
  }

  // ── Hunter.io ─────────────────────────────────────────
  async _hunter(firstName, lastName, domain) {
    if (!this.hunterKey || !domain) return null;

    const res = await axios.get('https://api.hunter.io/v2/email-finder', {
      params: {
        domain,
        first_name: firstName,
        last_name:  lastName,
        api_key:    this.hunterKey,
      },
      timeout: 10000
    });

    const data = res.data?.data;
    return {
      email:    data?.email || '',
      source:   'hunter',
      verified: data?.confidence > 70,
    };
  }

  // ── Snov.io ───────────────────────────────────────────
  async _snov(firstName, lastName, domain) {
    if (!this.snovKey || !this.snovSecret) return null;

    // 1. Get access token
    const tokenRes = await axios.post('https://api.snov.io/v1/oauth/access_token', {
      grant_type: 'client_credentials',
      client_id:  this.snovKey,
      client_secret: this.snovSecret,
    }, { timeout: 8000 });

    const token = tokenRes.data?.access_token;
    if (!token) return null;

    // 2. Find emails
    const res = await axios.get('https://api.snov.io/v2/get-prospect-with-url', {
      params: { url: `https://${domain}`, firstName, lastName, type: 'professional' },
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000
    });

    const emails = res.data?.data?.emails || [];
    const best   = emails.find(e => e.confidence >= 70) || emails[0];
    return { email: best?.email || '', source: 'snov', verified: (best?.confidence || 0) >= 70 };
  }

  // ── Pattern-based email guess ──────────────────────────
  async _guessEmails(firstName, lastName, domain) {
    if (!firstName || !domain) return null;
    const f = firstName.toLowerCase().replace(/[^a-z]/g, '');
    const l = lastName.toLowerCase().replace(/[^a-z]/g, '');
    // Most common patterns
    const patterns = [
      `${f}.${l}@${domain}`,
      `${f[0]}${l}@${domain}`,
      `${f}@${domain}`,
      `${f}${l[0]}@${domain}`,
    ];
    return { email: patterns[0], source: 'pattern', verified: false };
  }
}

module.exports = EmailAgent;
