/**
 * PlatformAuthProvider
 * ─────────────────────────────────────────────────────────────────────────────
 * How the session bridge works
 * ─────────────────────────────────────────────────────────────────────────────
 *  1. User taps "Connect" → PlatformLoginModal opens a full-screen WebView.
 *  2. The user logs in normally.  The OS (WKWebView / Android WebView) saves
 *     the session cookies in its shared default cookie jar.
 *  3. We detect login via URL pattern and persist an "isConnected" flag.
 *  4. This provider renders a hidden 1×1 WebView for every connected platform,
 *     pointed at that platform's domain.  Because the OS cookie jar is shared
 *     across all WebView instances, the hidden WebView is already authenticated.
 *  5. When searchViaWebView() is called we inject a fetch() script into the
 *     hidden WebView.  The fetch runs in the browser context (same-origin, full
 *     cookie access) and posts the JSON response back to React Native.
 *  6. We parse the response and return typed RestaurantResult[].
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';

import { PlatformLoginModal } from '@/components/auth/platform-login-modal';
import { getMockResults } from '@/data/mock-restaurants';
import { loadAuthState, markConnected, markDisconnected } from '@/lib/auth/session-store';
import {
    DEFAULT_AUTH_STATE,
    PLATFORM_CONFIGS,
    PlatformAuthState,
    PlatformKey,
    WebViewMessage,
} from '@/lib/auth/types';
import { RestaurantResult } from '@/types/meal';

// ── Search JS builders ────────────────────────────────────────────────────────

/** Builds the JS snippet to inject into the Swiggy WebView for a search. */
function buildSwiggySearchJS(requestId: string, query: string, lat: number, lng: number): string {
  const safeQuery = query.replace(/'/g, "\\'");
  return `
(async function() {
  const uuid = Math.random().toString(36).substr(2, 16);
  try {
    const resp = await fetch(
      '/dapi/restaurants/search/v3?lat=${lat}&lng=${lng}&str=${safeQuery}&trackingId=undefined&submitAction=ENTER&queryUniqueId=' + uuid,
      { headers: { 'Content-Type': 'application/json' } }
    );
    const data = await resp.json();
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'search_results', requestId: '${requestId}', data
    }));
  } catch(e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'search_error', requestId: '${requestId}', error: e.message
    }));
  }
  true;
})();
`;
}

/** Builds the JS snippet to inject into the Zomato WebView for a search. */
function buildZomatoSearchJS(requestId: string, query: string, lat: number, lng: number): string {
  const safeQuery = query.replace(/'/g, "\\'");
  return `
(async function() {
  try {
    const resp = await fetch(
      '/webroutes/search/autoSuggest?searchKeyword=${safeQuery}&latitude=${lat}&longitude=${lng}&entityType=&entityId=0&cityId=0',
      { headers: { 'Accept': 'application/json' } }
    );
    const data = await resp.json();
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'search_results', requestId: '${requestId}', data
    }));
  } catch(e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'search_error', requestId: '${requestId}', error: e.message
    }));
  }
  true;
})();
`;
}

/** Builds the JS snippet to inject into the Uber Eats WebView for a search. */
function buildUberEatsSearchJS(requestId: string, query: string, lat: number, lng: number): string {
  const safeQuery = query.replace(/'/g, "\\'");
  return `
(async function() {
  try {
    const resp = await fetch('/api/getSearchFeedV1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': 'x' },
      body: JSON.stringify({
        userQuery: '${safeQuery}',
        billboardUUID: '',
        carouselId: '',
        marketingFeedType: 'ALL',
        params: { lat: '${lat}', lng: '${lng}' }
      })
    });
    const data = await resp.json();
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'search_results', requestId: '${requestId}', data
    }));
  } catch(e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'search_error', requestId: '${requestId}', error: e.message
    }));
  }
  true;
})();
`;
}

function buildSearchJS(
  platform: PlatformKey,
  requestId: string,
  query: string,
  lat: number,
  lng: number,
): string {
  switch (platform) {
    case 'swiggy': return buildSwiggySearchJS(requestId, query, lat, lng);
    case 'zomato': return buildZomatoSearchJS(requestId, query, lat, lng);
    case 'ubereats': return buildUberEatsSearchJS(requestId, query, lat, lng);
  }
}

// ── Result parsers ────────────────────────────────────────────────────────────

function parseSwiggyResults(data: unknown, query: string): RestaurantResult[] {
  try {
    const d = data as { data?: { cards?: Array<{ card?: { card?: { '@type': string; info?: { id: string; name: string; price?: number; finalPrice?: number; ratings?: { aggregatedRating?: { rating?: string } }; restaurant?: { info?: { name?: string; avgRating?: string; sla?: { deliveryTime?: number; lastMileTravel?: number }; aggregatedDiscountInfoV3?: { header?: string } } } } } } }> } };
    const cards = d?.data?.cards ?? [];
    const results: RestaurantResult[] = [];
    cards.forEach((card, i) => {
      const inner = card?.card?.card;
      if (inner?.['@type'] !== 'type.googleapis.com/swiggy.presentation.food.v2.Dish') return;
      const info = inner.info;
      if (!info) return;
      const finalPricePaise = info.finalPrice ?? info.price ?? 0;
      if (finalPricePaise === 0) return;
      const price = Math.round(finalPricePaise / 100);
      const originalPrice = Math.round((info.price ?? finalPricePaise) / 100);
      const resto = info.restaurant?.info;
      results.push({
        id: `swiggy-live-${info.id}`,
        name: resto?.name ?? info.name,
        platform: 'Swiggy',
        cuisine: query.toLowerCase(),
        price,
        originalPrice,
        rating: parseFloat(info.ratings?.aggregatedRating?.rating ?? resto?.avgRating ?? '0'),
        deliveryMinutes: resto?.sla?.deliveryTime ?? 30 + (i % 4) * 5,
        distance: resto?.sla?.lastMileTravel ? `${resto.sla.lastMileTravel.toFixed(1)} km` : `${(0.5 + i * 0.4).toFixed(1)} km`,
        offer: resto?.aggregatedDiscountInfoV3?.header ?? null,
      });
    });
    return results.slice(0, 10);
  } catch {
    return [];
  }
}

function parseZomatoResults(data: unknown, query: string): RestaurantResult[] {
  // Zomato autoSuggest returns search suggestions; best-effort parse
  try {
    const d = data as { results?: Array<{ type?: string; data?: { name?: string; average_cost?: number; rating?: number; delivery_time?: number; distance?: string } }> };
    if (!d?.results) return [];
    return d.results
      .filter((r) => r.type === 'restaurant' && r.data)
      .slice(0, 10)
      .map((r, i) => ({
        id: `zomato-live-${i}`,
        name: r.data!.name ?? 'Restaurant',
        platform: 'Zomato',
        cuisine: query.toLowerCase(),
        price: r.data!.average_cost ?? 200 + i * 20,
        originalPrice: Math.round((r.data!.average_cost ?? 200 + i * 20) * 1.1),
        rating: r.data!.rating ?? 4.0,
        deliveryMinutes: r.data!.delivery_time ?? 30 + (i % 4) * 5,
        distance: r.data!.distance ?? `${(0.8 + i * 0.5).toFixed(1)} km`,
        offer: null,
      }));
  } catch {
    return [];
  }
}

function parseUberEatsResults(data: unknown, query: string): RestaurantResult[] {
  // Uber Eats feed format is complex; best-effort parse of store items
  try {
    const d = data as { data?: { feedItems?: Array<{ type?: string; uuid?: string; title?: string; etaRange?: { rangeMinutes?: { min: number; max: number } }; rawRating?: { ratingValue?: number }; promotions?: Array<{ text: string }> }> } };
    const items = d?.data?.feedItems ?? [];
    return items
      .filter((item) => item.type === 'store' && item.uuid)
      .slice(0, 10)
      .map((item, i) => {
        const eta = item.etaRange?.rangeMinutes;
        return {
          id: `ubereats-live-${item.uuid}`,
          name: item.title ?? 'Restaurant',
          platform: 'Uber Eats',
          cuisine: query.toLowerCase(),
          price: 150 + i * 20,
          originalPrice: Math.round((150 + i * 20) * 1.1),
          rating: item.rawRating?.ratingValue ?? 4.0,
          deliveryMinutes: eta ? Math.round((eta.min + eta.max) / 2) : 30 + (i % 4) * 5,
          distance: `${(0.8 + i * 0.5).toFixed(1)} km`,
          offer: item.promotions?.[0]?.text ?? null,
        };
      });
  } catch {
    return [];
  }
}

function parseWebViewResults(
  platform: PlatformKey,
  data: unknown,
  query: string,
): RestaurantResult[] {
  switch (platform) {
    case 'swiggy': return parseSwiggyResults(data, query);
    case 'zomato': return parseZomatoResults(data, query);
    case 'ubereats': return parseUberEatsResults(data, query);
  }
}

// ── Pending search state ──────────────────────────────────────────────────────

interface PendingSearch {
  requestId: string;
  query: string;
  lat: number;
  lng: number;
  resolve: (results: RestaurantResult[]) => void;
}

// ── Context definition ────────────────────────────────────────────────────────

interface PlatformAuthContextValue {
  authState: PlatformAuthState;
  /** Opens the login modal for a platform. Call from Preferences screen. */
  openLogin: (platform: PlatformKey) => void;
  /** Clears the connected state for a platform. */
  disconnect: (platform: PlatformKey) => Promise<void>;
  /**
   * Runs a food search inside the authenticated WebView for the given platform.
   * Falls back to mock data if:
   *  - The platform is not connected, OR
   *  - The WebView returns no usable results within the timeout.
   */
  searchViaWebView: (
    platform: PlatformKey,
    query: string,
    lat: number,
    lng: number,
  ) => Promise<RestaurantResult[]>;
  /** Which platform's login modal is currently visible, if any. */
  loginModalPlatform: PlatformKey | null;
  onLoginModalClose: () => void;
  onLoginSuccess: (platform: PlatformKey, username?: string) => void;
}

const PlatformAuthContext = createContext<PlatformAuthContextValue | null>(null);

export function usePlatformAuth(): PlatformAuthContextValue {
  const ctx = useContext(PlatformAuthContext);
  if (!ctx) throw new Error('usePlatformAuth must be used inside PlatformAuthProvider');
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function PlatformAuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<PlatformAuthState>(DEFAULT_AUTH_STATE);
  const [loginModalPlatform, setLoginModalPlatform] = useState<PlatformKey | null>(null);

  // One WebView ref per platform
  const webViewRefs: Record<PlatformKey, React.RefObject<WebView | null>> = {
    swiggy: useRef<WebView | null>(null),
    zomato: useRef<WebView | null>(null),
    ubereats: useRef<WebView | null>(null),
  };

  // Track whether each hidden WebView has finished its initial load
  const webViewReady = useRef<Record<PlatformKey, boolean>>({
    swiggy: false,
    zomato: false,
    ubereats: false,
  });

  // Pending searches waiting for WebView results
  const pendingSearches = useRef<Map<PlatformKey, PendingSearch>>(new Map());

  // Load persisted auth state on mount
  useEffect(() => {
    loadAuthState().then(setAuthState);
  }, []);

  // ── Login modal controls ────────────────────────────────────────────────────

  const openLogin = useCallback((platform: PlatformKey) => {
    setLoginModalPlatform(platform);
  }, []);

  const onLoginModalClose = useCallback(() => {
    setLoginModalPlatform(null);
  }, []);

  const onLoginSuccess = useCallback(async (platform: PlatformKey, username?: string) => {
    await markConnected(platform, username);
    setAuthState((prev) => ({
      ...prev,
      [platform]: { isConnected: true, username, connectedAt: Date.now() },
    }));
    setLoginModalPlatform(null);
    // Reset ready state so the hidden WebView reloads with fresh cookies
    webViewReady.current[platform] = false;
  }, []);

  const disconnect = useCallback(async (platform: PlatformKey) => {
    await markDisconnected(platform);
    setAuthState((prev) => ({
      ...prev,
      [platform]: { isConnected: false },
    }));
    webViewReady.current[platform] = false;
  }, []);

  // ── Hidden WebView handlers ─────────────────────────────────────────────────

  const handleWebViewLoadEnd = useCallback(
    (platform: PlatformKey) => {
      webViewReady.current[platform] = true;
      const pending = pendingSearches.current.get(platform);
      if (pending) {
        const js = buildSearchJS(platform, pending.requestId, pending.query, pending.lat, pending.lng);
        webViewRefs[platform].current?.injectJavaScript(js);
      }
    },
    [],
  );

  const handleWebViewMessage = useCallback(
    (platform: PlatformKey, event: WebViewMessageEvent) => {
      let msg: WebViewMessage;
      try {
        msg = JSON.parse(event.nativeEvent.data) as WebViewMessage;
      } catch {
        return;
      }

      const pending = pendingSearches.current.get(platform);
      if (!pending) return;

      if (
        (msg.type === 'search_results' || msg.type === 'search_error') &&
        msg.requestId === pending.requestId
      ) {
        pendingSearches.current.delete(platform);

        if (msg.type === 'search_results') {
          const results = parseWebViewResults(platform, msg.data, pending.query);
          // If parsing yields nothing, fall back to mock for this platform
          pending.resolve(
            results.length > 0
              ? results
              : getMockResults(pending.query).filter((r) => r.platform === platformKeyToLabel(platform)),
          );
        } else {
          // search_error — fall back to mock
          pending.resolve(
            getMockResults(pending.query).filter((r) => r.platform === platformKeyToLabel(platform)),
          );
        }
      }
    },
    [],
  );

  // ── searchViaWebView ────────────────────────────────────────────────────────

  const searchViaWebView = useCallback(
    (platform: PlatformKey, query: string, lat: number, lng: number): Promise<RestaurantResult[]> => {
      // Not connected → return mock data immediately
      if (!authState[platform].isConnected) {
        return Promise.resolve(
          getMockResults(query).filter((r) => r.platform === platformKeyToLabel(platform)),
        );
      }

      return new Promise<RestaurantResult[]>((resolve) => {
        const requestId = `${platform}-${Date.now()}`;
        pendingSearches.current.set(platform, { requestId, query, lat, lng, resolve });

        if (webViewReady.current[platform]) {
          const js = buildSearchJS(platform, requestId, query, lat, lng);
          webViewRefs[platform].current?.injectJavaScript(js);
        }
        // If not ready, handleWebViewLoadEnd will fire the injection

        // 12-second timeout — fall back to mock if WebView doesn't respond
        setTimeout(() => {
          if (pendingSearches.current.get(platform)?.requestId === requestId) {
            pendingSearches.current.delete(platform);
            resolve(
              getMockResults(query).filter((r) => r.platform === platformKeyToLabel(platform)),
            );
          }
        }, 12000);
      });
    },
    [authState],
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  const connectedPlatforms = (Object.keys(authState) as PlatformKey[]).filter(
    (k) => authState[k].isConnected,
  );

  return (
    <PlatformAuthContext.Provider
      value={{
        authState,
        openLogin,
        disconnect,
        searchViaWebView,
        loginModalPlatform,
        onLoginModalClose,
        onLoginSuccess,
      }}
    >
      {children}

      {/* ── Login modal (rendered here so it lives above all screens) ── */}
      {loginModalPlatform && (
        <PlatformLoginModal
          platform={loginModalPlatform}
          onClose={onLoginModalClose}
          onLoginSuccess={onLoginSuccess}
        />
      )}

      {/* ── Hidden search WebViews (one per connected platform) ── */}
      {connectedPlatforms.map((platform) => {
        const config = PLATFORM_CONFIGS.find((c) => c.key === platform)!;
        return (
          <View key={platform} style={styles.hiddenWebView}>
            <WebView
              ref={webViewRefs[platform]}
              source={{ uri: config.loginUrl }}
              onLoadEnd={() => handleWebViewLoadEnd(platform)}
              onMessage={(e) => handleWebViewMessage(platform, e)}
              // Disable unnecessary features for a background WebView
              mediaPlaybackRequiresUserAction
              allowsInlineMediaPlayback={false}
              javaScriptEnabled
            />
          </View>
        );
      })}
    </PlatformAuthContext.Provider>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function platformKeyToLabel(key: PlatformKey): string {
  switch (key) {
    case 'swiggy': return 'Swiggy';
    case 'zomato': return 'Zomato';
    case 'ubereats': return 'Uber Eats';
  }
}

const styles = StyleSheet.create({
  hiddenWebView: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    pointerEvents: 'none',
  },
});
