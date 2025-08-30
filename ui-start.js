/*
============================================================
Datei: ui-start.js
Projekt: Siedler-Mini
Version: 16.1.19
Zweck: Startfenster (zentriert, CSS in ui-start.css), robustes Auto-Open
============================================================
*/

/* 1) Imports */ // keine

/* 2) Konstanten / Meta */
const UI_START_VERSION = "16.1.19";
const START_BG_ID = "cb-start-bg";
const START_BG_URL = "./assets/ui/start-bg.jpeg";

/* 3) Helpers */
const oneV = v => (v ? `v${String(v).replace(/^v+/, "")}` : "?");
function el(tag, attrs = {}, ...children){
  const n = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v])=>{
    if (k === "class") n.className = v;
    else if (k === "style") Object.assign(n.style, v);
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  });
  children.flat().forEach(c => n.append(c));
  return n;
}
function btn(label, attrs={}){ return el("button", { class:"cb-btn", ...attrs }, label); }

/* 4) Hauptlogik */
(function initUIStart(){
  (window.CBLog?.ok || console.log)(`[ui-start] Modul geladen (${oneV(UI_START_VERSION)})`);
  window.GameUI = window.GameUI || {};

  function ensureBg(){
    let bg = document.getElementById(START_BG_ID);
    if (!bg){
      bg = document.createElement("div");
      bg.id = START_BG_ID;
      // Fallback, falls CSS nicht geladen ist
      bg.style.background = `url('${START_BG_URL}') center/cover no-repeat, #093c2f`;
      document.body.append(bg);
      // CSS animiert die Opacity; fallback:
      bg.style.opacity = "1";
    }
  }
  function removeBg(){
    const bg = document.getElementById(START_BG_ID);
    if (bg){ bg.remove(); }
  }

  window.GameUI.openStartPanel = function(opts = {}){
    ensureBg();

    const maps = Array.isArray(opts.maps) && opts.maps.length ? opts.maps : [
      { label: "map-mini.json (16×)", url: "./assets/maps/map-mini.json" }
    ];

    const host = document.getElementById("start-panel");
    if (!host){ (window.CBLog?.warn || console.warn)("[ui-start] #start-panel fehlt."); return; }

    // WICHTIG: falls index.html noch display:none hatte → sichtbar machen
    host.style.display = "flex";

    host.innerHTML = "";

    const idxV = oneV(window.__cb?.indexVersion || UI_START_VERSION);
    const gameV = window.__cb?.gameVersion ? ` · game ${oneV(window.__cb.gameVersion)}` : "";

    const header = el("div", { class:"cb-start-header" },
      el("h1", {}, "City-Builder – Start"),
      el("small", {}, `index ${idxV}${gameV} · dpr: ${Math.round(window.devicePixelRatio||1)}`)
    );

    const card = el("div", { class:"cb-start-card" });

    const label = el("label", {}, "Karte:");
    const select = el("select", { id:"cb-start-map" },
      maps.map(m => { const o = document.createElement("option"); o.value = m.url; o.textContent = m.label || m.url; return o; })
    );
    const last = localStorage.getItem("cb:lastMap"); if (last) select.value = last;

    const rowMain = el("div", { class:"cb-start-row" },
      btn("▶︎ Start", { onclick: () => {
        const mapUrl = select.value;
        localStorage.setItem("cb:lastMap", mapUrl);
        window.__cb = window.__cb || {}; window.__cb.selectedMap = mapUrl;
        window.dispatchEvent(new CustomEvent("cb:game-start", { detail:{ map:mapUrl }}));
        if (window.GameBoot?.start) window.GameBoot.start(mapUrl);
        else if (window.startGame) window.startGame(mapUrl);
        else (window.CBLog?.warn || console.warn)("[ui-start] Kein GameBoot.start()/startGame() gefunden.");
      }}),
      btn("⟳ Neu-Start", { onclick: () => location.reload() })
    );

    const rowTools = el("div", { class:"cb-start-row" },
      btn("🧹 Cache-Booster", { onclick: () => {
        try { const u = new URL(location.href); u.searchParams.set("v", Date.now().toString()); location.href = u.toString(); }
        catch(e){ location.reload(); }
      }}),
      btn("📋 Log kopieren", { onclick: () => {
        try {
          const txt = (window.CBLog?.dump && window.CBLog.dump()) || (window.__cbLogBuffer || []).join("\n") || "Kein Log vorhanden.";
          navigator.clipboard.writeText(txt);
          (window.CBLog?.ok || console.log)("[ui-start] Log in Zwischenablage.");
        } catch(e) { (window.CBLog?.warn || console.warn)("[ui-start] Clipboard fehlgeschlagen."); }
      }})
    );

    const logline = el("pre", { id:"cb-start-log" },
      `[${new Date().toTimeString().slice(0,8)}] OK UI bereit (index ${idxV})`
    );

    card.append(label, select, rowMain, rowTools, logline);
    host.append(header, card);
  };

  window.GameUI.onGameStarted = function(){
    const host = document.getElementById("start-panel");
    if (host) host.style.display = "none";
    removeBg();
  };

  // Failsafe: wenn index das Panel nicht explizit öffnet, hier automatisch
  window.addEventListener("cb:ui-ready", () => {
    (window.CBLog?.ok || console.log)(`[ui-start] cb:ui-ready (${oneV(UI_START_VERSION)})`);
    try {
      const host = document.getElementById("start-panel");
      const isVisible = host && host.style.display !== "none" && host.childElementCount > 0;
      if (!isVisible) {
        window.GameUI.openStartPanel({
          maps: [{ label: "map-mini.json (16×)", url: "./assets/maps/map-mini.json" }]
        });
      }
    } catch(e) {
      (window.CBLog?.warn || console.warn)("[ui-start] Auto-Open fehlgeschlagen:", e);
    }
  });
})();
