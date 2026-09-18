import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { WebView } from "react-native-webview";

export interface RouteMapData {
  origin: { lat: number; lon: number };
  destination: { lat: number; lon: number };
  path: [number, number][]; // [lat, lon] pairs
  distanceLabel: string;
  durationLabel: string;
  destinationLabel: string;
}

interface Props {
  route: RouteMapData;
  height?: number;
}

/**
 * Renders a live route on real OpenStreetMap tiles, inline in the chat.
 *
 * Why a WebView + Leaflet instead of react-native-maps: on Android,
 * react-native-maps only has a native Google Maps backend, which needs a
 * Google Maps SDK API key (a billing/console step we're deliberately
 * avoiding for this feature). Leaflet inside a WebView renders straight
 * OSM tiles on both platforms with zero API keys and zero native config.
 */
export default function RouteMapView({ route, height = 220 }: Props) {
  const html = useMemo(() => buildLeafletHtml(route), [route]);
  const [tileNotice, setTileNotice] = useState<string | null>(null);

  return (
    <View style={styles.wrapper}>
      <View style={[styles.webviewBox, { height }]}>
        <WebView
          originWhitelist={["*"]}
          source={{ html, baseUrl: "https://pico.app/" }}
          style={styles.webview}
          scrollEnabled={false}
          // Android needs this for the WebView's own internal scroll/zoom
          // gestures on the map not to fight the chat list's scroll view.
          nestedScrollEnabled={Platform.OS === "android"}
          javaScriptEnabled
          domStorageEnabled
          onMessage={(event) => {
            const data = event.nativeEvent.data;
            // Surface tile diagnostics to Metro's console for debugging,
            // and show a plain-language note in the card if every tile
            // failed — the route line and markers still work regardless,
            // so we don't hide the whole card over a missing basemap.
            console.warn(`[RouteMapView] ${data}`);
            if (data.startsWith("ALL_TILES_FAILED")) {
              setTileNotice("Map tiles couldn't load — showing the route line only.");
            }
          }}
        />
      </View>
      {tileNotice && <Text style={styles.tileNotice}>{tileNotice}</Text>}
    </View>
  );
}

function buildLeafletHtml(route: RouteMapData): string {
  const { origin, destination, path, distanceLabel, durationLabel, destinationLabel } = route;
  const pathJson = JSON.stringify(path);
  const originJson = JSON.stringify([origin.lat, origin.lon]);
  const destJson = JSON.stringify([destination.lat, destination.lon]);
  const label = destinationLabel.replace(/"/g, "'");

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
      html, body, #map { height: 100%; margin: 0; padding: 0; background: #1E1F20; }
      .leaflet-control-attribution { font-size: 9px; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      function report(msg) {
        try { window.ReactNativeWebView.postMessage(msg); } catch (e) {}
      }
      window.onerror = function (message, source, lineno) {
        report('JS_ERROR: ' + message + ' at line ' + lineno);
      };

      var path = ${pathJson};
      var origin = ${originJson};
      var dest = ${destJson};

      var map = L.map('map', { zoomControl: false, attributionControl: true });

      var tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      });

      // Leaflet has no real "referrerPolicy" tile option — passing one to
      // L.tileLayer(...) is silently ignored. OSM's tile server actively
      // blocks requests with no Referer header, so we override tile
      // creation to set referrerPolicy directly on each <img> BEFORE its
      // src is assigned (setting it after does nothing, since the
      // request has already gone out by then).
      //
      // This override is wrapped defensively: if anything about it fails
      // for any reason, it falls back to Leaflet's own stock tile
      // creation rather than leaving every tile permanently broken, and
      // reports the failure back so it's actually visible instead of a
      // silent blank map.
      var defaultCreateTile = L.TileLayer.prototype.createTile;
      tileLayer.createTile = function (coords, done) {
        try {
          var tile = document.createElement('img');
          tile.referrerPolicy = 'origin';
          L.DomEvent.on(tile, 'load', L.Util.bind(this._tileOnLoad, this, done, tile));
          L.DomEvent.on(tile, 'error', L.Util.bind(this._tileOnError, this, done, tile));
          tile.alt = '';
          tile.src = this.getTileUrl(coords);
          return tile;
        } catch (err) {
          report('TILE_CREATE_OVERRIDE_FAILED: ' + err.message);
          return defaultCreateTile.call(this, coords, done);
        }
      };

      var tilesLoaded = 0;
      var tilesFailed = 0;
      tileLayer.on('tileload', function () { tilesLoaded++; });
      tileLayer.on('tileerror', function (e) {
        tilesFailed++;
        var errInfo = (e && e.error) ? (e.error.message || String(e.error)) : 'unknown';
        report('TILE_ERROR: ' + errInfo);
      });
      tileLayer.on('load', function () {
        // Fires once all currently-queued tiles have settled (loaded or
        // errored). If literally none loaded, say so plainly.
        if (tilesLoaded === 0 && tilesFailed > 0) {
          report('ALL_TILES_FAILED: ' + tilesFailed + ' failed, 0 loaded');
        } else {
          report('TILES_OK: ' + tilesLoaded + ' loaded, ' + tilesFailed + ' failed');
        }
      });

      tileLayer.addTo(map);

      var line = L.polyline(path.length ? path : [origin, dest], {
        color: '#3B82F6',
        weight: 5,
        opacity: 0.85,
      }).addTo(map);

      L.circleMarker(origin, {
        radius: 7, color: '#10B981', fillColor: '#10B981', fillOpacity: 1
      }).addTo(map).bindPopup('Start');

      L.circleMarker(dest, {
        radius: 7, color: '#EF4444', fillColor: '#EF4444', fillOpacity: 1
      }).addTo(map).bindPopup("${label}");

      map.fitBounds(line.getBounds(), { padding: [24, 24] });
    </script>
  </body>
</html>`;
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 8,
  },
  webviewBox: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#1E1F20",
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
  tileNotice: {
    marginTop: 6,
    fontSize: 12,
    color: "#A0A0A0",
  },
});
