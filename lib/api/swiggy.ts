/**
 * Swiggy service — uses Swiggy's internal dapi endpoint.
 *
 * ⚠️  This is an unofficial endpoint (no published API contract).
 *     It works in React Native (no CORS restrictions on mobile) but may break
 *     if Swiggy changes their internal API.
 *     Use for learning / demo purposes only.
 *
 * Returns [] on any failure so the aggregator falls back to mock data.
 */

import { RestaurantResult } from '@/types/meal';
import { SwiggyCardWrapper, SwiggyDishCard, SwiggySearchResponse } from './types';

const SWIGGY_SEARCH_URL = 'https://www.swiggy.com/dapi/restaurants/search/v3';
const DISH_TYPE = 'type.googleapis.com/swiggy.presentation.food.v2.Dish';

/** Simple UUID v4 generator (no external lib needed). */
function uuid4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function isDishCard(card: SwiggyCardWrapper): card is { card: { card: SwiggyDishCard } } {
  return card?.card?.card?.['@type'] === DISH_TYPE;
}

function mapDishCard(card: SwiggyCardWrapper, query: string, index: number): RestaurantResult | null {
  if (!isDishCard(card)) return null;

  const dish = card.card.card.info;
  const resto = card.card.card.restaurant?.info;

  // Prices are in paise — divide by 100
  const finalPricePaise = dish.finalPrice ?? dish.price ?? 0;
  const originalPricePaise = dish.price ?? finalPricePaise;

  if (finalPricePaise === 0) return null;

  const price = Math.round(finalPricePaise / 100);
  const originalPrice = Math.round(originalPricePaise / 100);
  const rating = parseFloat(
    dish.ratings?.aggregatedRating?.rating ?? resto?.avgRating ?? '0',
  );

  const deliveryMinutes = resto?.sla?.deliveryTime ?? 25 + (index % 4) * 5;
  const distanceKm = resto?.sla?.lastMileTravel;
  const distance = distanceKm ? `${distanceKm.toFixed(1)} km` : `${(0.5 + index * 0.4).toFixed(1)} km`;

  const discountHeader = resto?.aggregatedDiscountInfoV3?.header;
  const offer = discountHeader
    ? `${discountHeader}${resto?.aggregatedDiscountInfoV3?.subHeader ? ' ' + resto.aggregatedDiscountInfoV3.subHeader : ''}`
    : null;

  return {
    id: `swiggy-${dish.id}-${index}`,
    name: resto?.name ?? dish.name,
    platform: 'Swiggy',
    cuisine: query.toLowerCase(),
    price,
    originalPrice,
    rating,
    deliveryMinutes,
    distance,
    offer,
  };
}

/**
 * Search Swiggy for food items near the given coordinates.
 * Returns an empty array on any failure.
 */
export async function searchSwiggy(
  query: string,
  lat: number,
  lng: number,
): Promise<RestaurantResult[]> {
  const url =
    `${SWIGGY_SEARCH_URL}` +
    `?lat=${lat}&lng=${lng}` +
    `&str=${encodeURIComponent(query)}` +
    `&trackingId=undefined&submitAction=ENTER&queryUniqueId=${uuid4()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) return [];

  const data: SwiggySearchResponse = await response.json();

  if (!data?.data?.cards) return [];

  const results: RestaurantResult[] = [];
  data.data.cards.forEach((card, index) => {
    const mapped = mapDishCard(card, query, index);
    if (mapped) results.push(mapped);
  });

  return results.slice(0, 10);
}
