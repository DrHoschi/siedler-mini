/*
============================================================
Datei: ui-start.js
Projekt: Siedler-Mini
Version: 16.1.19
Zweck: Startfenster (zentriert, mit Hintergrundbild, Map-Auswahl,
       Start/Neustart, Log-Tools) – kompatibel zu GameBoot.start()
============================================================
*/

/* 1) Imports */
// – keine externen Importe

/* 2) Konstanten / Meta */
const UI_START_VERSION = "16.1.19";
const START_BG_URL = "./assets/ui/start-bg.jpeg";   // <- dein Bild

/* 3) Hilfsfunktionen */
// Element-Factory
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
// Standard-Button
function btn(label, attrs = {}) {
  return el("button", {
    class: "cb-btn",
    style: {
      padding: "12px 16px",
      borderRadius: "12px",
      border: "1px solid rgba(255,255,255,0.10)",
      background: "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(0,0,0,0.24))",
      color: "#e6f2ed",
      cursor: "pointer",
      fontSize: "16px"
    },
    ...attrs
  }, label);
}
const oneV = v => (v ? `v${String(v).replace(/^v+/,'')}` : "?");

/* 4) Klassen */
// – nicht benötigt

/* 5) Hauptlogik (Init, UI aufbauen) */
(function initUIStart(){
  (window.CBLog?.ok || console.log)(`[ui-start] Modul geladen (${oneV(UI_START_VERSION)})`);
  window.GameUI = window.GameUI || {};

  // Fullscreen-Hintergrund (einmalig anlegen)
  function ensureStartBackground() {
    let bg = document.getElementById("cb-start-bg");
    if (!bg) {
      bg = document.createElement("div");
      bg.id = "cb-start-bg";
      Object.assign(bg.style, {
        position:"fixed", left:"0", top:"0", right:"0", bottom:"0",
        background: `url('${START_BG_URL}') center/cover no-repeat, #093c2f`,
        zIndex:"900",
        opacity:"0",
        transition:"opacity .25s ease
