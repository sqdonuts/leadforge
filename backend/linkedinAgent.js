// ============================================================
// agents/linkedinAgent.js — LinkedIn headless scraper
// ============================================================
const { chromium }  = require('playwright');
const UserAgent     = require('user-agents');
const { logger }    = require('../utils/logger');
const { saveSession, loadSession } = require('../db/database');

const LINKEDIN_BASE = 'https://www.linkedin.com';
const SEARCH_PAUSE  = [3000, 6000]; // random delay ms range

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const rand  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

class LinkedInAgent {
  constructor(creds = {}) {
    this.email    = creds.email    || process.env.LINKEDIN_EMAIL;
    this.password = creds.password || process.env.LINKEDIN_PASSWORD;
    this.browser  = null;
    this.page     = null;
    this._cancelled = false;
  }

  async launch() {
    logger.info('Launching headless browser...');
    this.browser = await chromium.launch({
      headless: process.env.HEADLESS !== 'false',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
      ]
    });

    const ctx = await this.browser.newContext({
      userAgent: new UserAgent({ deviceCategory: 'desktop' }).toString(),
      viewport: { width: 1366, height: 768 },
      locale: 'en-US',
      timezoneId: 'America/Los_Angeles',
    });

    // Restore cookies if available
    const saved = loadSession('linkedin_cookies');
    if (saved) { await ctx.addCookies(saved); logger.info('Restored LinkedIn session'); }

    this.page = await ctx.newPage();

    // Stealth: mask navigator.webdriver
    await this.page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      window.chrome = { runtime: {} };
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    });
  }

  async login() {
    if (!this.email || !this.password) throw new Error('LinkedIn credentials missing. Set LINKEDIN_EMAIL / LINKEDIN_PASSWORD.');

    logger.info('Logging into LinkedIn...');
    await this.page.goto(`${LINKEDIN_BASE}/login`, { waitUntil: 'networkidle' });

    // Check if already logged in
    if (this.page.url().includes('/feed')) { logger.info('Already logged in'); return; }

    await this.page.fill('#username', this.email);
    await sleep(rand(500, 1200));
    await this.page.fill('#password', this.password);
    await sleep(rand(300, 800));
    await this.page.click('[type="submit"]');
    await this.page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });

    if (this.page.url().includes('/checkpoint')) {
      throw new Error('LinkedIn requires verification. Complete 2FA manually and retry.');
    }
    if (!this.page.url().includes('/feed')) {
      throw new Error('LinkedIn login failed. Check credentials.');
    }

    // Save session cookies
    const cookies = await this.page.context().cookies();
    saveSession('linkedin_cookies', cookies, 23);
    logger.info('LinkedIn login successful, session saved');
  }

  async search(category, location, limit) {
    await this.launch();
    await this.login();

    const leads   = [];
    const perPage = 10;
    const pages   = Math.ceil(limit / perPage);

    // Build search URL
    const query   = encodeURIComponent(`"${category}" "${location}"`);
    const searchBase = `${LINKEDIN_BASE}/search/results/people/?keywords=${query}&origin=GLOBAL_SEARCH_HEADER`;

    logger.info(`Searching LinkedIn: ${category} in ${location}, target=${limit}`);

    for (let p = 0; p < pages && leads.length < limit; p++) {
      if (this._cancelled) break;

      const url = `${searchBase}&page=${p + 1}`;
      logger.info(`  Page ${p + 1}/${pages} — collected ${leads.length}/${limit}`);

      try {
        await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await sleep(rand(2000, 4000));

        // Scroll to load all results
        await this._scrollPage();

        const results = await this._extractSearchResults();
        if (!results.length) { logger.warn(`No results on page ${p + 1}, stopping`); break; }

        for (const r of results) {
          if (leads.length >= limit) break;
          leads.push(r);
        }

        await sleep(rand(...SEARCH_PAUSE));

      } catch (err) {
        logger.error(`LinkedIn page ${p + 1} error: ${err.message}`);
        if (err.message.includes('rate')) { await sleep(30000); }
      }
    }

    await this._close();
    logger.info(`LinkedIn scrape complete: ${leads.length} leads`);
    return leads.slice(0, limit);
  }

  async _extractSearchResults() {
    return this.page.$$eval('li.reusable-search__result-container', (nodes) => {
      return nodes.map(node => {
        const nameEl   = node.querySelector('.entity-result__title-text a span[aria-hidden="true"]');
        const titleEl  = node.querySelector('.entity-result__primary-subtitle');
        const compEl   = node.querySelector('.entity-result__secondary-subtitle');
        const locEl    = node.querySelector('.entity-result__tertiary-subtitle');
        const linkEl   = node.querySelector('.app-aware-link');

        const fullName   = nameEl?.innerText?.trim() || '';
        const title      = titleEl?.innerText?.trim() || '';
        const company    = compEl?.innerText?.trim() || '';
        const location   = locEl?.innerText?.trim() || '';
        const linkedinUrl = linkEl?.href?.split('?')[0] || '';

        if (!fullName) return null;
        return { full_name: fullName, title, company, linkedin_url: linkedinUrl, location };
      }).filter(Boolean);
    });
  }

  async _scrollPage() {
    await this.page.evaluate(async () => {
      for (let i = 0; i < 5; i++) {
        window.scrollBy(0, 400);
        await new Promise(r => setTimeout(r, 300));
      }
    });
    await sleep(1000);
  }

  async _close() {
    if (this.browser) { await this.browser.close(); this.browser = null; }
  }

  cancel() { this._cancelled = true; }
}

// ── Google SERP fallback (no LinkedIn login needed) ────────
class LinkedInSerpAgent {
  constructor() {}

  async search(category, location, limit) {
    const axios   = require('axios');
    const leads   = [];
    const perPage = 10;
    const pages   = Math.ceil(Math.min(limit, 100) / perPage);

    const serpKey = process.env.SERPAPI_KEY;
    if (!serpKey) throw new Error('SERPAPI_KEY not set — needed for SERP-based LinkedIn scraping');

    for (let p = 0; p < pages && leads.length < limit; p++) {
      try {
        const res = await axios.get('https://serpapi.com/search', {
          params: {
            engine: 'google',
            q: `site:linkedin.com/in "${category}" "${location}"`,
            api_key: serpKey,
            num: 10,
            start: p * 10,
          },
          timeout: 15000
        });

        const items = res.data.organic_results || [];
        for (const item of items) {
          if (leads.length >= limit) break;
          const parsed = this._parseSnippet(item);
          if (parsed) leads.push(parsed);
        }

        await new Promise(r => setTimeout(r, 2000));
      } catch (err) {
        logger.error(`SERP page ${p} error: ${err.message}`);
        break;
      }
    }

    logger.info(`SERP LinkedIn scrape: ${leads.length} leads`);
    return leads;
  }

  _parseSnippet(item) {
    const url   = item.link || '';
    if (!url.includes('linkedin.com/in/')) return null;

    const title = item.title || '';
    const snip  = item.snippet || '';

    // "John Smith - CEO - ACME Corp | LinkedIn"
    const parts    = title.split(' - ').map(s => s.replace(/\|.*$/, '').trim());
    const fullName = parts[0] || '';
    const roleComp = parts.slice(1).filter(s => !s.toLowerCase().includes('linkedin'));

    return {
      full_name:    fullName,
      title:        roleComp[0] || '',
      company:      roleComp[1] || '',
      linkedin_url: url.split('?')[0],
      location:     this._extractLocation(snip),
    };
  }

  _extractLocation(text) {
    const m = text.match(/(?:Greater|San|Los|New|North|South)[\w\s,]+(?:Area|CA|NY|TX|FL)/i);
    return m ? m[0].trim() : '';
  }
}

module.exports = LinkedInAgent;
module.exports.LinkedInSerpAgent = LinkedInSerpAgent;
