/* 
============================================================
Datei: assets/ui/ui-start.js
Projekt: Siedler-Mini
Version: 16.1.21
Zweck : Startfenster (Logik) – Styles in ui-start.css
Hinweis: ES5-kompatibel (keine modernen Syntaxfeatures)
============================================================
*/
(function () {
  'use strict';
  // Diagnose-Flag: Datei betreten
  window.__uiStartEntered = true;

  try {
    /* 2) Konstanten / Meta */
    var UI_START_VERSION = "16.1.21";
    var START_BG_ID = "cb-start-bg";
    var START_BG_URL = "./assets/ui/start-bg.jpeg";

    /* 3) Hilfsfunktionen */
    function oneV(v) { if (!v && v !== 0) return "?"; v = String(v).replace(/^v+/, ""); return "v" + v; }
    function el(tag, attrs) {
      var n = document.createElement(tag); attrs = attrs || {};
      for (var k in attrs) if (attrs.hasOwnProperty(k)) {
        var v = attrs[k];
        if (k === "class") n.className = v;
        else if (k.indexOf("on") === 0 && typeof v === "function") n.addEventListener(k.slice(2), v);
        else n.setAttribute(k, v);
      }
      for (var i = 2; i < arguments.length; i++) {
        var child = arguments[i]; if (child == null) continue;
        if (Array.isArray(child)) { for (var j = 0; j < child.length; j++) n.appendChild(child[j]); }
        else if (child.nodeType) n.appendChild(child);
        else n.appendChild(document.createTextNode(String(child)));
      }
      return n;
    }
    function btn(label, attrs) { var b = el("button", { "class": "cb-btn" }, label); if (attrs) for (var k in attrs) if (attrs.hasOwnProperty(k)) b[k] = attrs[k]; return b; }
    function logOk(msg){ (window.CBLog && window.CBLog.ok ? window.CBLog.ok : console.log)(msg); }
    function logWarn(msg){ (window.CBLog && window.CBLog.warn ? window.CBLog.warn : console.warn)(msg); }

    /* 4) Hintergrundebene */
    function ensureBg() {
      var bg = document.getElementById(START_BG_ID);
      if (!bg) {
        bg = document.createElement("div"); bg.id = START_BG_ID;
        // Fallback-Style (ui-start.css macht das Styling eigentlich)
        bg.style.background = "url('" + START_BG_URL + "') center/cover no-repeat, #093c2f";
        bg.style.position = "fixed"; bg.style.left="0"; bg.style.top="0"; bg.style.right="0"; bg.style.bottom="0";
        bg.style.zIndex = "900"; bg.style.opacity = "1";
        document.body.appendChild(bg);
      }
    }
    function removeBg() { var bg = document.getElementById(START_BG_ID); if (bg && bg.parentNode) bg.parentNode.removeChild(bg); }

    /* 5) Hauptlogik */
    if (!window.GameUI) window.GameUI = {};

    window.GameUI.openStartPanel = function (opts) {
      opts = opts || {};
      ensureBg();

      var maps = (opts.maps && opts.maps.length) ? opts.maps : [
        { label: "map-mini.json (16×)", url: "./assets/maps/map-mini.json" }
      ];

      var host = document.getElementById("start-panel");
      if (!host) { logWarn("[ui-start] #start-panel fehlt."); return; }

      host.style.display = "flex";
      host.innerHTML = "";

      var idxV = oneV((window.__cb && window.__cb.indexVersion) || UI_START_VERSION);
      var gameV = (window.__cb && window.__cb.gameVersion) ? (" · game " + oneV(window.__cb.gameVersion)) : "";
      var dpr = Math.round((window.devicePixelRatio || 1));

      var header = el("div", { "class": "cb-start-header" },
        el("h1", {}, "Neue Siedler – Start"),
        el("small", {}, "index " + idxV + gameV + " · dpr: " + dpr)
      );

      var select = el("select", { id: "cb-start-map" });
      for (var i = 0; i < maps.length; i++) {
        var m = maps[i], o = document.createElement("option");
        o.value = m.url; o.textContent = m.label || m.url; select.appendChild(o);
      }
      try { var last = localStorage.getItem("cb:lastMap"); if (last) select.value = last; } catch(e){}

      var label = el("label", { "for": "cb-start-map" }, "Karte:");

      // --- Start-Button mit Fallback-Reihenfolge (#2): GameBoot.start → startGame → GameLoader._start ---
      var startBtn = btn("▶︎ Start", { onclick: function () {
        var mapUrl = select.value;
        try { localStorage.setItem("cb:lastMap", mapUrl); } catch(e){}
        if (!window.__cb) window.__cb = {}; window.__cb.selectedMap = mapUrl;

        // vor Start: globales Start-Event
        try { window.dispatchEvent(new CustomEvent("cb:game-start", { detail:{ map: mapUrl } })); } catch(e){}

        // 1) Bevorzugt: GameBoot.start
        if (window.GameBoot && typeof window.GameBoot.start === "function") {
          try { window.GameBoot.start(mapUrl); } catch(e1){ logWarn("[ui-start] GameBoot.start Exception: " + (e1 && e1.message ? e1.message : e1)); }
          return;
        }

        // 2) Historischer Alias: startGame
        if (typeof window.startGame === "function") {
          try { window.startGame(mapUrl); } catch(e2){ logWarn("[ui-start] startGame Exception: " + (e2 && e2.message ? e2.message : e2)); }
          return;
        }

        // 3) Direkter Fallback auf Loader: GameLoader._start
        if (window.GameLoader && typeof window.GameLoader._start === "function") {
          window.GameLoader._start(mapUrl).then(function(){
            // nach Start: Startfenster schließen via Event + UI-Hook bedienen
            try { window.dispatchEvent(new CustomEvent("cb:game-started", { detail:{ map: mapUrl }})); } catch(_){}
            try { if (window.GameUI && typeof window.GameUI.onGameStarted === "function") window.GameUI.onGameStarted(); } catch(_){}
          }).catch(function(err){
            logWarn("[ui-start] GameLoader._start Fehler: " + (err && err.message ? err.message : err));
          });
          return;
        }

        // Kein Start-Entry vorhanden
        logWarn("[ui-start] Kein Start-Entry gefunden (GameBoot.start/startGame/GameLoader._start).");
      }});

      var resetBtn = btn("⟳ Neu-Start", { onclick: function(){ location.reload(); } });
      var cacheBtn = btn("🧹 Cache-Booster", { onclick: function(){
        try { var u=new URL(location.href); u.searchParams.set("v", Date.now().toString()); location.href=u.toString(); }
        catch(e){ location.reload(); }
      }});
      var copyBtn = btn("📋 Log kopieren", { onclick: function(){
        try {
          var txt = (window.CBLog && window.CBLog.dump ? window.CBLog.dump() : (window.__cbLogBuffer||[]).join("\n")) || "Kein Log vorhanden.";
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt);
          else { var ta=document.createElement("textarea"); ta.value=txt; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); }
          logOk("[ui-start] Log in Zwischenablage.");
        } catch(e){ logWarn("[ui-start] Clipboard fehlgeschlagen."); }
      }});

      var rowMain  = el("div", { "class": "cb-start-row" }, startBtn, resetBtn);
      var rowTools = el("div", { "class": "cb-start-row" }, cacheBtn, copyBtn);
      var logline  = el("pre", { id:"cb-start-log" }, "["+new Date().toTimeString().slice(0,8)+"] OK UI bereit (index "+idxV+")");

      var card = el("div", { "class": "cb-start-card" }, label, select, rowMain, rowTools, logline);
      host.appendChild(header);
      host.appendChild(card);

      logOk("[ui-start] Panel geöffnet ("+idxV+")");
    };

    window.GameUI.onGameStarted = function () {
      var host = document.getElementById("start-panel");
      if (host) host.style.display = "none";
      removeBg();
    };

    window.addEventListener("cb:ui-ready", function(){
      logOk("[ui-start] cb:ui-ready ("+oneV(UI_START_VERSION)+")");
      try {
        var host = document.getElementById("start-panel");
        var visible = !!(host && host.style.display !== "none" && host.childElementCount>0);
        if (!visible) window.GameUI.openStartPanel();
      } catch(e){ logWarn("[ui-start] Auto-Open fehlgeschlagen: "+(e.message||e)); }
    });

    logOk("[ui-start] Modul geladen ("+oneV(UI_START_VERSION)+")");
  } catch (err) {
    window.__uiStartErr = err; // Diagnose für index.html
    try { console.error("[ui-start] Fehler beim Ausführen:", err && err.message ? err.message : err); } catch(e){}
  }
})();
