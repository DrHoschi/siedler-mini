/* ============================================================================
 * assets/inspector/inspector.core.js — v18.10.8
 * Projekt: Siedler-Mini
 * Zweck:
 *   - Zentrale Inspector-UI (Overlay, Tabs, Body/Foot)
 *   - Öffnen/Schließen API: window.__INSPECTOR_API__
 *   - Entfernt Fallback-Box ("Inspector lädt…") & Probe-Badge
 *   - Mobil: Vollbild (fixed, inset:0), Desktop: Panel rechts
 * Logs:
 *   - Sanfte Logs via CBLog, sonst console.log
 *   - Keine harten Abhängigkeiten (Tabs werden dynamisch angebunden)
 * ========================================================================== */
(function () {
  'use strict';

  var VERSION = 'v18.10.8';
  var MOD = '[inspector.core]';
  var ok   = (window.CBLog?.info || console.log).bind(console);
  var warn = (window.CBLog?.warn || console.warn).bind(console);
  var err  = (window.CBLog?.error || console.error).bind(console);

  // ---------------------------------------------------------------------------
  // DOM Helpers
  // ---------------------------------------------------------------------------
  function $(sel, root){ return (root||document).querySelector(sel); }
  function el(tag, cls, html){
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html!=null) n.innerHTML = html;
    return n;
  }

  // ---------------------------------------------------------------------------
  // Root erstellen (id=inspector) — wenn bereits vorhanden, wiederverwenden
  // ---------------------------------------------------------------------------
  var root = $('#inspector');
  if (!root) {
    root = el('div', 'inspector is-hidden');
    root.id = 'inspector';
    document.body.appendChild(root);
  }

  // Struktur
  root.innerHTML = '';
  var header = el('div','insp-head');
  var tabs   = el('div','insp-tabs','');
  var body   = el('div','insp-body');
  var footer = el('div','insp-foot');

  // Buttons + Tabs
  var btnClose = el('button','insp-close','Schließen ✕');
  btnClose.type = 'button';
  btnClose.addEventListener('click', function(){ api.close(); });
  header.appendChild(btnClose);

  // Tab-Buttons (Core hängt nur die Platzhalter an; die Module registrieren sich)
  // Standard-Tabs: Logs, Build, Pfade, Tests
  var defaultTabs = [
    { id:'logs',  label:'Logs' },
    { id:'build', label:'Build' },
    { id:'paths', label:'Pfade' },
    { id:'tests', label:'Tests' },
  ];
  defaultTabs.forEach(function(t){
    var b = el('button','insp-tab', t.label);
    b.dataset.tab = t.id;
    b.type = 'button';
    b.addEventListener('click', function(){
      setActiveTab(t.id);
      dispatch('insp:tab-change', { tab:t.id });
    });
    tabs.appendChild(b);
  });

  // Footer (Standard: wird von Modulen per Bedarf sichtbar gemacht)
  var footLeft  = el('div','insp-foot-left');
  var footRight = el('div','insp-foot-right');
  footer.appendChild(footLeft);
  footer.appendChild(footRight);

  // Zusammenbauen
  root.appendChild(header);
  root.appendChild(tabs);
  root.appendChild(body);
  root.appendChild(footer);

  // ---------------------------------------------------------------------------
  // Events / API
  // ---------------------------------------------------------------------------
  function dispatch(name, detail){
    try { window.dispatchEvent(new CustomEvent(name, { detail: detail||{} })); }
    catch(e){ /* noop */ }
  }

  function ensureVisible(){
    root.classList.remove('is-hidden');
    // Mobile: Vollbild; Desktop: CSS regelt Breite/Position
  }

  function open(forceTab){
    ensureVisible();
    root.setAttribute('aria-hidden','false');
    root.style.display = 'block';
    // Tab aktivieren (präferiert Logs)
    setActiveTab(forceTab || 'logs');
    removeFallbackArtifacts();
    dispatch('cb:inspector-open', { source:'core' });
    ok(MOD+' geöffnet ('+VERSION+')');
  }

  function close(){
    root.setAttribute('aria-hidden','true');
    root.style.display = 'none';
    dispatch('cb:inspector-close', { source:'core' });
    ok(MOD+' geschlossen');
  }

  function toggle(force){
    if (force==null){
      (root.style.display === 'none' || !root.style.display) ? open() : close();
    } else {
      force ? open() : close();
    }
  }

  function setActiveTab(tabId){
    // Tabs markieren
    Array.prototype.forEach.call(tabs.querySelectorAll('.insp-tab'), function(b){
      b.classList.toggle('is-active', b.dataset.tab===tabId);
    });
    // Body zurücksetzen → Modul rendert hinein
    body.innerHTML = '';
    footer.classList.add('is-hidden');
    dispatch('insp:render:'+tabId, { body: body, footer: footer });
  }

  // Öffentliche Fußleisten-API (von Modulen genutzt)
  var footAPI = {
    show: function(){ footer.classList.remove('is-hidden'); },
    hide: function(){ footer.classList.add('is-hidden'); },
    left: function(){ return footLeft; },
    right:function(){ return footRight; },
    clear:function(){ footLeft.innerHTML=''; footRight.innerHTML=''; }
  };

  // Inspector-API veröffentlichen
  var api = (window.__INSPECTOR_API__ = {
    open: open,
    close: close,
    toggle: toggle,
    setTab: setActiveTab,
    getBody: function(){ return body; },
    getFooter: function(){ return footer; },
    getFootAPI: function(){ return footAPI; },
    getRoot: function(){ return root; },
    version: VERSION
  });

  // ---------------------------------------------------------------------------
  // Fallback-Elemente entfernen (wenn ui-bridge einen Platzhalter gebaut hat)
  // ---------------------------------------------------------------------------
  function removeFallbackArtifacts(){
    var fb = document.getElementById('inspector-fallback'); if (fb) fb.remove();
    var pr = document.getElementById('inspector-probe');    if (pr) pr.remove();
  }
  removeFallbackArtifacts();

  // Direkt öffnen? Nein — per Button. Aber: Immer sofort bereit
  root.style.display = 'none';
  root.setAttribute('aria-hidden','true');

  ok(MOD+' bereit ('+VERSION+')');
})();
