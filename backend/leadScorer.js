// ============================================================
// agents/leadScorer.js — Lead scoring + revenue loss calc
// ============================================================

// Industry-specific average ratings and revenue multipliers
const INDUSTRY_BENCHMARKS = {
  restaurant:   { avgRating: 4.5, revenueMultiplier: 0.10, annualRevenueEst: 900_000  },
  dental:       { avgRating: 4.7, revenueMultiplier: 0.09, annualRevenueEst: 1_200_000 },
  medical:      { avgRating: 4.6, revenueMultiplier: 0.09, annualRevenueEst: 2_000_000 },
  law:          { avgRating: 4.6, revenueMultiplier: 0.08, annualRevenueEst: 1_500_000 },
  real_estate:  { avgRating: 4.7, revenueMultiplier: 0.07, annualRevenueEst: 3_000_000 },
  retail:       { avgRating: 4.4, revenueMultiplier: 0.10, annualRevenueEst: 600_000  },
  salon:        { avgRating: 4.6, revenueMultiplier: 0.11, annualRevenueEst: 300_000  },
  fitness:      { avgRating: 4.5, revenueMultiplier: 0.09, annualRevenueEst: 500_000  },
  hotel:        { avgRating: 4.3, revenueMultiplier: 0.12, annualRevenueEst: 5_000_000 },
  auto:         { avgRating: 4.4, revenueMultiplier: 0.08, annualRevenueEst: 2_500_000 },
  default:      { avgRating: 4.7, revenueMultiplier: 0.08, annualRevenueEst: 1_000_000 },
};

function detectIndustryKey(industry = '', category = '') {
  const text = (industry + ' ' + category).toLowerCase();
  if (text.match(/restaurant|food|cafe|bar|diner|pizza|sushi/)) return 'restaurant';
  if (text.match(/dent|orthodon/))  return 'dental';
  if (text.match(/doctor|medic|health|clinic|hospital/)) return 'medical';
  if (text.match(/law|attorney|legal|lawyer/)) return 'law';
  if (text.match(/real estate|realtor|property/)) return 'real_estate';
  if (text.match(/retail|shop|store|boutique/)) return 'retail';
  if (text.match(/salon|spa|beauty|nail|hair/)) return 'salon';
  if (text.match(/gym|fitness|yoga|pilates/)) return 'fitness';
  if (text.match(/hotel|motel|resort|inn/)) return 'hotel';
  if (text.match(/auto|car|vehicle|mechanic/)) return 'auto';
  return 'default';
}

/**
 * Revenue Loss Formula:
 *   ratingGap = industryAvg - businessRating
 *   lossPct   = ratingGap × multiplier × 100
 *   lossEst   = annualRevenue × (lossPct / 100)
 *
 * Logic: for each 0.1 drop below industry avg, businesses lose
 * ~0.8–1.2% of revenue due to lost conversions + customer trust.
 */
function calcRevenueLoss(rating, industryKey) {
  const bench     = INDUSTRY_BENCHMARKS[industryKey] || INDUSTRY_BENCHMARKS.default;
  const { avgRating, revenueMultiplier, annualRevenueEst } = bench;

  if (!rating || rating >= avgRating) {
    return { revenue_loss_pct: 0, revenue_loss_est: '$0', industry_avg_rating: avgRating };
  }

  const gap     = Math.max(0, avgRating - rating);
  const lossPct = Math.min(gap * revenueMultiplier * 100, 50); // cap at 50%
  const lossAmt = Math.round((lossPct / 100) * annualRevenueEst);

  return {
    revenue_loss_pct:    Math.round(lossPct * 10) / 10,
    revenue_loss_est:    formatCurrency(lossAmt),
    industry_avg_rating: avgRating,
  };
}

/**
 * Lead scoring matrix:
 *   - Hot:  rating < 4.0 AND reviews > 20  → highest pain, active customer base
 *   - Warm: rating < 4.5 OR reviews > 50   → moderate opportunity
 *   - Cold: everything else
 */
function scoreLeads(lead, searchCategory = '') {
  const rating   = parseFloat(lead.google_rating)  || 0;
  const reviews  = parseInt(lead.review_count)      || 0;
  const hasEmail = !!(lead.email_professional || lead.email_generic);

  const industryKey  = detectIndustryKey(lead.industry, searchCategory);
  const revenueLoss  = calcRevenueLoss(rating, industryKey);

  let scoreValue = 0;
  let lead_score = 'cold';

  // Rating score (0-40 pts)
  if (rating > 0) {
    if      (rating < 3.5) scoreValue += 40;
    else if (rating < 4.0) scoreValue += 32;
    else if (rating < 4.3) scoreValue += 24;
    else if (rating < 4.5) scoreValue += 16;
    else if (rating < 4.7) scoreValue += 8;
  }

  // Review volume score (0-30 pts) — more reviews = bigger audience affected
  if      (reviews > 500) scoreValue += 30;
  else if (reviews > 200) scoreValue += 24;
  else if (reviews > 100) scoreValue += 18;
  else if (reviews > 50)  scoreValue += 12;
  else if (reviews > 20)  scoreValue += 6;

  // Email found (0-20 pts)
  if (hasEmail) scoreValue += 20;

  // Revenue loss magnitude (0-10 pts)
  if      (revenueLoss.revenue_loss_pct >= 20) scoreValue += 10;
  else if (revenueLoss.revenue_loss_pct >= 10) scoreValue += 6;
  else if (revenueLoss.revenue_loss_pct >= 5)  scoreValue += 3;

  // Classify
  if      (scoreValue >= 70) lead_score = 'hot';
  else if (scoreValue >= 40) lead_score = 'warm';
  else                       lead_score = 'cold';

  return {
    lead_score,
    score_value: scoreValue,
    ...revenueLoss,
  };
}

function formatCurrency(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

module.exports = { scoreLeads, calcRevenueLoss, detectIndustryKey, INDUSTRY_BENCHMARKS };
