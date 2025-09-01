<!-- Datei: assets/ui/ui-bridge.js — v16.3.5 -->
<script>
/* global window, document */
(function () {
  'use strict';
  var VERSION = 'v16.3.5';

  // Logging-Helfer (nutzt deinen Inspector/CBLog, fällt sonst auf console zurück)
  function log(){ (window.CBLog && CBLog.ok ? CBLog.ok : console.log).apply(console, arguments); }
  function warn(){ (window.CBLog && CBLog.warn ? CBLog.warn : console.warn).apply(console, arguments); }

  // -------- Bridge API (einheitliche, stabile Funktionsnamen) ----------
  // Diese Methoden ruft die Bridge intern, aber du kannst sie auch extern nutzen:
  //   GameUI.openBuildMenu() / .closeBuildMenu() / .toggleBuildMenu()
  //   GameUI.openInspector()  / .closeInspector()  / .toggleInspector()
  var GameUI = (window.GameUI = window.GameUI || {});

  // Wir machen die Buttons & UI root FIXED, damit Zooms des Canvas sie NICHT beeinflussen.
  var root = null, btnBuild = null, btnInsp = null;

  function ensureRoot() {
    if (root) return root;

    // fixed, full viewport, pointer-events: none; (nur Buttons bekommen pointer-events: auto)
    root = document.createElement('div');
    root.id = 'ui-root';
    root.style.position = 'fixed';
    root.style.left = '0';
    root.style.top = '0';
    root.style.width = '100vw';
    root.style.height = '100vh';
    root.style.pointerEvents = 'none';
    root.style.zIndex = '9999';        // ganz oben, über Canvas & Panels
    root.style.transform = 'none';     // falls Eltern scale() haben: entkoppeln
    root.style.contain = 'layout style paint';
    document.body.appendChild(root);

    // Container unten links/rechts
    var leftBox = document.createElement('div');
    leftBox.style.position = 'absolute';
    leftBox.style.left = '16px';
    leftBox.style.bottom = '16px';
    leftBox.style.pointerEvents = 'none';
    root.appendChild(leftBox);

    var rightBox = document.createElement('div');
    rightBox.style.position = 'absolute';
    rightBox.style.right = '16px';
    rightBox.style.bottom = '16px';
    rightBox.style.pointerEvents = 'none';
    root.appendChild(rightBox);

    // runde Floating-Buttons (Bauen, Inspector)
    btnBuild = document.createElement('button');
    btnBuild.id = 'btn-build';
    styleRound(btnBuild);
    btnBuild.title = 'Bau-Menü öffnen';
    btnBuild.innerHTML = '🧱';
    btnBuild.setAttribute('aria-pressed', 'false');
    btnBuild.style.marginRight = '12px';
    btnBuild.addEventListener('click', function (e) {
      e.stopPropagation();
      e.preventDefault();
      GameUI.toggleBuildMenu();
    }, { passive: false });
    leftBox.appendChild(btnBuild);

    btnInsp = document.createElement('button');
    btnInsp.id = 'btn-inspector';
    styleRound(btnInsp);
    btnInsp.title = 'Inspector öffnen';
    btnInsp.innerHTML = '🛠️';
    btnInsp.setAttribute('aria-pressed', 'false');
    btnInsp.addEventListener('click', function (e) {
      e.stopPropagation();
      e.preventDefault();
      GameUI.toggleInspector();
    }, { passive: false });
    rightBox.appendChild(btnInsp);

    // Beim Öffnen des Bau-Menüs Buttons leicht nach oben schieben,
    // beim Schließen wieder zurück. Wir lauschen auf ein Custom-Event,
    // das ui-build.js jetzt feuert (siehe letzte Integration):
    window.addEventListener('cb:buildmenu-state', function (ev) {
      var open = !!(ev && ev.detail && ev.detail.open);
      // 96px hochsetzen, damit nichts verdeckt wird
      var offset = open ? 96 : 16;
      leftBox.style.bottom  = offset + 'px';
      rightBox.style.bottom = offset + 'px';
      btnBuild.setAttribute('aria-pressed', String(open));
      if (open) btnBuild.classList.add('active'); else btnBuild.classList.remove('active');
    });

    // Inspector-State spiegeln (falls dein Inspector Events sendet)
    window.addEventListener('cb:inspector-state', function (ev) {
      var open = !!(ev && ev.detail && ev.detail.open);
      btnInsp.setAttribute('aria-pressed', String(open));
      if (open) btnInsp.classList.add('active'); else btnInsp.classList.remove('active');
    });

    return root;
  }

  function styleRound(btn){
    btn.type = 'button';
    btn.style.pointerEvents = 'auto';
    btn.style.width = '56px';
    btn.style.height = '56px';
    btn.style.borderRadius = '50%';
    btn.style.border = '0';
    btn.style.outline = 'none';
    btn.style.boxShadow = '0 8px 24px rgba(0,0,0,.35)';
    btn.style.background = 'linear-gradient(180deg, rgba(25,25,25,.85), rgba(15,15,15,.85))';
    btn.style.backdropFilter = 'blur(6px)';
    btn.style.color = '#fff';
    btn.style.fontSize = '24px';
    btn.style.display = 'inline-flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.cursor = 'pointer';
    btn.style.userSelect = 'none';
    btn.style.webkitTapHighlightColor = 'transparent';
    // aktiver Zustand
    btn.classList.add('ui-fab');
  }

  // ---------- Calls in die bestehenden Module (robust, mehrere Namen unterstützt) ----------
  function buildOpen(){
    // ui-build.js
    if (window.UIBuild && typeof window.UIBuild.open === 'function') return window.UIBuild.open();
    if (window.UIBuild && typeof window.UIBuild.toggle === 'function') return window.UIBuild.toggle(true);
    if (window.Game && typeof window.Game.openBuildMenu === 'function') return window.Game.openBuildMenu();
    // Notfall: Event; ui-build hört darauf
    try { window.dispatchEvent(new CustomEvent('cb:buildmenu-open')); } catch(_){}
  }
  function buildClose(){
    if (window.UIBuild && typeof window.UIBuild.close === 'function') return window.UIBuild.close();
    if (window.UIBuild && typeof window.UIBuild.toggle === 'function') return window.UIBuild.toggle(false);
    if (window.Game && typeof window.Game.closeBuildMenu === 'function') return window.Game.closeBuildMenu();
    try { window.dispatchEvent(new CustomEvent('cb:buildmenu-close')); } catch(_){}
  }
  function buildToggle(){
    if (window.UIBuild && typeof window.UIBuild.toggle === 'function') return window.UIBuild.toggle();
    try { window.dispatchEvent(new CustomEvent('cb:buildmenu-toggle')); } catch(_){}
  }
  function inspOpen(){
    if (window.Inspector && typeof window.Inspector.open === 'function') return window.Inspector.open();
    if (window.Inspector && typeof window.Inspector.toggle === 'function') return window.Inspector.toggle(true);
    try { window.dispatchEvent(new CustomEvent('cb:inspector-open')); } catch(_){}
  }
  function inspClose(){
    if (window.Inspector && typeof window.Inspector.close === 'function') return window.Inspector.close();
    if (window.Inspector && typeof window.Inspector.toggle === 'function') return window.Inspector.toggle(false);
    try { window.dispatchEvent(new CustomEvent('cb:inspector-close')); } catch(_){}
  }
  function inspToggle(){
    if (window.Inspector && typeof window.Inspector.toggle === 'function') return window.Inspector.toggle();
    try { window.dispatchEvent(new CustomEvent('cb:inspector-toggle')); } catch(_){}
  }

  // API exportieren (stabil)
  GameUI.openBuildMenu   = buildOpen;
  GameUI.closeBuildMenu  = buildClose;
  GameUI.toggleBuildMenu = buildToggle;
  GameUI.openInspector   = inspOpen;
  GameUI.closeInspector  = inspClose;
  GameUI.toggleInspector = inspToggle;

  // ---------- Lifecycle-Logik ----------
  function onUIReady(){
    ensureRoot();
    // Beim Startscreen: Buttons ausblenden – sollen erst im Spiel erscheinen
    showButtons(false);
    log('[ui-bridge] bereit ('+VERSION+')');
  }
  function onGameStarted(){
    ensureRoot();
    showButtons(true);
  }
  function onGameStopped(){
    showButtons(false);
  }
  function showButtons(show){
    if (!btnBuild || !btnInsp) return;
    var v = show ? 'visible' : 'hidden';
    var pe = show ? 'auto' : 'none';
    btnBuild.style.visibility = v; btnBuild.style.pointerEvents = pe;
    btnInsp.style.visibility  = v; btnInsp.style.pointerEvents  = pe;
  }

  // Events aus deinem bestehenden Flow
  window.addEventListener('cb:ui-ready', onUIReady);
  window.addEventListener('cb:game-started', onGameStarted);
  window.addEventListener('cb:game-stopped', onGameStopped);

  // Falls die Events früher gefeuert wurden (Reload mitten im Spiel), sofort initialisieren:
  document.readyState === 'complete' ? ensureRoot() : window.addEventListener('load', ensureRoot);

  // Sicherheit: Verhindere, dass Body-Skalierungen (oder Eltern-Transforms) die Buttons beeinflussen.
  // (nur Informativ – root ist fixed und transform:none)
  document.documentElement.style.transform = 'none';
  document.body.style.transform = 'none';

  log('[ui-bridge] Modul geladen ('+VERSION+')');
})();
</script>
