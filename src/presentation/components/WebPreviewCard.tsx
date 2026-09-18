import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from "react-native";
import { WebView } from "react-native-webview";

export interface WebPreviewData {
  query: string;
  previewUrl: string;
  browserUrl: string;
}

interface Props {
  preview: WebPreviewData;
  height?: number;
}

// Checks the loaded page for signs of a bot/CAPTCHA block page. Needed
// because a block page is still a normal HTTP 200 response — onError and
// onHttpError never fire for it, so the only way to detect it is to
// actually look at what rendered.
const BLOCK_DETECTION_SCRIPT = `
(function () {
  function check() {
    try {
      var text = (document.body && document.body.innerText || "").toLowerCase();
      var blocked = ["unusual traffic", "captcha", "verify you are human", "not a robot", "detected unusual activity"]
        .some(function (needle) { return text.indexOf(needle) !== -1; });
      if (blocked) {
        window.ReactNativeWebView.postMessage("BLOCKED");
      }
    } catch (e) {}
  }
  if (document.readyState === "complete") check();
  else window.addEventListener("load", check);
  true;
})();
`;

/**
 * Shows a quick embedded results preview in chat instead of jumping
 * straight to the browser, with a button to open the full page if
 * someone wants to go further — same idea as RouteMapView's inline map.
 *
 * Falls back to a clean in-card message (instead of the WebView's own
 * ugly browser-style error screen, or silently showing a raw CAPTCHA
 * page) if the preview can't load or gets bot-blocked. "Open in browser"
 * stays available either way, since a real browser doesn't trip the same
 * block a WebView does.
 */
export default function WebPreviewCard({ preview, height = 260 }: Props) {
  const [failed, setFailed] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const showFallback = failed || blocked;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.webviewBox, { height: showFallback ? undefined : height }]}>
        {showFallback ? (
          <View style={styles.fallback}>
            <Text style={styles.fallbackText}>
              {blocked
                ? `The preview for "${preview.query}" was blocked as automated traffic — this can happen with embedded search pages.`
                : `Couldn't load a preview for "${preview.query}" — your connection to the preview source may be having trouble right now.`}
            </Text>
          </View>
        ) : (
          <WebView
            originWhitelist={["*"]}
            source={{ uri: preview.previewUrl }}
            style={styles.webview}
            nestedScrollEnabled={Platform.OS === "android"}
            javaScriptEnabled
            domStorageEnabled
            injectedJavaScript={BLOCK_DETECTION_SCRIPT}
            onMessage={(event) => {
              if (event.nativeEvent.data === "BLOCKED") setBlocked(true);
            }}
            onError={() => setFailed(true)}
            onHttpError={() => setFailed(true)}
          />
        )}
      </View>
      <TouchableOpacity
        style={styles.browserButton}
        activeOpacity={0.8}
        onPress={() => Linking.openURL(preview.browserUrl)}
      >
        <Text style={styles.browserButtonText}>Open full results in browser ↗</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: 8 },
  webviewBox: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#1E1F20",
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
  fallback: {
    padding: 16,
  },
  fallbackText: {
    color: "#A0A0A0",
    fontSize: 13,
    lineHeight: 18,
  },
  browserButton: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "rgba(59,130,246,0.15)",
  },
  browserButtonText: {
    color: "#3B82F6",
    fontSize: 13,
    fontWeight: "600",
  },
});

