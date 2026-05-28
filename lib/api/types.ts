// ─────────────────────────────────────────────────────────────────────────────
// Raw API response shapes for each platform.
// These mirror the actual JSON returned by the endpoints so adapters can map
// them to the shared RestaurantResult type.
// ─────────────────────────────────────────────────────────────────────────────

// ── Zomato (via RapidAPI: zomato-api2.p.rapidapi.com) ────────────────────────
export interface ZomatoRestaurantRaw {
  restaurant: {
    id: string;
    name: string;
    cuisines: string;
    average_cost_for_two: number;
    has_online_delivery: number;
    delivery_time_estimate?: number; // minutes; not always present
    user_rating: {
      aggregate_rating: string; // e.g. "4.2"
    };
    location: {
      locality_verbose: string;
      distance?: string; // e.g. "2.3"
    };
    offers?: Array<{ offer_description: string }>;
  };
}

export interface ZomatoSearchResponse {
  results_found: number;
  restaurants: ZomatoRestaurantRaw[];
}

// ── Swiggy (unofficial dapi: swiggy.com/dapi/restaurants/search/v3) ──────────
// Swiggy returns a deeply nested protobuf-style JSON.
// We only care about Dish cards (type = swiggy.presentation.food.v2.Dish).

export interface SwiggyRestaurantInfo {
  id: string;
  name: string;
  avgRating?: string; // e.g. "4.3"
  costForTwoMessage?: string; // e.g. "₹300 for two"
  sla?: {
    deliveryTime?: number; // minutes
    lastMileTravel?: number; // km
  };
  aggregatedDiscountInfoV3?: {
    header?: string; // e.g. "40% off"
    subHeader?: string;
  };
}

export interface SwiggyDishInfo {
  id: string;
  name: string;
  price?: number; // paise; may be absent if only finalPrice is present
  finalPrice?: number; // paise after discount
  ratings?: {
    aggregatedRating?: {
      rating?: string; // e.g. "4.1"
    };
  };
}

export interface SwiggyDishCard {
  '@type': 'type.googleapis.com/swiggy.presentation.food.v2.Dish';
  info: SwiggyDishInfo;
  restaurant?: {
    info: SwiggyRestaurantInfo;
  };
}

export interface SwiggyGenericCard {
  '@type': string;
}

export type SwiggyInnerCard = SwiggyDishCard | SwiggyGenericCard;

export interface SwiggyCardWrapper {
  card: {
    card: SwiggyInnerCard;
  };
}

export interface SwiggySearchResponse {
  statusCode: number;
  data: {
    statusMessage: string;
    totalElements: number;
    cards: SwiggyCardWrapper[];
  };
}

// ── Uber Eats (via RapidAPI: uber-eats-data.p.rapidapi.com) ──────────────────
export interface UberEatsFeedItem {
  type: string; // "store" | "carousel" | …
  uuid: string;
  title: string;
  etaRange?: {
    rangeMinutes?: { min: number; max: number };
    text?: string; // e.g. "20–30 min"
  };
  rawRating?: {
    ratingValue: number; // e.g. 4.3
  };
  moneyHeader?: {
    displayPrice?: string; // e.g. "$0–$4.99 delivery"
  };
  categories?: string[];
  promotions?: Array<{ text: string }>;
}

export interface UberEatsSearchResponse {
  status: string; // "success" | "error"
  data?: {
    feedItems: UberEatsFeedItem[];
  };
  // Some RapidAPI wrappers return feedItems at the top level
  feedItems?: UberEatsFeedItem[];
}
