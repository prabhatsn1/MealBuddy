# MealBuddy — Comprehensive Technical Documentation

> **Version:** 1.0.0 | **Platform:** iOS · Android · Web | **Stack:** Expo 54 · React Native 0.81 · TypeScript 5.9

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Overview](#2-architecture-overview)
3. [Repository Structure](#3-repository-structure)
4. [Key Design Decisions](#4-key-design-decisions)
5. [Core Workflows](#5-core-workflows)
6. [Configuration & Environment](#6-configuration--environment)
7. [Development Guide](#7-development-guide-internal)
8. [Non-Functional Aspects](#8-non-functional-aspects)
9. [Limitations & Known Gaps](#9-limitations--known-gaps)
10. [Appendix](#10-appendix)

---

## 1. Project Overview

### What Problem Does It Solve?

Food delivery in India is fragmented across three dominant platforms — **Swiggy**, **Zomato**, and **Uber Eats**. Users must open each app separately, search for the same dish, and mentally compare prices, delivery times, and ratings. This is slow, error-prone, and leads to suboptimal decisions.

**MealBuddy** eliminates this friction by searching all three platforms simultaneously and surfacing a single, opinionated recommendation — the "best choice" — with a clear explanation of why it was selected.

### High-Level Description

MealBuddy is a **cross-platform React Native mobile application** (iOS, Android, Web) built with Expo. Users type a food query (e.g. "Biryani"), select an optimisation mode, and receive ranked results with a highlighted winner. The app optionally integrates real platform APIs, uses a confidence-scoring system, and provides AI-generated explanations via OpenAI.

### Target Users

| Audience | Use Case |
|---|---|
| Everyday consumers | Quickly deciding where to order food without manually cross-checking three apps |
| Budget-conscious users | Finding the cheapest option at the tap of a button |
| Time-sensitive users | Getting food delivered as fast as possible |
| Food enthusiasts | Discovering highest-rated options in a cuisine |

### Key Features

- **Multi-platform search** — queries Swiggy, Zomato, and Uber Eats in parallel
- **Four decision modes** — Balanced, Cheapest (Sasta), Fastest, and Best Rated
- **Confidence scoring** — rates how decisive the recommendation is (High / Medium / Low)
- **AI explanation** — optional GPT-4o-mini narrative (falls back gracefully when unavailable)
- **Order history & insights** — tracks searches and past recommendations locally
- **Platform authentication** — WebView-based login to leverage real session data
- **Push notifications** — dinner reminders for scheduled orders
- **Dark mode** — full support for system appearance

---

## 2. Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                        │
│  ┌──────────┐  ┌────────────┐  ┌───────────────────────┐   │
│  │  Search  │  │  Results   │  │      Preferences      │   │
│  │  Screen  │  │  Screen    │  │       Screen          │   │
│  └────┬─────┘  └─────┬──────┘  └───────────────────────┘   │
└───────┼──────────────┼─────────────────────────────────────┘
        │              │
        ▼              ▼
┌───────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                        │
│                                                               │
│  ┌─────────────────────────┐  ┌──────────────────────────┐   │
│  │  Recommendation Engine  │  │   AI Explanation Engine  │   │
│  │  (rule-based scoring)   │  │   (GPT-4o-mini, optional)│   │
│  └────────────┬────────────┘  └──────────────────────────┘   │
│               │                                               │
│  ┌────────────▼────────────┐  ┌──────────────────────────┐   │
│  │   Confidence Calculator │  │   useHistory / usePrefs  │   │
│  │   (multi-dimensional)   │  │   (React hooks + storage) │   │
│  └─────────────────────────┘  └──────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│                       DATA ACCESS LAYER                        │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │               Food Aggregator                         │    │
│  │  (fans out to all three platforms in parallel)        │    │
│  └───────────┬───────────┬───────────┬──────────────────┘    │
│              │           │           │                         │
│    ┌─────────▼──┐  ┌─────▼───┐  ┌───▼──────┐                │
│    │ Swiggy API │  │  Zomato  │  │ UberEats │                │
│    │ (dapi/     │  │ RapidAPI │  │ RapidAPI │                │
│    │  WebView)  │  │ WebView) │  │ WebView) │                │
│    └─────────┬──┘  └────┬────┘  └───┬──────┘                │
│              └───────────┴───────────┘                        │
│                          │  (on failure)                       │
│                  ┌───────▼──────┐                             │
│                  │  Mock Data   │                             │
│                  │  Fallback    │                             │
│                  └──────────────┘                             │
└───────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│                    PERSISTENCE LAYER                           │
│  ┌──────────────────────┐  ┌──────────────────────────────┐  │
│  │    AsyncStorage      │  │       SecureStore            │  │
│  │ (preferences,        │  │  (platform auth state —      │  │
│  │  search/reco history)│  │   encrypted by OS keychain)  │  │
│  └──────────────────────┘  └──────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

### Major Components and Responsibilities

| Component | Location | Responsibility |
|---|---|---|
| **Expo Router** | `app/` | File-based navigation and screen layout |
| **Food Aggregator** | `lib/api/food-aggregator.ts` | Parallel fetching from all three platforms with tiered fallback |
| **Recommendation Engine** | `lib/recommendation-engine.ts` | Weighted scoring, ranking, and winner selection |
| **Confidence Calculator** | `lib/confidence.ts` | Determines how decisive the recommendation is |
| **AI Explanation Engine** | `lib/ai/explanation-engine.ts` | GPT-4o-mini call for natural-language explanations |
| **Platform Adapters** | `lib/api/{swiggy,zomato,ubereats}.ts` | Per-platform raw API calls and data normalisation |
| **Platform Auth** | `context/platform-auth-context.tsx` | WebView session bridging for authenticated searches |
| **Session Store** | `lib/auth/session-store.ts` | Persistent SecureStore wrapper for auth state |
| **usePreferences** | `hooks/use-preferences.ts` | AsyncStorage-backed user settings hook |
| **useHistory** | `hooks/use-history.ts` | Search and recommendation history with derived insights |
| **Order Reminder** | `lib/notifications/order-reminder.ts` | Scheduled push notifications via expo-notifications |

### Key Architectural Patterns

- **Layered architecture** — UI → Business logic → Data access → Persistence
- **Provider pattern** — `PlatformAuthProvider` wraps the entire app to inject WebView search capability globally
- **Tiered fallback** — every data fetch attempt degrades gracefully: WebView session → direct API → local mock data
- **Rule-based decisions + optional AI narrative** — the ranking logic is fully deterministic; GPT-4o-mini enriches the _explanation text only_, never the decision itself
- **Hooks-based state management** — no external state library; React hooks with AsyncStorage for persistence

---

## 3. Repository Structure

```
MealBuddy/
├── app/                        # Expo Router screens (file = route)
│   ├── _layout.tsx             # Root layout: PlatformAuthProvider + navigation stack
│   ├── modal.tsx               # Generic modal placeholder
│   ├── results.tsx             # Comparison & recommendation results screen
│   └── (tabs)/                 # Tab group (bottom navigation)
│       ├── _layout.tsx         # Tab bar configuration (Blur/iOS, solid/Android)
│       ├── index.tsx           # Home / Search screen  ← PRIMARY ENTRY POINT
│       ├── explore.tsx         # "How It Works" explainer screen
│       └── preferences.tsx     # User settings and platform auth screen
│
├── components/                 # Reusable UI components
│   ├── auth/
│   │   └── platform-login-modal.tsx  # Full-screen WebView login flow
│   ├── meal/
│   │   ├── best-choice-banner.tsx    # Highlighted winner card with CTA
│   │   ├── comparison-card.tsx       # Individual restaurant result row
│   │   ├── decision-mode-picker.tsx  # Mode selection chips (Balanced/Cheapest/etc.)
│   │   ├── food-category-chips.tsx   # Quick-select cuisine chips
│   │   ├── food-search-bar.tsx       # Styled text input for food queries
│   │   └── platform-badge.tsx        # Coloured Swiggy / Zomato / Uber Eats badges
│   └── ui/
│       ├── animated-pressable.tsx    # Scale-on-press wrapper
│       ├── collapsible.tsx           # Animated expandable section
│       ├── fade-in.tsx               # Staggered fade-in animation
│       ├── icon-symbol.tsx           # Cross-platform SF Symbols / MaterialIcons
│       └── icon-symbol.ios.tsx       # iOS-specific SF Symbol implementation
│
├── constants/
│   └── theme.ts                # Design tokens: colours, spacing, typography, radii
│
├── context/
│   └── platform-auth-context.tsx  # Global provider for platform WebView auth + search
│
├── data/
│   └── mock-restaurants.ts     # Static fixture data covering multiple cuisines
│
├── hooks/
│   ├── use-color-scheme.ts     # System dark/light mode detection
│   ├── use-history.ts          # Search & recommendation history + insights
│   ├── use-preferences.ts      # User preferences with AsyncStorage persistence
│   └── use-theme-color.ts      # Colour resolution helper for components
│
├── lib/                        # Pure business logic (no React dependencies)
│   ├── confidence.ts           # Threshold utilities for confidence levels
│   ├── recommendation-engine.ts # Core scoring, ranking, warnings, trade-off text
│   ├── ai/
│   │   └── explanation-engine.ts  # OpenAI GPT-4o-mini integration
│   ├── api/
│   │   ├── food-aggregator.ts  # Parallel multi-platform fetch orchestrator
│   │   ├── swiggy.ts           # Swiggy dapi adapter
│   │   ├── ubereats.ts         # Uber Eats RapidAPI adapter
│   │   ├── zomato.ts           # Zomato RapidAPI adapter
│   │   └── types.ts            # Raw API response shapes
│   ├── auth/
│   │   ├── session-store.ts    # SecureStore CRUD for platform auth state
│   │   └── types.ts            # Auth types + PLATFORM_CONFIGS constant
│   └── notifications/
│       └── order-reminder.ts   # Schedule/cancel dinner reminder notifications
│
├── types/
│   └── meal.ts                 # Shared domain types (RestaurantResult, BestChoice, etc.)
│
├── __tests__/                  # Jest test suite (mirrors lib/ structure)
│   ├── data/mock-restaurants.test.ts
│   ├── hooks/{use-history,use-preferences}.test.ts
│   └── lib/{confidence,recommendation-engine,api/*,auth/*}.test.ts
│
├── app.json                    # Expo configuration
├── tsconfig.json               # TypeScript config (strict mode, @/ path alias)
├── jest.setup.ts               # Global test mocks (SecureStore, AsyncStorage, WebView)
└── package.json                # Dependencies and npm scripts
```

### Entry Points

| Entry | Purpose |
|---|---|
| `app/(tabs)/index.tsx` | First screen the user sees. Search input, mode picker, history suggestions. |
| `app/_layout.tsx` | Root navigator. Bootstraps `PlatformAuthProvider`, notification handler, and theming. |
| `lib/api/food-aggregator.ts` | The single function (`searchAllPlatforms`) called whenever a comparison is triggered. |
| `lib/recommendation-engine.ts` | `getBestChoice()` — the core algorithm that produces every recommendation. |

---

## 4. Key Design Decisions

### 4.1 Tiered Data Fetching

**Decision:** Three-tier priority: WebView session → direct API → mock data.

**Rationale:** Indian food delivery platforms do not provide a publicly documented first-party API. The WebView approach leverages the user's existing authenticated browser session to issue same-origin `fetch()` calls inside a hidden WebView, returning real personalised data. The RapidAPI keys provide a second-best option for unauthenticated access. Mock data ensures the app always works — even during development with no credentials.

**Trade-off:** The WebView approach is fragile (subject to platform DOM changes). The unofficial Swiggy dapi has no documented stability guarantees. These are acknowledged in inline code comments.

### 4.2 Rule-Based Decisions, AI-Only for Explanations

**Decision:** Scoring and winner selection are entirely deterministic and rule-based. The OpenAI API is called only to generate the _human-readable explanation text_.

**Rationale:** Deterministic ranking is testable, auditable, and fast (no network round-trip on the critical path). GPT-4o-mini adds personality and contextual nuance to the copy without affecting correctness. If the API fails, the rule-based template string is used as a fallback.

**Trade-off:** AI responses introduce latency and require an API key. The 5-second timeout ensures the UI is never blocked.

### 4.3 Client-Side API Key Exposure

**Decision:** The OpenAI API key (`EXPO_PUBLIC_OPENAI_API_KEY`) is used directly from the client app.

**Rationale:** This is explicitly documented in `explanation-engine.ts` as a development/demo pattern. For production, the comment prescribes routing calls through a backend proxy (e.g. an Edge Function).

**Security concern:** Any key prefixed `EXPO_PUBLIC_` is embedded in the app bundle and visible to anyone who inspects the build. This is an acknowledged open issue.

### 4.4 Local-Only Persistence, No Backend

**Decision:** All user data (preferences, history) is stored only on-device using AsyncStorage. Auth state is stored in SecureStore (OS keychain-backed). There is no backend server or remote database.

**Rationale:** Simpler architecture, no user accounts, no data privacy risk. The app works fully offline with mock data.

**Trade-off:** History and preferences are lost when the app is uninstalled. No cross-device sync.

### 4.5 Weighted Scoring with Time-of-Day Adjustment

**Decision:** The balanced mode uses configurable weights (price 40%, time 30%, rating 30%) that shift slightly based on the time of day.

**Rationale:** User intent differs by meal context — during a late-night craving speed is paramount; at dinner time, quality matters more. This heuristic attempts to match recommendations to likely user priorities without requiring additional input.

**Trade-off:** The weight adjustments are manually tuned estimates, not data-driven. They represent an assumption about typical user behaviour.

### 4.6 Preference Filters Applied Before Ranking

**Decision:** `maxPrice` and `minRating` user preferences filter the results set before the scoring algorithm runs.

**Rationale:** Hard constraints (user refusing to pay over ₹300) should be respected regardless of mode. Filtering before scoring avoids the winner violating a stated constraint.

**Trade-off:** If filters remove all candidates, the app falls back to the unfiltered set with a `filtersApplied` indicator in the UI.

### 4.7 Confidence Score as a Gate on Automation

**Decision:** The app introduces a `Confidence` signal (`high / medium / low`) that gates the one-tap order handoff button and an optional `autoOrderThreshold`.

**Rationale:** Automating an order on behalf of the user when the recommendation is uncertain (e.g. all options score similarly) is risky. The confidence gate lets users choose how much they trust the system's judgment.

---

## 5. Core Workflows

### 5.1 Main Search and Recommendation Flow

```
User types food query + selects mode
          │
          ▼
HomeScreen.handleCompare()
          │  navigates to /results
          ▼
ResultsScreen mounts → loadResults() triggered
          │
          ├─ searchAllPlatforms(query, lat, lng, webViewSearch?)
          │    │
          │    ├─ resolveForPlatform('swiggy') ──┐
          │    ├─ resolveForPlatform('zomato') ──┤ Promise.all (parallel)
          │    └─ resolveForPlatform('ubereats')─┘
          │         │
          │         ├─ [1] Try WebView session search (if connected)
          │         ├─ [2] Try direct API (RapidAPI / Swiggy dapi)
          │         └─ [3] Fall back to mock data
          │
          ▼
     results: RestaurantResult[]   (combined from all platforms)
          │
          ▼
getBestChoice(results, mode, preferences, favouriteCuisines)
          │
          ├─ Apply preference filters (maxPrice, minRating)
          ├─ Normalise scores across all candidates (0–1)
          ├─ Apply time-of-day weight adjustments (balanced mode)
          ├─ Rank by weighted score
          ├─ Compute confidence (score gap + dimension dominance)
          ├─ Compute trade-off narrative
          └─ Compute warnings (price surge, low rating, slow delivery)
          │
          ▼
     BestChoice { winner, rankedResults, confidence, explanation,
                  mealTime, tradeOff, warnings }
          │
          ├─ Save to history (addSearch, addRecommendation)
          ├─ Render BestChoiceBanner + ComparisonCard list
          │
          └─ Async: generateAIExplanation()
                    │  (5s timeout, falls back to rule-based text)
                    └─ Updates explanation text in UI when ready
```

### 5.2 Platform Authentication Flow (WebView Bridge)

```
User taps "Connect" on Preferences screen
          │
          ▼
PlatformAuthProvider.openLogin(platformKey)
          │
          ▼
PlatformLoginModal renders full-screen WebView
at platform's home/login URL
          │
          ▼
User logs in normally in the WebView
          │
          ▼
WebView.onNavigationStateChange fires on every URL change
          │
          ▼
PlatformConfig.isLoginSuccess(url) → true?
          │
          ├─ YES: Inject EXTRACT_USERNAME_JS
          │         ↓
          │       WebView posts { type: 'auth_success', username? }
          │         ↓
          │       markConnected(platform, username) → SecureStore
          │         ↓
          │       Hidden 1×1 WebView renders for that platform
          │         (shares OS cookie jar → already authenticated)
          │         ↓
          │       Modal closes
          │
          └─ NO: Continue tracking navigations
```

### 5.3 WebView Search (Authenticated Data Fetch)

```
loadResults() calls searchViaWebView(platform, query, lat, lng)
          │
          ▼
PlatformAuthProvider injects platform-specific JS into hidden WebView
e.g. buildSwiggySearchJS() → fetch('/dapi/restaurants/search/v3?...')
          │
          ▼
Swiggy/Zomato/UberEats server returns JSON (authenticated, real data)
          │
          ▼
window.ReactNativeWebView.postMessage({ type: 'search_results', data })
          │
          ▼
PlatformAuthProvider.onMessage handler resolves the pending Promise
          │
          ▼
Results flow into the aggregator as RestaurantResult[]
```

### 5.4 State Management Flows

| State | Storage | Lifecycle |
|---|---|---|
| User preferences | `AsyncStorage` key `@mealbuddy/preferences` | Loaded on mount, updated on user action, reset on demand |
| Search history | `AsyncStorage` key `@mealbuddy/search_history` | Appended on each search, capped at 10, deduplicated |
| Recommendation history | `AsyncStorage` key `@mealbuddy/recommendation_history` | Appended after each comparison, capped at 20 |
| Platform auth state | `SecureStore` key `mealbuddy_platform_auth_v1` | One JSON blob, updated on connect/disconnect |
| Current fetch state | React `useState` | Local to `ResultsScreen`, ephemeral |
| AI explanation text | React `useState` | Local to `ResultsScreen`, set asynchronously |

### 5.5 Error Handling

| Scenario | Behaviour |
|---|---|
| WebView search fails | Silently falls through to direct API |
| Direct API returns empty or errors | Silently falls through to mock data |
| All sources return empty | `ResultsScreen` shows "Kuch mila nahi yaar" empty state with retry button |
| AI API fails or times out (5 s) | Rule-based explanation is used; no error shown to user |
| Preference load fails | Default preferences used silently |
| Auth state load fails | Default (all disconnected) used silently |
| Notification permission denied | `scheduleOrderReminder` returns `null` silently |
| Preference filters remove all candidates | Falls back to unfiltered results, marks `filtersApplied: true` |

---

## 6. Configuration & Environment

### Environment Variables

All variables are prefixed `EXPO_PUBLIC_` which means they are **bundled into the app binary** and are not secret.

| Variable | Required | Default | Description |
|---|---|---|---|
| `EXPO_PUBLIC_OPENAI_API_KEY` | No | *(unset)* | OpenAI API key for AI explanations. If absent, rule-based explanations are used. |
| `EXPO_PUBLIC_RAPIDAPI_KEY` | No | *(unset)* | RapidAPI key for Zomato and Uber Eats. If absent, both platforms fall back to mock data. |
| `EXPO_PUBLIC_DEFAULT_LAT` | No | `28.6139` | Default latitude for API searches (default: New Delhi). |
| `EXPO_PUBLIC_DEFAULT_LNG` | No | `77.2090` | Default longitude for API searches (default: New Delhi). |

Create a `.env.local` file in the project root:

```env
EXPO_PUBLIC_OPENAI_API_KEY=sk-...
EXPO_PUBLIC_RAPIDAPI_KEY=your_rapidapi_key
EXPO_PUBLIC_DEFAULT_LAT=28.6139
EXPO_PUBLIC_DEFAULT_LNG=77.2090
```

### app.json Configuration Highlights

| Setting | Value | Notes |
|---|---|---|
| `scheme` | `mealbuddy` | Deep-link URL scheme |
| `orientation` | `portrait` | Locked to portrait |
| `newArchEnabled` | `true` | Opts into React Native New Architecture |
| `experiments.typedRoutes` | `true` | Type-safe Expo Router links |
| `experiments.reactCompiler` | `true` | React Compiler enabled (experimental) |
| `web.output` | `static` | Static export for web deployment |

### Build & Run

| Command | Description |
|---|---|
| `npm install` | Install all dependencies |
| `npx expo start` | Start dev server (opens QR code for Expo Go) |
| `npx expo start --ios` | Launch in iOS Simulator |
| `npx expo start --android` | Launch in Android Emulator |
| `npx expo start --web` | Launch in browser |
| `npm test` | Run full Jest test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Generate coverage report |
| `npm run lint` | Run ESLint |

---

## 7. Development Guide (Internal)

### Local Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd MealBuddy
npm install

# 2. (Optional) Configure environment
cp .env.example .env.local   # if a template exists
# Edit .env.local with your API keys

# 3. Start development
npx expo start
```

**Requirements:** Node.js 18+, npm 9+. iOS development requires macOS + Xcode. Android requires Android Studio. No backend server is needed.

### TypeScript Path Alias

The project uses `@/` as an alias for the workspace root. Configured in `tsconfig.json`:

```json
"paths": { "@/*": ["./*"] }
```

All imports should use `@/` rather than relative paths (e.g. `import { BestChoice } from '@/types/meal'`).

### Adding a New Decision Mode

1. Add the mode key to the `DecisionMode` union in `types/meal.ts`.
2. Add a `ModeConfig` entry (weights + explanation template) to `MODE_CONFIG` in `lib/recommendation-engine.ts`.
3. Add a display entry to `MODES` in `app/(tabs)/preferences.tsx`.
4. Add a label to `DECISION_MODE_LABELS` in `lib/recommendation-engine.ts`.
5. Write tests in `__tests__/lib/recommendation-engine.test.ts`.

### Adding a New Food Platform

1. Add the platform key to `PlatformKey` in `lib/auth/types.ts`.
2. Add a `PlatformConfig` entry (login URL, `isLoginSuccess` pattern) to `PLATFORM_CONFIGS`.
3. Create `lib/api/<platform>.ts` implementing `search<Platform>(query, lat, lng): Promise<RestaurantResult[]>`.
4. Add normalisation logic mapping raw responses to `RestaurantResult`.
5. Wire into `food-aggregator.ts` `resolveForPlatform()`.
6. Add a `buildSearchJS()` helper in `platform-auth-context.tsx` for the WebView bridge.
7. Add the platform to `DEFAULT_AUTH_STATE` in `lib/auth/types.ts`.
8. Write tests in `__tests__/lib/api/<platform>.test.ts`.

### Coding Conventions

- **Strict TypeScript** — `strict: true` is enforced. No `any` unless genuinely unavoidable.
- **Pure library functions** — code in `lib/` must not import React or use hooks. This keeps the business logic independently testable.
- **Silent fallbacks** — API errors in the data layer must be caught and return empty arrays (never throw to the UI layer). The aggregator controls the fallback cascade.
- **Inline comments** — complex algorithms (scoring, confidence, WebView injection) include JSDoc and inline explanation. This should be maintained.
- **Design tokens** — all colours, spacing, typography, and radii must come from `constants/theme.ts`. No hardcoded style values.
- **`EXPO_OS` guard for haptics** — haptic feedback is guarded with `process.env.EXPO_OS === 'ios'` to avoid errors on Android/Web.

### Running Tests

```bash
# All tests, no coverage (faster)
npx jest --no-coverage

# Specific test file
npx jest __tests__/lib/recommendation-engine.test.ts

# Watch mode during development
npm run test:watch
```

Tests use `jest-expo` preset. Native modules (SecureStore, AsyncStorage, WebView) are mocked globally in `jest.setup.ts`.

Coverage collection is configured for `lib/**/*.ts`, `data/**/*.ts`, and `hooks/**/*.ts`.

---

## 8. Non-Functional Aspects

### Performance

- **Parallel fetching** — `Promise.all()` in `food-aggregator.ts` ensures all three platform requests run simultaneously, bounding latency to the slowest single response rather than the sum.
- **AI explanation is non-blocking** — the recommendation and results screen render immediately with the rule-based explanation. The AI text replaces it asynchronously when available.
- **React Compiler (experimental)** — enabled via `experiments.reactCompiler: true` in `app.json`. This auto-memoises components, reducing manual `useMemo`/`useCallback` overhead.
- **New Architecture** — `newArchEnabled: true` activates the React Native JSI bridge, reducing UI thread overhead.
- **History caps** — search history is capped at 10 entries, recommendations at 20. This prevents unbounded AsyncStorage growth.

### Security

- **Sensitive storage** — platform authentication state (connection status, username) is stored in `expo-secure-store`, which maps to the iOS Keychain / Android Keystore. This is encrypted at rest by the OS.
- **Preference and history data** — stored in `AsyncStorage`, which is NOT encrypted. This data is non-sensitive (food queries, preference settings).
- **API key exposure** — `EXPO_PUBLIC_*` keys are embedded in the app bundle. For a public app release, the OpenAI key should be moved to a backend proxy. The RapidAPI key should have IP/referer restrictions.
- **WebView injection safety** — JavaScript injected into platform WebViews escapes user-supplied query strings (replacing `'` with `\'`) before interpolation to prevent trivial injection. However, this is a minimal mitigation; more thorough sanitisation or parameterisation would be needed for production hardening.
- **No auth tokens transmitted** — the WebView bridge posts API response data back to React Native; it does not expose session cookies or auth tokens to JavaScript land.
- **No user accounts or remote data** — there is no registration, login, or remote storage, eliminating the largest surface areas for identity and data breach vulnerabilities.

### Scalability and Reliability

- **Single-device scope** — the app is purely client-side. Scalability of the application itself is not a concern.
- **Platform API reliability** — the unofficial Swiggy dapi and RapidAPI wrappers for Zomato/Uber Eats are third-party dependencies with no SLA. Any of them can become unavailable without notice. The mock data fallback ensures a degraded-but-functional experience.
- **Graceful degradation levels:**
  1. All APIs online → real data from three platforms
  2. One platform's API down → real data from two, mock for one
  3. All APIs down → full mock data, all features work
  4. No internet → mock data only

### Logging and Monitoring

**No logging or analytics infrastructure is currently implemented.** Errors in the data-access layer are silently swallowed (caught and returned as empty arrays). There is no Sentry, Firebase Analytics, or equivalent integration.

> **Open question for maintainers:** Should error rates (API failures, empty results) be tracked to detect upstream platform changes?

---

## 9. Limitations & Known Gaps

### Current Limitations

| Area | Limitation |
|---|---|
| **Location** | Hardcoded default coordinates (New Delhi). The app does not request GPS permission or detect the user's actual location. |
| **Platform APIs** | Swiggy's dapi and Zomato/Uber Eats via RapidAPI are unofficial or rate-limited. Data quality and availability are not guaranteed. |
| **Uber Eats pricing** | The Uber Eats API does not expose per-item prices in search results. Prices are synthetically derived from result position (`150 + index * 20`), making them inaccurate for comparison. |
| **Zomato pricing** | Uses "cost for two ÷ 2" as a per-meal estimate, which may not reflect the actual price of the searched dish. |
| **AI key in bundle** | `EXPO_PUBLIC_OPENAI_API_KEY` is embedded in the app binary — unsuitable for public release. |
| **Authentication scope** | Platform auth only enables search; it does not integrate with checkout, order tracking, or loyalty programmes. |
| **Web support** | The app targets web (`expo start --web`) but WebView-based features (hidden session WebViews) will not function in a browser environment. |
| **No GPS / delivery address** | Delivery address is not captured. All distance/time data comes from the platform APIs based on default coordinates. |
| **History not synced** | Order history and preferences are device-local; reinstalling the app loses all data. |
| **No real-time updates** | Results are fetched once per search. There is no live price or availability update. |

### Technical Debt

- The `PlatformAuthContext` is large and handles multiple concerns (auth state, modal orchestration, WebView rendering, search bridging). It would benefit from splitting into smaller units.
- The WebView JS injection strings (`buildSwiggySearchJS`, `buildZomatoSearchJS`, `buildUberEatsSearchJS`) are fragile string concatenations. A template-literal approach with proper escaping would be safer.
- `mock-restaurants.ts` covers only a fixed set of cuisine queries. New queries fall back to filtering mock data by an exact cuisine string match, which will return nothing for novel queries.
- No error boundary components exist around the results screen. An uncaught render error would crash the visible screen.
- The `explore.tsx` tab is a static explainer screen. It doesn't adapt to the user's current settings or history.

### Missing Documentation

- No API documentation (types in `lib/api/types.ts` are code-level only)
- No documented environment setup for CI/CD
- No documented release or deployment process
- No documented test coverage targets or quality gates

---

## 10. Appendix

### Glossary

| Term | Definition |
|---|---|
| **Decision Mode** | The optimisation objective the user selects: Balanced, Cheapest, Fastest, or Best Rated |
| **BestChoice** | The structured output of the recommendation engine: winner, ranked list, explanation, confidence, warnings, trade-off |
| **Confidence** | A three-level signal (`high / medium / low`) expressing how decisively one option dominates the others |
| **ScoredResult** | A `RestaurantResult` extended with a normalised composite score (0–1) |
| **Trade-Off** | A short sentence generated when the winner has a notable downside (e.g. "Slightly pricier, but 12 min faster") |
| **Warning** | A flag raised when the winner has an objective concern: price surge, low rating, or slow delivery |
| **WebView Bridge** | The technique of injecting JavaScript into a hidden `react-native-webview` to execute authenticated API calls in the platform's browser context |
| **Tiered Fallback** | The three-level data priority: WebView session → direct API → mock data |
| **RepeatSuggestion** | A derived recommendation on the home screen suggesting the user reorder their most-frequently-ordered food |
| **PreferenceInsight** | A rule-based observation derived from recommendation history ("You usually order under ₹300") |
| **autoOrderThreshold** | A price ceiling set by the user; if the winner's price is at or below this value and confidence meets the minimum, the one-tap handoff button is automatically activated |
| **minConfidenceToAct** | The minimum confidence level the user requires before the one-tap handoff button appears |
| **Haptic feedback** | Tactile vibration feedback on iOS only, triggered on key interactions via `expo-haptics` |
| **dapi** | Swiggy's internal (unofficial) data API (`swiggy.com/dapi/...`) used directly from the mobile app |
| **RapidAPI** | A third-party API marketplace that provides unofficial wrappers for Zomato and Uber Eats |

### Assumptions Made During Documentation

1. The app is primarily intended for users in India — currency is Indian Rupees (₹), platforms are Swiggy/Zomato/Uber Eats, and the bilingual copy (Hindi-English code-switch) confirms this.
2. The default coordinates (28.6139, 77.2090) are New Delhi. There is no mechanism to change the user's city beyond setting different environment variables.
3. The "one-tap handoff" opens the platform's web URL in the device browser via `Linking.openURL()`. It does not complete an order autonomously — despite the term "auto-order," it navigates the user to the platform, pre-searched, rather than placing an order programmatically.
4. The `modal.tsx` route is a placeholder and does not contain application-specific content in the current version.

### Open Questions for Maintainers

1. **GPS integration** — should the app request the user's location instead of relying on configured coordinates?
2. **Backend proxy** — when is the right time to introduce a thin backend to protect API keys and enable cross-device sync?
3. **Uber Eats pricing** — is there a better source of per-item price data, or should Uber Eats be excluded from price-based comparisons?
4. **Web platform** — is web a first-class target? The WebView session feature cannot work in a browser. Should the web build gracefully disable it or be removed?
5. **Error telemetry** — should silent API failures be tracked to detect upstream platform breakage early?
6. **Personalisation** — the `favouriteCuisines` derived from history is passed to `getBestChoice` but not yet used in the scoring logic (no cuisine bias is applied). Is personalised cuisine weighting planned?
7. **Stale mock data** — the mock restaurant names and prices will date quickly. Should they be loaded from a versioned JSON asset or a lightweight CMS?
