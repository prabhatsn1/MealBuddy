// ─────────────────────────────────────────────────────────────────────────────
// Shared types for the WebView-based platform authentication system.
// ─────────────────────────────────────────────────────────────────────────────

export type PlatformKey = 'swiggy' | 'zomato' | 'ubereats';

/** Persisted per-platform connection state (stored in SecureStore). */
export interface PlatformConnection {
  isConnected: boolean;
  username?: string;
  connectedAt?: number;
}

export type PlatformAuthState = Record<PlatformKey, PlatformConnection>;

/** Describes the login flow for each platform. */
export interface PlatformConfig {
  key: PlatformKey;
  label: string;
  emoji: string;
  color: string;
  /** The URL the login WebView opens at. */
  loginUrl: string;
  /**
   * Called with the current URL after each navigation to decide whether the
   * user has successfully logged in.  Return true to trigger login-success.
   */
  isLoginSuccess: (url: string) => boolean;
}

// ── Messages exchanged via WebView.onMessage ──────────────────────────────────

export interface WebViewAuthSuccessMessage {
  type: 'auth_success';
  username?: string;
}

export interface WebViewSearchResultsMessage {
  type: 'search_results';
  requestId: string;
  data: unknown;
}

export interface WebViewSearchErrorMessage {
  type: 'search_error';
  requestId: string;
  error: string;
}

export type WebViewMessage =
  | WebViewAuthSuccessMessage
  | WebViewSearchResultsMessage
  | WebViewSearchErrorMessage;

// ── Platform configs ──────────────────────────────────────────────────────────

export const PLATFORM_CONFIGS: PlatformConfig[] = [
  {
    key: 'swiggy',
    label: 'Swiggy',
    emoji: '🟠',
    color: '#FC8019',
    loginUrl: 'https://www.swiggy.com/',
    isLoginSuccess: (url) =>
      url.startsWith('https://www.swiggy.com') &&
      !url.includes('/login') &&
      !url.includes('/otp') &&
      !url.includes('/signup') &&
      url !== 'https://www.swiggy.com/login',
  },
  {
    key: 'zomato',
    label: 'Zomato',
    emoji: '🔴',
    color: '#E23744',
    loginUrl: 'https://www.zomato.com/',
    isLoginSuccess: (url) =>
      url.startsWith('https://www.zomato.com') &&
      !url.includes('/login') &&
      !url.includes('/signup') &&
      url !== 'https://www.zomato.com/login',
  },
  {
    key: 'ubereats',
    label: 'Uber Eats',
    emoji: '🟢',
    color: '#06C167',
    loginUrl: 'https://www.ubereats.com/',
    isLoginSuccess: (url) =>
      url.startsWith('https://www.ubereats.com') &&
      (url.includes('/feed') || url.includes('/home')) &&
      !url.includes('/login') &&
      !url.includes('/signup'),
  },
];

export const DEFAULT_AUTH_STATE: PlatformAuthState = {
  swiggy: { isConnected: false },
  zomato: { isConnected: false },
  ubereats: { isConnected: false },
};
