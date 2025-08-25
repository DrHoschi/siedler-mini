// v16.0.2 — robuste Auflösung von Atlas-/Bild-URLs + JSONC-Support + Fallback
const URLUtil = {
  // absolute URL aus (evtl. relativer) jsonUrl + imageName bilden
  resolveRelative(imageName, jsonUrl) {
    try {
      const base = new URL(jsonUrl, window.location.href);   // macht jsonUrl absolut
      return new URL(imageName, base.href).href;             // hängt imageName sicher an
    } catch (e) {
      console.warn('[game] URL resolve fallback', { imageName, jsonUrl, e });
      return imageName; // letzte Chance: Browser versucht es relativ zum Dokument
    }
  },

  // Kommentare aus JSON entfernen (// … und /* … */)
  stripJsonComments(text) {
    return text
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|\s)\/\/.*$/gm, '');
  }
};

// ---- Atlas laden (JSON oder JSONC) -----------------------------------------
async function loadTilesetAtlas(atlasUrl) {
  const res = await fetch(atlasUrl);
  if (!res.ok) throw new Error(`fetch ${atlasUrl} → ${res.status}`);
  let txt = await res.text();
  // JSONC erlauben
  try { JSON.parse(txt); } catch { txt = URLUtil.stripJsonComments(txt); }

  const atlas = JSON.parse(txt);

  // Bild-URL robust auflösen; erlaubt auch "tileset.terrain.png" im gleichen Ordner
  const imgField = atlas.meta?.image || atlas.image || null;
  let imgUrl = null;
  if (imgField) {
    imgUrl = URLUtil.resolveRelative(imgField, atlasUrl);
  } else {
    // expliziter Fallback: gleichnamiges PNG neben dem JSON
    imgUrl = URLUtil.resolveRelative('tileset.terrain.png', atlasUrl);
    console.warn('[game] Atlas JSON ohne image-Feld → fallback', imgUrl);
  }
  return { atlas, imgUrl };
}

// Beispiel-Verwendung im Loader:
async function ensureTerrainAtlas() {
  try {
    const { atlas, imgUrl } = await loadTilesetAtlas('./assets/tiles/tileset.terrain.json');
    const img = await loadImage(imgUrl); // deine existierende loadImage(imgUrl)-Funktion verwenden
    BootUI.logOK?.('Tileset (atlas) OK', `${imgUrl} ${img.width}x${img.height}`);
    return { atlas, img };
  } catch (e) {
    BootUI.logWarn?.('Tileset Fallback aktiv', 'kein Atlas → Platzhalter');
    const img = await loadImage('./assets/tex/placeholder64.PNG'); // dein Placeholder
    return { atlas: null, img };
  }
}
