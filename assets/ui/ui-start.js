/* ===========================================================
Datei: assets/ui/ui-start.js
Projekt: Siedler-Mini
Version: 16.1.19
Zweck : Startfenster (Logik) – Styles liegen in ui-start.css
Hinweis: ES5-kompatibel (keine modernen Syntaxfeatures)
=========================================================== */
(function () {
  'use strict';

  // --- Meta / Utilities ---
  var UI_START_VERSION = "16.1.19";
  var START_BG_ID = "cb-start-bg";
  var START_BG_URL = "./assets/ui/start-bg.jpeg";

  function oneV(v) {
    if (!v && v !== 0) return "?";
    v = String(v).replace(/^v+/, "");
    return "v" + v;
  }

  function el(tag, attrs) {
    var n = document.createElement(tag);
    attrs = attrs || {};
    for (var k in attrs) if (attrs.hasOwnProperty(k)) {
      var v = attrs[k];
      if (k === "class") n.className = v;
      else if (k.indexOf("on") === 0 && typeof v === "function") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    for (var i = 2; i < arguments.length; i++) {
      var child = arguments[i];
      if (child == null) continue;
      if (Array.isArray(child)) for (var j = 0; j < child.length; j++) n.appendChild(child[j]);
      else if (child.nodeType) n.appendChild(child);
      else n.appendChild(document.createTextNode(String(child)));
    }
    return n;
  }

  function btn(label, attrs) {
    return el("button", merge({ "class": "cb-btn" }, attrs || {}), label);
  }

  function merge(a, b) {
    var o = {};
    for (var k in a) if (a.hasOwnProperty(k)) o[k] = a[k];
    for (var k2 in b) if (b.hasOwnProperty(k2)) o[k2] = b[k2];
    return o;
  }

  function logOk(msg){ (window.CBLog && window.CBLog.ok ? window.CBLog.ok : console.log)(msg); }
  function logWarn(msg){ (window.CBLog && window.CBLog.warn ? window.CBLog.warn : console.warn)(msg); }

  // --- Hintergrund-Ebene ---
  function ensureBg() {
    var bg = document.getElementById(START_BG_ID);
    if (!bg) {
      bg = document.createElement("div");
      bg.id = START_BG_ID;
      // Fallback-Style (eigentlich macht ui-start.css das Styling)
      bg.style.position = "fixed";
      bg.style.left = "0"; bg.style.top = "0"; bg.style.right = "0"; bg.style.bottom = "0";
      bg.style.background = "url('" + START_BG_URL + "') center/cover no-repeat, #093c2f";
      bg.style.zIndex = "900";
      bg.style.opacity = "1";
      document.body.appendChild(bg);
    }
  }
  function removeBg() {
    var bg = document.getElementById(START_BG_ID);
    if (bg) bg.parentNode.removeChild(bg);
  }

  // --- API / GameUI ---
  if (!window.GameUI) window.GameUI = {};

  window.GameUI.openStartPanel = function (opts) {
    opts = opts || {};
    ensureBg();

    var maps = (opts.maps && opts.maps.length) ? opts.maps : [
      { label: "map-mini.json (16×)", url: "./assets/maps/map-mini.json" }
    ];

    var host = document.getElementById("start-panel");
    if (!host) { logWarn("[ui-start] #start-panel fehlt."); return; }

    // Sichtbar machen (falls inline display:none gesetzt war)
    host.style.display = "flex";
    host.innerHTML = "";

    var idxV = oneV((window.__cb && window.__cb.indexVersion) || UI_START_VERSION);
    var gameV = (window.__cb && window.__cb.gameVersion) ? (" · game " + oneV(window.__cb.gameVersion)) : "";
    var dpr = Math.round((window.devicePixelRatio || 1));

    // Header
    var header = el("div", { "class": "cb-start-header" },
      el("h1", {}, "City-Builder – Start"),
      el("small", {}, "index " + idxV + gameV + " · dpr: " + dpr)
    );

    // Map-Auswahl
    var select = el("select", { id: "cb-start-map" });
    for (var i = 0; i < maps.length; i++) {
      var m = maps[i];
      var o = document.createElement("option");
      o.value = m.url;
      o.textContent = m.label || m.url;
      select.appendChild(o);
    }
    var last = null;
    try { last = localStorage.getItem("cb:lastMap"); } catch (e) {}
    if (last) select.value = last;

    var label = el("label", { "for": "cb-start-map" }, "Karte:");

    // Buttons
    var startBtn = btn("▶︎ Start", {
      onclick: function () {
        var mapUrl = select.value;
        try { localStorage.setItem("cb:lastMap", mapUrl); } catch (e) {}
        if (!window.__cb) window.__cb = {};
        window.__cb.selectedMap = mapUrl;
        // Event für ggf. andere Module
        try { window.dispatchEvent(new CustomEvent("cb:game-start", { detail: { map: mapUrl } })); } catch(e){}
        if (window.GameBoot && typeof window.GameBoot.start === "function") window.GameBoot.start(mapUrl);
        else if (typeof window.startGame === "function") window.startGame(mapUrl);
        else logWarn("[ui-start] Kein GameBoot.start()/startGame() gefunden.");
      }
    });

    var resetBtn = btn("⟳ Neu-Start", { onclick: function(){ location.reload(); } });

    var cacheBtn = btn("🧹 Cache-Booster", {
      onclick: function () {
        try {
          var u = new URL(location.href);
          u.searchParams.set("v", Date.now().toString());
          location.href = u.toString();
        } catch (e) { location.reload(); }
      }
    });

    var copyBtn = btn("📋 Log kopieren", {
      onclick: function () {
        try {
          var txt = (window.CBLog && window.CBLog.dump ? window.CBLog.dump() : null);
          if (!txt) {
            var buf = (window.__cbLogBuffer || []);
            txt = buf.length ? buf.join("\n") : "Kein Log vorhanden.";
          }
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(txt);
            logOk("[ui-start] Log in Zwischenablage.");
          } else {
            // Fallback
            var ta = document.createElement("textarea");
            ta.value = txt;
            document.body.appendChild(ta);
            ta.select(); document.execCommand("copy");
            document.body.removeChild(ta);
            logOk("[ui-start] Log in Zwischenablage (fallback).");
          }
        } catch (e) { logWarn("[ui-start] Clipboard fehlgeschlagen."); }
      }
    });

    var rowMain  = el("div", { "class": "cb-start-row" }, startBtn, resetBtn);
    var rowTools = el("div", { "class": "cb-start-row" }, cacheBtn, copyBtn);

    var logline = el("pre", { id: "cb-start-log" },
      "[" + new Date().toTimeString().slice(0, 8) + "] OK UI bereit (index " + idxV + ")"
    );

    var card = el("div", { "class": "cb-start-card" }, label, select, rowMain, rowTools, logline);

    host.appendChild(header);
    host.appendChild(card);

    logOk("[ui-start] Panel geöffnet (" + idxV + ")");
  };

  window.GameUI.onGameStarted = function () {
    var host = document.getElementById("start-panel");
    if (host) host.style.display = "none";
    removeBg();
  };

  // Fallback: Auto-Open beim UI-Ready
  window.addEventListener("cb:ui-ready", function () {
    logOk("[ui-start] cb:ui-ready (" + oneV(UI_START_VERSION) + ")");
    try {
      var host = document.getElementById("start-panel");
      var isVisible = !!(host && host.style.display !== "none" && host.childElementCount > 0);
      if (!isVisible) {
        window.GameUI.openStartPanel({
          maps: [{ label: "map-mini.json (16×)", url: "./assets/maps/map-mini.json" }]
        });
      }
    } catch (e) { logWarn("[ui-start] Auto-Open fehlgeschlagen: " + (e && e.message ? e.message : e)); }
  });

  // Modul-Load Log
  logOk("[ui-start] Modul geladen (" + oneV(UI_START_VERSION) + ")");
})();
