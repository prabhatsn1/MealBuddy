export type Platform = 'Swiggy' | 'Zomato' | 'Uber Eats';

export type DecisionMode = 'cheapest' | 'fastest' | 'bestRated' | 'balanced';

export type Confidence = 'high' | 'medium' | 'low';

export type MealTime = 'breakfast' | 'lunch' | 'dinner' | 'latenight' | 'anytime';

export interface UserPreferences {
  defaultMode: DecisionMode;
  maxPrice: number;           // 0 = no limit
  minRating: number;          // 0 = no limit (0–5 scale)
  minConfidenceToAct: Confidence; // minimum confidence to show the one-tap handoff button
  autoOrderThreshold: number; // 0 = off; auto-arm handoff when winner.price ≤ this value
  preferCOD: boolean;         // remind user to select Cash on Delivery when ordering
}

export interface RestaurantResult {
  id: string;
  name: string;
  platform: Platform;
  cuisine: string;
  price: number;
  originalPrice: number;
  rating: number;
  deliveryMinutes: number;
  distance: string;
  offer: string | null;
}

export interface BestChoice {
  winner: RestaurantResult;
  explanation: string;
  rankedResults: ScoredResult[];
  confidence: Confidence;
  mealTime: MealTime;
  tradeOff: string | null;
  warnings: Warning[];
}

export interface ScoredResult extends RestaurantResult {
  score: number;
}

// ── Warning ───────────────────────────────────────────────────────────────────

export interface Warning {
  type: 'price_surge' | 'low_rating' | 'slow_delivery';
  icon: string;
  message: string;
}

// ── History ──────────────────────────────────────────────────────────────────

export interface SearchHistoryEntry {
  query: string;
  timestamp: number;
}

export interface RecommendationHistoryEntry {
  query: string;
  winner: RestaurantResult;
  cuisine: string;             // cuisine tag of the chosen restaurant
  mode: DecisionMode;
  confidence: Confidence;
  explanation: string;   // why MealBuddy chose this option
  timestamp: number;
}
