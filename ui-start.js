/*
============================================================
Datei: ui-start.js
Projekt: Siedler-Mini
Version: 16.1.19
Zweck: Startfenster (Map-Auswahl, Start/Neustart, Log-Tools)
============================================================
*/

/* 1) Imports */
// (keine externen Importe – Standalone UI-Modul)

/* 2) Konstanten / Meta */
const UI_START_VERSION = "16.1.19";

/* 3) Hilfsfunktionen */
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
const oneV = v => (v ? `v${String(v).replace(/^v+/,'')}` : "?");

/* 4) Klassen */
// – keine

/* 5) Hauptlogik */
(function initUIStart(){
  (window.CBLog?.ok || console.log)(`[ui-start] Modul geladen (${oneV(UI_START_VERSION)})`);
  window.GameUI = window.GameUI || {};

  window.GameUI.openStartPanel = function(opts = {}) {
    const maps = Array.isArray(opts.maps) && opts.maps.length ? opts.maps : [
      { label: "map-mini.json (16×)", url: "./assets/maps/map-mini.json" }
    ];

    const host = document.getElementById("start-panel");
    if (!host) return (window.CBLog?.warn || console.warn)("[ui-start] #start-panel fehlt.");
    host.innerHTML = "";
    Object.assign(host.style, {
      display:"block", position:"fixed", left:"0", right:"0", bottom:"0",
      margin:"0 auto", zIndex:"1000", maxWidth:"720px", padding:"14px", color:"#e6f2ed"
    });

    const idxV = oneV(window.__cb?.indexVersion || UI_START_VERSION);
    const gameV = window.__cb?.gameVersion ? ` · game ${oneV(window.__cb.gameVersion)}` : '';

    const hdr = el("div", { style:{ fontSize:"22px", fontWeight:"700", marginBottom:"8px" } },
      "City-Builder – Start ",
      el("small", {style:{opacity:.7, fontWeight:"400"}}, ` index ${idxV}${gameV}`)
    );
    const meta = el("div", {style:{opacity:.7, marginBottom:"8px"}}, `unbekannt · dpr: ${Math.round(window.devicePixelRatio||1)}`);

    const mapSelect = el("select", {
      id: "cb-start-map",
      style: {
        appearance:"none", padding:"10px 12px", borderRadius:"10px",
        border:"1px solid rgba(255,255,255,0.08)", background:"rgba(0,0,0,0.25)",
        color:"#e6f2ed", minWidth:"260px", marginRight:"10px"
      }
    }, maps.map(m => { const o = document.createElement("option"); o.value = m.url; o.textContent = m.label || m.url; return o; }));

    const last = localStorage.getItem('cb:lastMap'); if (last) mapSelect.value = last;

    const row1 = el("div", {style:{display:"flex", gap:"10px", alignItems:"center", margin:"10px 0"}},
      el("div", {style:{opacity:.9}}, "Karte:"),
      mapSelect,
      btn("▶︎ Start", { onclick: () => {
        const mapUrl = mapSelect.value;
        localStorage.setItem('cb:lastMap', mapUrl);
        window.dispatchEvent(new CustomEvent('cb:game-start', { detail:{ map: mapUrl }}));
        window.__cb = window.__cb || {}; window.__cb.selectedMap = mapUrl;
        if (window.GameBoot?.start) window.GameBoot.start(mapUrl);
        else if (window.startGame) window.startGame(mapUrl);
        else (window.CBLog?.warn || console.warn)("[ui-start] Kein GameBoot.start()/startGame() gefunden.");
      }}),
      btn("⟳ Neu-Start", { onclick: () => location.reload() })
    );

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
        try { const u = new URL(location.href); u.searchParams.set("v", Date.now().toString()); location.href = u.toString(); }
        catch(e) { location.reload(); }
      }})
    );

    const logbox = el("pre", {
      id:"cb-start-log",
      style:{
        marginTop:"10px", padding:"10px", borderRadius:"10px",
        border:"1px solid rgba(255,255,255,0.08)", background:"rgba(0,0,0,0.25)",
        fontFamily:"ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace",
        fontSize:"13px", color:"#bfe5d6", whiteSpace:"pre-wrap"
      }
    }, `[${new Date().toTimeString().slice(0,8)}] OK UI bereit (index ${idxV})`);

    const frame = el("div", {
      style:{
        background:"linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.35))",
        border:"1px solid rgba(255,255,255,0.08)", borderRadius:"16px",
        padding:"16px", boxShadow:"0 12px 30px rgba(0,0,0,0.25)"
      }
    }, hdr, meta, row1, row2, logbox);

    host.append(frame);
  };

  window.GameUI.onGameStarted = function() {
    const host = document.getElementById("start-panel");
    if (host) host.style.display = "none";
  };

  window.addEventListener('cb:ui-ready', () =>
    (window.CBLog?.ok || console.log)(`[ui-start] cb:ui-ready (${oneV(UI_START_VERSION)})`)
  );
})();
