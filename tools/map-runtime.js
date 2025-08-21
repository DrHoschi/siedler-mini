// ───────────────────────────────────────────────────────────────────────────────
// Query‑Param‑Unterstützung für Map-Auswahl
// Nutzt ?map=assets/maps/deine-map.json  (relativ zur Seite)
// Fallback bleibt: assets/maps/map-pro.json
// Optional: ?v=123 (Cache-Busting) wird automatisch angehangen, wenn vorhanden.
// ───────────────────────────────────────────────────────────────────────────────
function resolveMapUrlFromQuery(defaultPath = 'assets/maps/map-pro.json') {
  const q = new URLSearchParams(location.search);
  let raw = q.get('map'); // z.B. "assets/maps/map-demo.json"

  // Kein Param? → Fallback
  if (!raw || !raw.trim()) return defaultPath;

  // Nur relative Pfade innerhalb des Repos zulassen (Sicherheits-/CORS-Gründe)
  // Erlaubt: "assets/maps/..." oder "maps/..."
  raw = raw.trim();
  const allowed =
    raw.startsWith('assets/maps/') ||
    raw.startsWith('./assets/maps/') ||
    raw.startsWith('maps/') ||
    raw.startsWith('./maps/');

  const safe = allowed ? raw.replace(/^\.\//, '') : defaultPath;

  // Optionales Cache-Busting übernehmen
  const bust = (q.get('v') || q.get('bust') || '').trim();
  const sep = safe.includes('?') ? '&' : '?';
  return bust ? `${safe}${sep}v=${encodeURIComponent(bust)}` : safe;
}

// Beispiel-Verwendung an der Stelle, wo ihr bisher die feste URL hattet:
const MAP_URL = resolveMapUrlFromQuery('assets/maps/map-pro.json');

// Logging fürs Overlay/Debug:
console.log('[game] map url =', MAP_URL);
