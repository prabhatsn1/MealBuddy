import { BestChoice, Confidence, DecisionMode, MealTime, RestaurantResult, ScoredResult, UserPreferences, Warning } from '@/types/meal';

interface ModeConfig {
  priceWeight: number;
  timeWeight: number;
  ratingWeight: number;
  explanationTemplate: (winner: RestaurantResult, runner: RestaurantResult | null) => string;
}

/** Builds a human-readable list of advantages the winner has over the runner-up. */
function buildDeltaPhrase(winner: RestaurantResult, runner: RestaurantResult): string {
  const parts: string[] = [];

  const priceDiff = runner.price - winner.price;
  if (priceDiff > 0) parts.push(`₹${priceDiff} sasta`);

  const timeDiff = runner.deliveryMinutes - winner.deliveryMinutes;
  if (timeDiff > 0) parts.push(`${timeDiff} min faster`);

  const ratingDiff = parseFloat((winner.rating - runner.rating).toFixed(1));
  if (ratingDiff > 0) parts.push(`${ratingDiff}⭐ zyada rating`);

  if (parts.length === 0) return '';
  return `${parts.join(' & ')} than ${runner.platform}`;
}

const MODE_CONFIG: Record<DecisionMode, ModeConfig> = {
  cheapest: {
    priceWeight: 1,
    timeWeight: 0,
    ratingWeight: 0,
    explanationTemplate: (w, runner) => {
      if (runner) {
        const diff = runner.price - w.price;
        if (diff > 0) {
          return `₹${diff} sasta hai ${w.platform} — ${runner.platform} se kam price mein milega! Wallet khush, dost khush! 💰`;
        }
      }
      return `Sabse sasta option hai yaar! ₹${w.price} mein ${w.platform} pe milega — wallet ko khushi hogi! 💰`;
    },
  },
  fastest: {
    priceWeight: 0,
    timeWeight: 1,
    ratingWeight: 0,
    explanationTemplate: (w, runner) => {
      if (runner) {
        const diff = runner.deliveryMinutes - w.deliveryMinutes;
        if (diff > 0) {
          return `${diff} min faster than ${runner.platform} — sirf ${w.deliveryMinutes} min mein garam garam pahunchega! ⚡`;
        }
      }
      return `Sirf ${w.deliveryMinutes} min mein garam garam pahunchega! ${w.platform} ka fastest delivery hai. ⚡`;
    },
  },
  bestRated: {
    priceWeight: 0,
    timeWeight: 0,
    ratingWeight: 1,
    explanationTemplate: (w, runner) => {
      if (runner) {
        const diff = parseFloat((w.rating - runner.rating).toFixed(1));
        if (diff > 0) {
          return `${diff}⭐ zyada rating than ${runner.platform} — ${w.rating}⭐ ke saath log kehte hain yahi best hai! ✅`;
        }
      }
      return `${w.rating}⭐ rating ke saath log kehte hain yahi best hai — tried and tested! ✅`;
    },
  },
  balanced: {
    priceWeight: 0.4,
    timeWeight: 0.3,
    ratingWeight: 0.3,
    explanationTemplate: (w, runner) => {
      if (runner) {
        const delta = buildDeltaPhrase(w, runner);
        if (delta) {
          return `${delta} — ${w.platform} pe ₹${w.price} mein ${w.deliveryMinutes} min delivery aur ${w.rating}⭐ rating. Best deal, dost! 🤝`;
        }
      }
      return `Price, time, aur taste — teen cheezein sahi! ${w.platform} pe ₹${w.price} mein ${w.deliveryMinutes} min delivery aur ${w.rating}⭐ rating. Best deal, dost! 🤝`;
    },
  },
};

/**
 * Normalizes a value to 0–1 where 1 is the best.
 * For price and time, lower is better (invert). For rating, higher is better.
 */
function normalize(
  value: number,
  min: number,
  max: number,
  higherIsBetter: boolean,
): number {
  if (max === min) return 1;
  const normalized = (value - min) / (max - min);
  return higherIsBetter ? normalized : 1 - normalized;
}

// ── Time-of-day helpers ───────────────────────────────────────────────────────

export function getMealTime(hour: number = new Date().getHours()): MealTime {
  if (hour >= 6 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 16 && hour < 22) return 'dinner';
  if (hour >= 22 || hour < 6) return 'latenight';
  return 'anytime';
}

export const MEAL_TIME_LABELS: Record<MealTime, string> = {
  breakfast: '☀️ Breakfast time',
  lunch: '🍽️ Lunch time',
  dinner: '🌙 Dinner time',
  latenight: '🌚 Late-night craving',
  anytime: '🍴 Meal time',
};

/**
 * Returns time-based weight adjustments for the balanced mode.
 * Lunch → faster delivery matters more.
 * Dinner → rating matters more (leisurely).
 * Late night → fastest delivery is king.
 */
function getTimeWeightAdjustment(mealTime: MealTime): { price: number; time: number; rating: number } {
  switch (mealTime) {
    case 'breakfast': return { price: 0.1, time: 0.1, rating: -0.1 };
    case 'lunch':     return { price: 0,   time: 0.15, rating: -0.05 };
    case 'dinner':    return { price: -0.05, time: -0.1, rating: 0.15 };
    case 'latenight': return { price: 0,   time: 0.25, rating: -0.1 };
    default:          return { price: 0,   time: 0,    rating: 0 };
  }
}

// ── Confidence calculation (smarter multi-dimensional) ────────────────────────

/**
 * Counts how many of {price, time, rating} the winner leads on vs the runner-up.
 * A "lead" means the winner is strictly better on that dimension.
 */
function dimensionDominance(winner: RestaurantResult, runner: RestaurantResult): number {
  let count = 0;
  if (winner.price < runner.price) count++;
  if (winner.deliveryMinutes < runner.deliveryMinutes) count++;
  if (winner.rating > runner.rating) count++;
  return count;
}

function computeConfidence(scored: ScoredResult[]): Confidence {
  if (scored.length < 2) return 'high';

  const gap = scored[0].score - scored[1].score;
  const dominance = dimensionDominance(scored[0], scored[1]);

  // High: clear score gap OR dominates on all 3 dimensions
  if (gap >= 0.18 || dominance === 3) return 'high';
  // Low: tiny gap AND only leads on one or zero dimensions
  if (gap < 0.08 && dominance <= 1) return 'low';
  return 'medium';
}

// ── Trade-off explanation ─────────────────────────────────────────────────────

/**
 * Produces a single trade-off sentence describing what the winner gives up
 * vs what it gains. Returns null when the winner dominates on all fronts.
 */
function computeTradeOff(winner: RestaurantResult, runner: RestaurantResult | null): string | null {
  if (!runner) return null;

  const cheaper   = winner.price          <  runner.price;
  const faster    = winner.deliveryMinutes < runner.deliveryMinutes;
  const betterRated = winner.rating       >  runner.rating;

  const priceDiff  = Math.abs(runner.price - winner.price);
  const timeDiff   = Math.abs(runner.deliveryMinutes - winner.deliveryMinutes);
  const ratingDiff = parseFloat(Math.abs(winner.rating - runner.rating).toFixed(1));

  // Helper: magnitude words
  function magnitude(val: number, unit: 'price' | 'time' | 'rating'): string {
    if (unit === 'price')  return val >= 100 ? 'much cheaper'     : val >= 40 ? 'cheaper'          : 'slightly cheaper';
    if (unit === 'time')   return val >= 15  ? 'much faster'      : val >= 7  ? 'faster'            : 'slightly faster';
    return                        val >= 0.4 ? 'much better rated': val >= 0.2 ? 'better rated'     : 'slightly better rated';
  }

  // Dominates everything — no trade-off to show
  if (cheaper && faster && betterRated) return null;

  // Winner is slower but better on other fronts
  if (!faster && timeDiff >= 5) {
    const gain = cheaper
      ? `${magnitude(priceDiff, 'price')} (₹${priceDiff} less)`
      : betterRated
        ? `${magnitude(ratingDiff, 'rating')} (${ratingDiff}⭐)`
        : null;
    if (gain) {
      const slow = timeDiff >= 10 ? 'notably slower' : 'slightly slower';
      return `${slow.charAt(0).toUpperCase() + slow.slice(1)}, but ${gain} than ${runner.platform}`;
    }
  }

  // Winner costs more but saves time / has higher rating
  if (!cheaper && priceDiff >= 30) {
    const gain = faster
      ? `${magnitude(timeDiff, 'time')} (${timeDiff} min)`
      : betterRated
        ? `${magnitude(ratingDiff, 'rating')} (${ratingDiff}⭐)`
        : null;
    if (gain) {
      const cost = priceDiff >= 80 ? 'pricier' : 'slightly pricier';
      return `${cost.charAt(0).toUpperCase() + cost.slice(1)} by ₹${priceDiff}, but ${gain} than ${runner.platform}`;
    }
  }

  // Winner has lower rating but is cheap/fast enough to win
  if (!betterRated && ratingDiff >= 0.2) {
    const gain = cheaper
      ? `saves ₹${priceDiff}`
      : faster
        ? `${timeDiff} min faster`
        : null;
    if (gain) {
      return `Lower rated (${winner.rating}⭐ vs ${runner.rating}⭐), but ${gain} than ${runner.platform}`;
    }
  }

  return null;
}

// ── Smart warnings ────────────────────────────────────────────────────────────

function computeWarnings(winner: RestaurantResult, allResults: RestaurantResult[]): Warning[] {
  const warnings: Warning[] = [];

  // Price-surge warning: winner costs >35% more than the median price
  if (allResults.length >= 3) {
    const sorted = [...allResults].map((r) => r.price).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    if (winner.price > median * 1.35 && winner.price > 250) {
      const pct = Math.round(((winner.price - median) / median) * 100);
      warnings.push({
        type: 'price_surge',
        icon: '📈',
        message: `Price is ${pct}% above the median (₹${median}) — check if there's a surge`,
      });
    }
  }

  // Low rating warning: winner rated below 3.8
  if (winner.rating < 3.8) {
    warnings.push({
      type: 'low_rating',
      icon: '⚠️',
      message: `Only ${winner.rating}⭐ — lower than usual. Quality may be inconsistent`,
    });
  }

  // Slow delivery warning: winner takes more than 50 min
  if (winner.deliveryMinutes > 50) {
    warnings.push({
      type: 'slow_delivery',
      icon: '🐢',
      message: `${winner.deliveryMinutes} min delivery — longer than average. Plan ahead!`,
    });
  }

  return warnings;
}

export function getBestChoice(
  results: RestaurantResult[],
  mode: DecisionMode,
  preferences?: Pick<UserPreferences, 'maxPrice' | 'minRating'>,
  favouriteCuisines?: string[],
): BestChoice {
  if (results.length === 0) {
    throw new Error('No results to rank');
  }

  // Apply preference filters before ranking
  let filtered = results;
  if (preferences) {
    if (preferences.maxPrice > 0) {
      filtered = filtered.filter((r) => r.price <= preferences.maxPrice);
    }
    if (preferences.minRating > 0) {
      filtered = filtered.filter((r) => r.rating >= preferences.minRating);
    }
  }
  // Fall back to all results if filters are too strict
  if (filtered.length === 0) {
    filtered = results;
  }

  const config = MODE_CONFIG[mode];
  const mealTime = getMealTime();
  const timeAdj = mode === 'balanced' ? getTimeWeightAdjustment(mealTime) : { price: 0, time: 0, rating: 0 };

  // Compute ranges for normalization
  const prices = filtered.map((r) => r.price);
  const times = filtered.map((r) => r.deliveryMinutes);
  const ratings = filtered.map((r) => r.rating);

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const minRating = Math.min(...ratings);
  const maxRating = Math.max(...ratings);

  const scored: ScoredResult[] = filtered.map((r) => {
    const priceScore = normalize(r.price, minPrice, maxPrice, false);
    const timeScore = normalize(r.deliveryMinutes, minTime, maxTime, false);
    const ratingScore = normalize(r.rating, minRating, maxRating, true);

    // Cuisine affinity bonus: +0.06 per match (up to one match), applied as an
    // additive nudge so it can tip equal scores toward a known favourite cuisine.
    const cuisineBonus =
      favouriteCuisines && favouriteCuisines.length > 0 &&
      favouriteCuisines.includes(r.cuisine.toLowerCase())
        ? 0.06
        : 0;

    const score =
      Math.max(0, config.priceWeight + timeAdj.price) * priceScore +
      Math.max(0, config.timeWeight + timeAdj.time) * timeScore +
      Math.max(0, config.ratingWeight + timeAdj.rating) * ratingScore +
      cuisineBonus;

    return { ...r, score };
  });

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  const winner = scored[0];
  const runner = scored.length > 1 ? scored[1] : null;
  const explanation = config.explanationTemplate(winner, runner);
  const confidence = computeConfidence(scored);
  const tradeOff = computeTradeOff(winner, runner);
  const warnings = computeWarnings(winner, filtered);

  return { winner, explanation, rankedResults: scored, confidence, mealTime, tradeOff, warnings };
}

export const DECISION_MODE_LABELS: Record<DecisionMode, string> = {
  cheapest: 'Sabse Sasta 💰',
  fastest: 'Sabse Fast ⚡',
  bestRated: 'Sabse Best ⭐',
  balanced: 'Best Deal 🤝',
};
