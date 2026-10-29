import { colors, spacing, typography } from '@theme/index';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { boundsFor, fitKeyFor, fitPadding, NO_PATH, pointsToFit, ZOOM_OUT_FACTOR, type MapImplProps } from './mapGeometry';

// The package types its extra-props generic as `undefined` by default, which
// turns every prop into `never` under current React types. Pin it to {} (types only).
const MapWebView = WebView as typeof WebView<{}>;

const DEFAULT_INSETS = { top: 24, bottom: 24 };
const MAPLIBRE = 'https://unpkg.com/maplibre-gl@4.7.1/dist';
const LAND = '#F8F4F0'; // Liberty's land colour, shown while tiles load

// MapLibre page on OpenFreeMap's Liberty style (full colour: parks, water, roads). The app drives it with
// window.binbin.update(...); it reports back over postMessage:
// 'ready', 'pin' (a tap), 'error' (MapLibre missing, i.e. offline, or no WebGL).
const HTML = `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="${MAPLIBRE}/maplibre-gl.css">
<style>
  html, body, #map { margin: 0; height: 100%; background: ${LAND}; }
  /* No 'position' here: MapLibre places markers with its own position: absolute. */
  .hub-pin { width: 30px; height: 42px; }
  .hub-label {
    position: absolute; bottom: 46px; left: 50%; transform: translateX(-50%);
    white-space: nowrap; max-width: 180px; overflow: hidden; text-overflow: ellipsis;
    font: 600 11px -apple-system, Roboto, sans-serif; color: ${colors.textPrimary};
    background: #fff; border-radius: 8px; padding: 2px 8px; box-shadow: 0 1px 4px rgba(0,0,0,.15);
  }
  .here {
    width: 14px; height: 14px; border-radius: 50%; background: #4285F4;
    border: 2px solid #fff; box-shadow: 0 0 0 8px rgba(66,133,244,.2);
  }
  .hub-pin:focus { outline: 2px solid ${colors.primary}; outline-offset: 2px; }
  /* Map credits: a faint one-liner that never pops open by itself; (i) shows the full text.
     OSM's attribution guideline wants the credit visible without a tap, so it can't be hidden entirely. */
  #credits {
    position: absolute; left: 8px; bottom: 8px; z-index: 2; display: flex; align-items: center; gap: 4px;
    font: 10px -apple-system, Roboto, sans-serif; color: #666;
  }
  #credits span { background: rgba(255,255,255,.75); border-radius: 8px; padding: 1px 6px; }
  #credits .full { display: none; max-width: 230px; }
  #credits.open .full { display: inline; }
  #credits.open .short { display: none; }
  #credits button {
    width: 18px; height: 18px; border-radius: 9px; border: 0; padding: 0; background: rgba(255,255,255,.9);
    font: italic 600 11px Georgia, serif; color: #444; box-shadow: 0 1px 2px rgba(0,0,0,.2);
  }
</style>
</head>
<body>
<div id="map"></div>
<div id="credits">
  <button aria-label="Map credits">i</button>
  <span class="short">&copy; OpenStreetMap</span>
  <span class="full">OpenFreeMap &copy; OpenMapTiles &middot; Data from &copy; OpenStreetMap contributors</span>
</div>
<script src="${MAPLIBRE}/maplibre-gl.js"></script>
<script>
(function () {
  function post(msg) { window.ReactNativeWebView.postMessage(JSON.stringify(msg)); }

  var map;
  try {
    map = new maplibregl.Map({
      container: 'map',
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [134, -27],
      zoom: 3,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false
    });
  } catch (e) {
    post({ type: 'error' });
    return;
  }
  map.touchZoomRotate.disableRotation();

  var credits = document.getElementById('credits');
  credits.querySelector('button').addEventListener('click', function (e) {
    e.stopPropagation();
    credits.classList.toggle('open');
  });
  map.on('click', function () { credits.classList.remove('open'); });
  map.on('dragstart', function () { credits.classList.remove('open'); });

  var markers = [];
  var lastFocusSeq = null;
  var route = { type: 'FeatureCollection', features: [] };
  map.on('load', function () {
    map.addSource('route', { type: 'geojson', data: route });
    map.addLayer({
      id: 'route', type: 'line', source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '${colors.primary}', 'line-width': 5, 'line-opacity': 0.9 }
    });
  });

  function pinEl(p, selected) {
    var fill = selected ? '${colors.primary}' : '${colors.dark}';
    var el = document.createElement('div');
    el.className = 'hub-pin';
    el.style.zIndex = selected ? '2' : '1';
    // Lets VoiceOver/TalkBack reach this div inside the WebView.
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', p.label + (selected ? ' (selected)' : ''));
    // Pin with a small white building (windows + door cut out in the pin colour).
    el.innerHTML = '<svg width="30" height="42" viewBox="-1 -1 30 42">'
      + '<path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.3 21.7 0 14 0z" fill="' + fill + '" stroke="#fff" stroke-width="2"/>'
      + '<rect x="8.5" y="7" width="11" height="13" rx="1" fill="#fff"/>'
      + '<g fill="' + fill + '"><rect x="10.5" y="9" width="2.5" height="2.5"/><rect x="15" y="9" width="2.5" height="2.5"/>'
      + '<rect x="10.5" y="13" width="2.5" height="2.5"/><rect x="15" y="13" width="2.5" height="2.5"/><rect x="12.75" y="16.5" width="2.5" height="3.5"/></g>'
      + '</svg>';
    if (selected) {
      var label = document.createElement('div');
      label.className = 'hub-label';
      label.textContent = p.label;
      el.appendChild(label);
    }
    el.addEventListener('click', function (e) {
      e.stopPropagation();
      post({ type: 'pin', id: p.id });
    });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        post({ type: 'pin', id: p.id });
      }
    });
    return el;
  }

  window.binbin = {
    // The WebView can change size after the map is drawn (on Android the keyboard
    // shrinks screens behind it too), so MapLibre has to re-measure its canvas.
    resize: function () { map.resize(); },
    update: function (d) {
      markers.forEach(function (m) { m.remove(); });
      markers = [];
      // Keep the credits above whatever card covers the bottom of the map.
      credits.style.bottom = Math.max(8, d.insets.bottom - 8) + 'px';

      route = {
        type: 'FeatureCollection',
        features: d.path.length > 1
          ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: d.path } }]
          : []
      };
      var source = map.getSource('route');
      if (source) source.setData(route); // otherwise 'load' adds it

      if (d.here) {
        var dot = document.createElement('div');
        dot.className = 'here';
        markers.push(new maplibregl.Marker({ element: dot, anchor: 'center' }).setLngLat(d.here).addTo(map));
      }
      d.pins.forEach(function (p) {
        markers.push(new maplibregl.Marker({ element: pinEl(p, p.id === d.selectedId), anchor: 'bottom' })
          .setLngLat([p.lng, p.lat]).addTo(map));
      });

      if (d.fit) {
        map.fitBounds([[d.fit.minLng, d.fit.minLat], [d.fit.maxLng, d.fit.maxLat]], { padding: d.padding, maxZoom: 17 });
      }
      // Recenter button. After the fit so it wins; offset centres the user in the
      // band between the overlays. (Not 'padding': easeTo would keep it for later fits.)
      if (d.focus && d.focus.seq !== lastFocusSeq) {
        lastFocusSeq = d.focus.seq;
        map.easeTo({
          center: d.focus.center,
          // Street level never zooms out a closer view; a zoom-out step is an exact level.
          zoom: d.focus.zoom === null ? Math.max(map.getZoom(), 15) : d.focus.zoom,
          offset: [0, (d.padding.top - d.padding.bottom) / 2],
          duration: 600
        });
      }
    }
  };
  post({ type: 'ready' });
})();
</script>
</body>
</html>`;

// Module-level so re-renders never hand the WebView a "new" source and reload it.
const SOURCE = { html: HTML };

// FR-68/71: OpenStreetMap data (OpenFreeMap's Liberty style) via MapLibre in
// a WebView. Free, no API key, no usage limits, and runs inside Expo Go, which
// is why Android uses it instead of Google Maps. MapCanvas decides when this is used.
export function OsmMap({ pins, here, path = NO_PATH, selectedId, onPinPress, insets = DEFAULT_INSETS, focus }: MapImplProps) {
  const webRef = useRef<WebView<{}>>(null);
  // Bumped on every 'ready', so a reloaded page gets redrawn and refitted.
  const [loads, setLoads] = useState(0);
  const [failed, setFailed] = useState(false);
  const lastFitKey = useRef<string | null>(null);

  const fitKey = fitKeyFor(pins, path, here);

  useEffect(() => {
    if (loads === 0) return;
    const fit = lastFitKey.current !== fitKey ? boundsFor(pointsToFit(pins, here, path)) : null;
    lastFitKey.current = fitKey;
    // MapLibre wants [lng, lat].
    const payload = {
      pins: pins.map((p) => ({ id: p.id, lat: p.coordinate.latitude, lng: p.coordinate.longitude, label: p.label })),
      selectedId: selectedId ?? null,
      here: here ? [here.longitude, here.latitude] : null,
      path: path.map((p) => [p.longitude, p.latitude]),
      fit,
      focus: focus
        ? {
            center: [focus.coordinate.longitude, focus.coordinate.latitude],
            seq: focus.seq,
            zoom: focus.zoomOut ? 15 - Math.log2(ZOOM_OUT_FACTOR) * focus.zoomOut : null,
          }
        : null,
      padding: fitPadding(insets),
      insets,
    };
    webRef.current?.injectJavaScript(`window.binbin && window.binbin.update(${JSON.stringify(payload)}); true;`);
  }, [loads, pins, here, path, selectedId, fitKey, insets, focus]);

  const onMessage = (event: WebViewMessageEvent) => {
    let msg: { type?: string; id?: string };
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'ready') {
      lastFitKey.current = null;
      setFailed(false);
      setLoads((n) => n + 1);
    } else if (msg.type === 'pin' && msg.id) {
      onPinPress?.(msg.id);
    } else if (msg.type === 'error') {
      setFailed(true);
    }
  };

  return (
    <View
      style={styles.container}
      onLayout={() => webRef.current?.injectJavaScript('window.binbin && window.binbin.resize(); true;')}
    >
      <MapWebView
        ref={webRef}
        style={styles.web}
        originWhitelist={['*']}
        source={SOURCE}
        onMessage={onMessage}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        setSupportMultipleWindows={false}
      />
      {failed && (
        <View style={styles.offline} pointerEvents="none">
          <Text style={styles.offlineText}>Map needs an internet connection</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: LAND },
  web: { flex: 1, backgroundColor: LAND },
  offline: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  offlineText: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
});
