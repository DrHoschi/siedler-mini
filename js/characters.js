// js/characters.js
// Lädt Character-Atlanten + Metadaten und stellt ein API mit Fallback-Kreisen bereit.

export const Characters = {
  manifest: null,            // geladenes manifest.json
  atlases: new Map(),        // key: "role/state" -> {image, frames, meta}
  debug: { placeholder: true },

  async loadAll(base = "assets/characters/") {
    const res = await fetch(`${base}manifest.json?v=${window.BUILD_ID||''}`);
    if (!res.ok) throw new Error(`characters.manifest not found (${res.status})`);
    this.manifest = await res.json();

    const jobs = [];
    for (const role of Object.keys(this.manifest)) {
      const states = this.manifest[role];
      for (const state of Object.keys(states)) {
        const { atlas, json } = states[state];
        jobs.push(this.#loadOne(role, state, base + atlas, base + json));
      }
    }
    await Promise.all(jobs);
    console.log("[characters] loaded:", [...this.atlases.keys()]);
  },

  async #loadOne(role, state, pngUrl, jsonUrl) {
    // JSON (Texture-Atlas-Daten)
    const j = await fetch(jsonUrl + `?v=${window.BUILD_ID||''}`);
    if (!j.ok) { console.warn("[characters] atlas json missing:", jsonUrl); return; }
    const meta = await j.json();

    // PNG
    const img = new Image();
    img.decoding = "async";
    img.src = pngUrl + `?v=${window.BUILD_ID||''}`;
    await img.decode().catch(()=>{}); // nicht crashen wenn’s schief geht

    // Frames erwartetes Format (deine JSONs enthalten gewöhnlich x,y,w,h je Frame)
    // Wir akzeptieren beides:
    //  - {frames: { "name": {x,y,w,h} , ...}}
    //  - {frames: [ {name,x,y,w,h}, ... ] }
    let frames = [];
    if (Array.isArray(meta.frames)) {
      frames = meta.frames;
    } else if (meta.frames && typeof meta.frames === "object") {
      frames = Object.entries(meta.frames).map(([name, r]) => ({ name, ...r }));
    }

    this.atlases.set(`${role}/${state}`, { image: img, frames, meta });
  },

  /**
   * Liefert ein Draw-Objekt (oder null), inklusive Fallback-Kreis.
   */
  getDrawable({ role, state = "idle", frameIndex = 0, colorFallback }) {
    const key = `${role}/${state}`;
    const atlas = this.atlases.get(key);
    if (!atlas || !atlas.image || atlas.frames.length === 0) {
      // Fallback
      return {
        draw(ctx, x, y, size) {
          ctx.save();
          ctx.fillStyle = colorFallback || this.#colorForRole(role, state);
          ctx.beginPath();
          ctx.arc(x + size/2, y + size/2, size*0.4, 0, Math.PI*2);
          ctx.fill();
          ctx.restore();
        }
      };
    }
    const f = atlas.frames[ frameIndex % atlas.frames.length ];
    return {
      draw(ctx, x, y, size) {
        // skaliere Frame nach Tile-Size
        const sx = f.x, sy = f.y, sw = f.w, sh = f.h;
        ctx.drawImage(atlas.image, sx, sy, sw, sh, x, y, size, size);
      }
    };
  },

  #colorForRole(role, state) {
    // einfache, wiedererkennbare Farbpalette (wie gewünscht)
    if (role === "porter")      return state.includes("carry") ? "#8B5A2B" : "#CDAA7D"; // braun / hellbraun
    if (role === "stonecutter") return state.includes("carry") ? "#606770" : "#AEB4BD"; // grau / hellgrau
    if (role === "woodcutter")  return "#2E8B57";   // grünlich
    if (role === "hunter")      return "#556B2F";
    if (role === "builder")     return "#4682B4";
    return "#FF00AA";           // generischer Pink-Fallback
  }
};
