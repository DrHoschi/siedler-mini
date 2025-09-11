/* game.bootstrap.js — v17.8.6 (stabil) */
(function () {
  "use strict";

  const MOD = "[bootstrap]";
  const ok   = (window.CBLog?.ok   ?? console.log).bind(console, MOD);
  const info = (window.CBLog?.info ?? console.log).bind(console, MOD);
  const warn = (window.CBLog?.warn ?? console.warn).bind(console, MOD);
  const err  = (window.CBLog?.err  ?? console.error).bind(console, MOD);

  // ───────────────────────── helpers ─────────────────────────
  const $ = (sel, root = document) => root.querySelector(sel);
  const fire = (evt, detail) => { try { window.dispatchEvent(new CustomEvent(evt, { detail })); } catch(_) {} };

  function startRenderLoop() {
    let alive = true;
    function tick() {
      if (!alive) return;
      try { fire("cb:render-frame"); } finally { requestAnimationFrame(tick); }
    }
    requestAnimationFrame(tick);
    return () => { alive = false; };
  }

  // alles, was die Map verdunkeln/verdecken könnte, entsorgen
  function nukeOverlays() {
    ["#inspector-fallback", "#start-panel"].forEach(sel => {
      const el = $(sel);
      if (el && el.parentNode) { el.remove(); }
    });
  }

  // Tileset-Erreichbarkeit testen (rein informativ)
  async function pingTileset(url = "assets/tiles/tileset.terrain.png") {
    try {
      const img = new Image();
      const p = new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      img.decoding = "async";
      img.referrerPolicy = "no-referrer";
      img.src = `${url}?t=${Date.now()}`; // Cache brechen
      await p;
      info("Tileset erreichbar (%s)", url);
    } catch (e) {
      warn("Tileset nicht erreichbar → %s", e?.message || e);
    }
  }

  // Map gemäß data-map am Canvas holen (für Logging + Fallback-Load)
  async function ensureMapReachable(canvas) {
    const url = canvas?.dataset?.map || canvas?.getAttribute("data-map") || "assets/maps/map-mini.json";
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      info("Map geprüft/geladen: %s", url);
      return { url, data };
    } catch (e) {
      err("Map konnte nicht geladen werden → %s", (e && e.message) || e);
      return null;
    }
  }

  // ───────────────────────── boot flow ───────────────────────
  async function startGame() {
    const canvas = $("#game");
    if (!canvas) { err("Canvas #game fehlt"); return; }

    // 1) evtl. dunkle Overlays sichern entfernen
    nukeOverlays();

    // 2) Warm-Up: Tileset kurz pingen (nur Info), Map prüfen/laden
    pingTileset().catch(() => {}); // nicht blockierend
    const map = await ensureMapReachable(canvas);

    // 3) Engine starten – beide Welten (neu/legacy) unterstützen
    try {
      if (window.CBGame?.start) {
        await window.CBGame.start(canvas, map?.url ?? "");
        ok("ready (CBGame.start)");
      } else if (window.Game?.start) {
        await window.Game.start(canvas, map?.url ?? "");
        ok("ready (legacy Game.start)");
      } else if (window.Game?.Map?.load && map?.data) {
        await window.Game.Map.load(map.data);
        ok("Map in Engine geladen (Game.Map.load)");
      } else {
        warn("Keine bekannte start()-API gefunden – nur Render-Ticker läuft.");
      }
    } catch (e) {
      err("Engine-Start fehlgeschlagen: %s", e?.message || e);
    }

    // 4) Render-Ticker in jedem Fall anschieben (core.render.js hört auf cb:render-frame)
    startRenderLoop();

    // kleiner „Kick“, falls eine Engine-Tick-Funktion existiert
    try { window.Game?.Engine?.tick?.(); } catch(_) {}

    // Signal für Tools/Inspector
    fire("cb:map-ready");
  }

  // ───────────────────────── init ────────────────────────────
  (function init() {
    ok("Modul geladen (v17.8.6)");
    // Hauptpfad: UI feuert cb:game-start → dann starten
    window.addEventListener("cb:game-start", startGame, { once: true });

    // Safety: optionaler Autostart (z. B. für Developer-Previews)
    if (window.__cb?.autostart === true) startGame();
  })();
})();
