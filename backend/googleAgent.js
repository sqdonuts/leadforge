// ============================================================
// agents/googleAgent.js — Google Business / Maps data
// ============================================================
const axios   = require('axios');
const { chromium } = require('playwright');
const { logger }   = require('../utils/logger');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const rand  = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

class GoogleAgent {
  constructor() {
    this.serpKey        = process.env.SERPAPI_KEY;
    this.googlePlacesKey = process.env.GOOGLE_PLACES_KEY;
  }

  async scrape(companyName, location) {
    if (!companyName) return {};

    // ── Try Google Places API first (most reliable) ───────
    if (this.googlePlacesKey) {
      try {
        const data = await this._placesApi(companyName, location);
        if (data?.google_rating) return data;
      } catch (e) { logger.warn(`Places API error: ${e.message}`); }
    }

    // ── Fallback: SerpAPI Google Maps ─────────────────────
    if (this.serpKey) {
      try {
        const data = await this._serpMaps(companyName, location);
        if (data?.google_rating) return data;
      } catch (e) { logger.warn(`SerpAPI Maps error: ${e.message}`); }
    }

    // ── Fallback: headless browser scrape ─────────────────
    try {
      return await this._playwrightScrape(companyName, location);
    } catch (e) {
      logger.warn(`Playwright Google scrape failed: ${e.message}`);
      return {};
    }
  }

  // ── Google Places API ─────────────────────────────────
  async _placesApi(name, location) {
    const query = `${name} ${location}`;

    // 1. Find place
    const findRes = await axios.get('https://maps.googleapis.com/maps/api/place/findplacefromtext/json', {
      params: {
        input: query,
        inputtype: 'textquery',
        fields: 'place_id,name,formatted_address,rating,user_ratings_total,formatted_phone_number',
        key: this.googlePlacesKey,
      },
      timeout: 8000
    });

    const candidate = findRes.data?.candidates?.[0];
    if (!candidate) return {};

    // 2. Get details
    const detRes = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
      params: {
        place_id: candidate.place_id,
        fields: 'name,rating,user_ratings_total,formatted_address,formatted_phone_number,website,price_level',
        key: this.googlePlacesKey,
      },
      timeout: 8000
    });

    const d = detRes.data?.result || {};
    return {
      google_rating:    d.rating            || null,
      review_count:     d.user_ratings_total || 0,
      google_address:   d.formatted_address  || '',
      google_phone:     d.formatted_phone_number || '',
      google_place_id:  candidate.place_id,
      company_website:  d.website            || '',
    };
  }

  // ── SerpAPI Google Maps ───────────────────────────────
  async _serpMaps(name, location) {
    const res = await axios.get('https://serpapi.com/search', {
      params: {
        engine: 'google_maps',
        q: `${name} ${location}`,
        api_key: this.serpKey,
      },
      timeout: 12000
    });

    const place = res.data?.local_results?.[0];
    if (!place) return {};

    return {
      google_rating:  place.rating         || null,
      review_count:   place.reviews        || 0,
      google_address: place.address        || '',
      google_phone:   place.phone          || '',
    };
  }

  // ── Playwright headless scrape ────────────────────────
  async _playwrightScrape(name, location) {
    let browser;
    try {
      browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
      const page = await browser.newPage();

      const query = encodeURIComponent(`${name} ${location}`);
      await page.goto(`https://www.google.com/search?q=${query}&tbm=lcl`, {
        waitUntil: 'domcontentloaded', timeout: 20000
      });

      await sleep(rand(1500, 3000));

      const data = await page.evaluate(() => {
        const ratingEl = document.querySelector('.Aq14fc, [data-dtype="d3fn"]');
        const reviewEl = document.querySelector('.RDApEe');
        const addrEl   = document.querySelector('.LrzXr');
        const phoneEl  = document.querySelector('[data-dtype="d3ph"] span');

        const ratingText = ratingEl?.textContent?.trim() || '';
        const reviewText = reviewEl?.textContent?.replace(/[^\d]/g, '') || '';
        const address    = addrEl?.textContent?.trim() || '';
        const phone      = phoneEl?.textContent?.trim() || '';

        return {
          google_rating: ratingText ? parseFloat(ratingText) : null,
          review_count:  reviewText ? parseInt(reviewText)   : 0,
          google_address: address,
          google_phone:   phone,
        };
      });

      return data;
    } finally {
      if (browser) await browser.close();
    }
  }
}

module.exports = GoogleAgent;
