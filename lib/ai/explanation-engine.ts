/**
 * AI Explanation Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates more natural, contextual explanations for MealBuddy recommendations
 * using OpenAI's chat completions API (gpt-4o-mini).
 *
 * Architecture:
 *   - Decisions are still entirely rule-based (score ranking in recommendation-engine.ts)
 *   - This module only generates the human-readable *explanation text*
 *   - Falls back gracefully to the rule-based template string when:
 *       • EXPO_PUBLIC_OPENAI_API_KEY is not set
 *       • The API call fails or times out
 *       • The response doesn't contain usable text
 *
 * ⚠️  Security note: Calling OpenAI directly from the client exposes the API key
 *    in the app bundle. Suitable for development / demo; for production use a
 *    backend proxy (e.g. an Edge Function) instead.
 */

import { DecisionMode, MealTime, RestaurantResult } from '@/types/meal';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';
const MAX_TOKENS = 90;
const TIMEOUT_MS = 5000;

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildUserPrompt(
  winner: RestaurantResult,
  runner: RestaurantResult | null,
  mode: DecisionMode,
  mealTime: MealTime,
): string {
  const modeMap: Record<DecisionMode, string> = {
    cheapest: 'lowest price',
    fastest: 'fastest delivery',
    bestRated: 'highest rating',
    balanced: 'best overall balance of price, speed and rating',
  };

  const mealCtx: Record<MealTime, string> = {
    breakfast: 'morning breakfast',
    lunch: 'afternoon lunch',
    dinner: 'evening dinner',
    latenight: 'late-night snack',
    anytime: 'a meal',
  };

  let prompt = `Recommend ${winner.name} on ${winner.platform} for ${mealCtx[mealTime]}.
Price: ₹${winner.price}, delivery: ${winner.deliveryMinutes} min, rating: ${winner.rating}⭐.
Optimisation goal: ${modeMap[mode]}.`;

  if (runner) {
    const pDiff = runner.price - winner.price;
    const tDiff = runner.deliveryMinutes - winner.deliveryMinutes;
    const rDiff = parseFloat((winner.rating - runner.rating).toFixed(1));
    prompt += `\nRunner-up: ${runner.name} on ${runner.platform} — ₹${runner.price}, ${runner.deliveryMinutes} min, ${runner.rating}⭐.`;
    if (pDiff > 0) prompt += ` Winner saves ₹${pDiff}.`;
    if (tDiff > 0) prompt += ` Winner is ${tDiff} min faster.`;
    if (rDiff > 0) prompt += ` Winner has ${rDiff}⭐ higher rating.`;
  }

  return prompt;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Returns an AI-generated explanation if an API key is configured; otherwise
 * returns the rule-based fallback immediately.
 *
 * Always resolves (never rejects) — the fallback is used on any error.
 */
export async function generateAIExplanation(
  winner: RestaurantResult,
  runner: RestaurantResult | null,
  mode: DecisionMode,
  mealTime: MealTime,
  fallback: string,
): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) return fallback;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(OPENAI_API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: 0.75,
        messages: [
          {
            role: 'system',
            content:
              'You are MealBuddy, a friendly Indian food delivery assistant. ' +
              'Write exactly 1-2 sentences explaining why this restaurant is the best pick. ' +
              'Use casual Hinglish tone (mix of Hindi and English). ' +
              'Be specific with the numbers provided. Keep it warm and confident.',
          },
          {
            role: 'user',
            content: buildUserPrompt(winner, runner, mode, mealTime),
          },
        ],
      }),
    });

    if (!res.ok) return fallback;

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text || fallback;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}
