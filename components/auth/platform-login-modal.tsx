/**
 * PlatformLoginModal
 * Full-screen WebView that lets the user log in to a food platform.
 *
 * Flow:
 *  1. Opens on the platform's home/login URL.
 *  2. Tracks every navigation state change.
 *  3. When the URL matches the "login success" pattern for that platform,
 *     injects a tiny JS snippet to grab the username (best-effort).
 *  4. Calls onLoginSuccess() → the auth provider saves the state and
 *     closes this modal.
 */

import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import WebView, { WebViewMessageEvent, WebViewNavigation } from 'react-native-webview';

import { Colors, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { PLATFORM_CONFIGS, PlatformKey } from '@/lib/auth/types';

/** JS injected right after login is detected to extract the username. */
const EXTRACT_USERNAME_JS = `
(function() {
  const name =
    document.querySelector('[data-testid="user-name"]')?.textContent?.trim() ||
    document.querySelector('.user-name')?.textContent?.trim() ||
    document.querySelector('h1.account-name')?.textContent?.trim() ||
    '';
  window.ReactNativeWebView.postMessage(JSON.stringify({
    type: 'auth_success',
    username: name || undefined
  }));
  true;
})();
`;

interface Props {
  platform: PlatformKey;
  onClose: () => void;
  onLoginSuccess: (platform: PlatformKey, username?: string) => void;
}

export function PlatformLoginModal({ platform, onClose, onLoginSuccess }: Props) {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginDetected, setLoginDetected] = useState(false);
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const config = PLATFORM_CONFIGS.find((c) => c.key === platform)!;

  function handleNavigationStateChange(navState: WebViewNavigation) {
    if (loginDetected) return; // already handled
    if (!navState.url || navState.loading) return;

    if (config.isLoginSuccess(navState.url)) {
      setLoginDetected(true);
      webViewRef.current?.injectJavaScript(EXTRACT_USERNAME_JS);
    }
  }

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as { type: string; username?: string };
      if (msg.type === 'auth_success') {
        onLoginSuccess(platform, msg.username);
      }
    } catch {
      // ignore parse errors
    }
  }

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        {/* ── Header ── */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View style={styles.platformBadge}>
            <Text style={styles.platformEmoji}>{config.emoji}</Text>
            <Text style={[styles.platformLabel, { color: theme.text }]}>
              Log in to {config.label}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={12}>
            <Text style={[styles.closeText, { color: theme.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {/* ── Loading overlay ── */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={config.color} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              Loading {config.label}…
            </Text>
          </View>
        )}

        {/* ── Login success banner ── */}
        {loginDetected && (
          <View style={[styles.successBanner, { backgroundColor: config.color }]}>
            <Text style={styles.successText}>
              {config.emoji}  Connected to {config.label}! Closing…
            </Text>
          </View>
        )}

        {/* ── WebView ── */}
        <WebView
          ref={webViewRef}
          source={{ uri: config.loginUrl }}
          style={styles.webView}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          onNavigationStateChange={handleNavigationStateChange}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          // Identify as a mobile browser so platform shows mobile login UI
          userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  webView: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  platformEmoji: { fontSize: 20 },
  platformLabel: { ...Typography.headline },
  closeButton: { padding: Spacing.xs },
  closeText: { ...Typography.callout },
  loadingOverlay: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  loadingText: { ...Typography.callout },
  successBanner: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  successText: {
    ...Typography.headline,
    color: '#FFFFFF',
  },
});
