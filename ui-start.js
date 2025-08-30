/*
============================================================
Datei: ui-start.js
Projekt: Siedler-Mini
Version: v16.1.19
Zweck: Startfenster (Map-Auswahl, Start/Neustart, Log-Tools)
============================================================
*/

/* 1) Imports */
// (keine externen Importe – Standalone UI-Modul)

/* 2) Konstanten / Meta */
const UI_START_VERSION = "v16.1.19";

/* 3) Hilfsfunktionen */
// ==============================================
// Hilfsfunktion: DOM-Element erstellen
// ==============================================
function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") n.className = v;
    else if (k === "style") Object.assign(n.style, v);
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  });
  children.flat().forEach(c => n.append(c));
  return n;
}

// ==============================================
// Hilfsfunktion: simple Button
// ==============================================
function btn(label, attrs = {}) {
  return el("button", {
    class: "cb-btn",
    style: {
      padding: "10px 14px",
      borderRadius: "10px",
      border: "1px solid rgba(255,255,255,0.08)",
      background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.2))",
      color: "#e6f2ed",
      cursor: "pointer",
      fontSize: "15px"
    },
    ...attrs
  }, label);
}

/* 4) Klassen */
// (hier nicht benötigt – UI ist funktional umgesetzt)

/* 5) Hauptlogik (Init, Start) */
(function initUIStart(){
  const log = (window.CBLog?.ok || console.log);
  log(`[ui-start] Modul geladen (v${UI_START_VERSION})`);

  // Globales UI-Objekt bereitstellen
  window.GameUI = window.GameUI || {};

  // --------------------------------------------------------
  // API: StartPanel öffnen
  // --------------------------------------------------------
  window.GameUI.openStartPanel = function(opts = {}) {
    const maps = Array.isArray(opts.maps) && opts.maps.length ? opts.maps : [
      { label: "map-mini.json (16×)", url: "./assets/maps/map-mini.json" }
    ];

    const host = document.getElementById("start-panel");
    if (!host) return (window.CBLog?.warn || console.warn)("[ui-start] #start-panel fehlt.");
    host.innerHTML = "";
    host.style.display = "block";
    host.style.position = "fixed";
    host.style.left = "0";
    host.style.right = "0";
    host.style.bottom = "0";
    host.style.margin = "0 auto";
    host.style.zIndex = "1000";
    host.style.maxWidth = "720px";
    host.style.padding = "14px";
    host.style.color = "#e6f2ed";

    // Panel UI
    const hdr = el("div", {
      style: {
        fontSize: "22px",
        fontWeight: "700",
        marginBottom: "8px"
      }
    }, "City-Builder – Start ", el("small", {style:{opacity:.7, fontWeight:"400"}}, ` index v${window.__cb?.indexVersion || "?"} · game.js`));

    const meta = el("div", {style:{opacity:.7, marginBottom:"8px"}}, `unbekannt · dpr: ${Math.round(window.devicePixelRatio||1)}`);

    // Map Auswahl
    const mapSelect = el("select", {
      id: "cb-start-map",
      style: {
        appearance: "none",
        padding: "10px 12px",
        borderRadius: "10px",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.25)",
        color: "#e6f2ed",
        minWidth: "260px",
        marginRight: "10px"
      }
    }, maps.map(m => {
      const o = document.createElement("option");
      o.value = m.url; o.textContent = m.label || m.url;
      return o;
    }));

    const row1 = el("div", {style:{display:"flex", gap:"10px", alignItems:"center", margin:"10px 0"}},
      el("div", {style:{opacity:.9}}, "Karte:"),
      mapSelect,
      btn("▶︎ Start", { onclick: () => {
        const mapUrl = mapSelect.value;
        window.dispatchEvent(new CustomEvent('cb:game-start', { detail:{ map: mapUrl }}));
        window.__cb = window.__cb || {};
        window.__cb.selectedMap = mapUrl;
        // Boot/Spielstart anstoßen
        if (window.GameBoot?.start) {
          window.GameBoot.start(mapUrl);
        } else if (window.startGame) {
          window.startGame(mapUrl);
        } else {
          (window.CBLog?.warn || console.warn)("[ui-start] Kein GameBoot.start()/startGame() gefunden.");
        }
      }}),
      btn("⟳ Neu-Start", { onclick: () => location.reload() })
    );

    // Tools
    const row2 = el("div", {style:{display:"flex", gap:"10px", margin:"10px 0"}},
      btn("📋 Log kopieren", { onclick: () => {
        try {
          const txt = (window.CBLog?.dump && window.CBLog.dump()) || (window.__cbLogBuffer || []).join("\n") || "Kein Log vorhanden.";
          navigator.clipboard.writeText(txt);
          (window.CBLog?.ok || console.log)("[ui-start] Log in Zwischenablage.");
        } catch(e) {
          (window.CBLog?.warn || console.warn)("[ui-start] Clipboard fehlgeschlagen.");
        }
      }}),
      btn("🧹 Cache-Booster", { onclick: () => {
        try {
          const u = new URL(location.href);
          u.searchParams.set("v", Date.now().toString());
          location.href = u.toString();
        } catch(e) {
          location.reload();
        }
      }})
    );

    // Fußzeile Log-Zeile
    const logbox = el("pre", {
      id: "cb-start-log",
      style:{
        marginTop:"10px",
        padding:"10px",
        borderRadius:"10px",
        border:"1px solid rgba(255,255,255,0.08)",
        background:"rgba(0,0,0,0.25)",
        fontFamily:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize:"13px",
        color:"#bfe5d6",
        whiteSpace:"pre-wrap"
      }
    }, `[${new Date().toTimeString().slice(0,8)}] OK UI bereit (index v${window.__cb?.indexVersion || "?"})`);

    const frame = el("div", {
      style:{
        background:"linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.35))",
        border:"1px solid rgba(255,255,255,0.08)",
        borderRadius:"16px",
        padding:"16px",
        boxShadow:"0 12px 30px rgba(0,0,0,0.25)"
      }
    }, hdr, meta, row1, row2, logbox);

    host.append(frame);
  };

  // --------------------------------------------------------
  // API: auf Spielstart reagieren (Panel schließen)
  // --------------------------------------------------------
  window.GameUI.onGameStarted = function() {
    const host = document.getElementById("start-panel");
    if (host) host.style.display = "none";
  };

  // Auto-Open wenn UI ready
  window.addEventListener('cb:ui-ready', () => {
    // Öffnen erfolgt in index.html bereits – wir loggen nur
    (window.CBLog?.ok || console.log)(`[ui-start] cb:ui-ready empfangen (v${UI_START_VERSION})`);
  });

})();
 
/* 6) Exports */
// (keine – API hängt an window.GameUI)
