/* ============================================================================
 * assets/inspector/inspector.core.js — v18.10.4
 * Projekt: Neue Siedler
 * Zweck (Core):
 *   - Vollbild-Overlay + Grundlayout (Header/Tabs/Body/Footer)
 *   - Tab-Registry (InspectorTabs.register)
 *   - Öffnen/Schließen/Togglen + Zustände merken (SessionStorage)
 *   - Ereignis-Brücke (cb:inspector-ready, inspector:refresh-logs, …)
 *   - Sicherer Fallback (keine Doppel-Inits, kein Auto-Open erzwungen)
 *
 * Öffentliche API (window.Inspector):
 *   init()                       – einmalig starten (idempotent)
 *   open() / close() / toggle()  – Overlay steuern
 *   showTab(id)                  – Tab wechseln
 *   isOpen()                     – Zustand
 *
 * Öffentliche API (window.InspectorTabs):
 *   register(id, {title, order, when?, render})
 *     - id: string (z.B. "logs")
 *     - title: string (Tab-Label)
 *     - order: number (Sortierung; kleiner = weiter links)
 *     - when?: ()=>boolean   (optional; ob Tab aktivierbar ist)
 *     - render(rootEl): void (Tab-Inhalt zeichnen)
 *
 * Logs:
 *   - nutzt CBLog (falls vorhanden), sonst console.* Fallback
 *   - feuert CustomEvents:
 *        'cb:inspector-ready'             – Core ist bereit
 *        'inspector:tab-change'           – detail:{id}
 *        'inspector:refresh-logs'         – Logs-Tab soll reloaden
 *        'inspector:request-close'        – Close-Taste gedrückt
 *
 * Hinweise:
 *   - Styling liegt in assets/inspector/inspector.css
 *   - Autostart: NICHT auto-open; optional via window.__INSPECTOR_AUTO_OPEN__=true;
 * ========================================================================== */
(function(){
  'use strict';

  // ---------------------------------------------------------------------------
  // Logging-Helfer
  // ---------------------------------------------------------------------------
  var LOG  = (window.CBLog && (CBLog.info||CBLog.log)) || function(){ try{ console.log.apply(console, arguments);}catch(_){ } };
  var WARN = (window.CBLog && CBLog.warn)                || function(){ try{ console.warn.apply(console, arguments);}catch(_){ } };
  var ERR  = (window.CBLog && CBLog.err)                 || function(){ try{ console.error.apply(console, arguments);}catch(_){ } };

  // ---------------------------------------------------------------------------
  // Singletons / State
  // ---------------------------------------------------------------------------
  if (window.__INSPECTOR_CORE_READY__) {
    LOG('[inspector.core] bereits initialisiert – überspringe.');
    return;
  }

  var Inspector        = (window.Inspector       = window.Inspector       || {});
  var InspectorTabsAPI = (window.InspectorTabs   = window.InspectorTabs   || {});
  var __TAB_REGISTRY__ = []; // {id,title,order,when?,render}
  var __UI__ = { root:null, head:null, tabs:null, body:null, footer:null, closeBtn:null };
  var __STATE__ = {
    open: false,
    activeTab: 'logs',
  };

  // Persistenter Speicher (Session)
  var SSKEY_OPEN = 'inspector.open';
  var SSKEY_TAB  = 'inspector.tab';

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------
  function ssGet(k, d){ try{ var v=sessionStorage.getItem(k); return (v==null?d:v);}catch(_){ return d; } }
  function ssSet(k, v){ try{ sessionStorage.setItem(k, String(v)); }catch(_){ } }

  function emit(ev, detail){
    try { window.dispatchEvent(new CustomEvent(ev, { detail: detail||{} })); } catch(_){}
  }

  function qs(sel){ return document.querySelector(sel); }

  // ---------------------------------------------------------------------------
  // Tabs – Registrierung
  // ---------------------------------------------------------------------------
  InspectorTabsAPI.register = function(id, desc){
    if (!id || !desc || typeof desc.render!=='function'){
      WARN('[inspector.core] Tab-Register fehlt id/render:', id, desc);
      return;
    }
    var item = {
      id: id,
      title: desc.title || id,
      order: (typeof desc.order==='number'? desc.order : 100),
      when: (typeof desc.when==='function'? desc.when : null),
      render: desc.render
    };
    // falls bestehender Eintrag → ersetzen
    for (var i=0;i<__TAB_REGISTRY__.length;i++){
      if (__TAB_REGISTRY__[i].id===id){ __TAB_REGISTRY__[i]=item; return; }
    }
    __TAB_REGISTRY__.push(item);
    __TAB_REGISTRY__.sort(function(a,b){ return a.order - b.order; });
    // UI live aktualisieren
    if (__UI__.root) rebuildTabs();
  };

  // ---------------------------------------------------------------------------
  // UI erstellen
  // ---------------------------------------------------------------------------
  function buildUI(){
    if (__UI__.root){ return; }

    var root = document.createElement('div');
    root.id = 'inspector';
    // Minimal-Styles damit ohne CSS-Datei nutzbar (volle Kontrolle via CSS)
    root.setAttribute('aria-label', 'Inspector');
    root.style.position = 'fixed';
    root.style.inset = '0';
    root.style.zIndex = '2147483600';
    root.style.display = 'none'; // start closed; wir steuern per open()/close()

    // Header
    var head = document.createElement('div');
    head.className = 'insp-head';

    var title = document.createElement('div');
    title.className = 'insp-title';
    title.textContent = 'Inspector';

    var spacer = document.createElement('div');
    spacer.className = 'insp-spacer';

    var btnClose = document.createElement('button');
    btnClose.type='button';
    btnClose.className = 'insp-close';
    btnClose.setAttribute('aria-label','Inspector schließen');
    btnClose.textContent = '✕';
    btnClose.addEventListener('click', function(){
      emit('inspector:request-close',{});
      Inspector.close();
    });

    head.appendChild(title);
    head.appendChild(spacer);
    head.appendChild(btnClose);

    // Tabs-Leiste
    var tabs = document.createElement('div');
    tabs.className = 'insp-tabs';

    // Body
    var body = document.createElement('div');
    body.className = 'insp-body';
    body.setAttribute('role','main');

    // Footer
    var footer = document.createElement('div');
    footer.className = 'insp-footer';
    var hint = document.createElement('div');
    hint.className = 'insp-hint';
    hint.textContent = 'Tip: [Esc] schließt, [Ctrl+I] toggelt.';
    footer.appendChild(hint);

    // Root zusammenbauen
    root.appendChild(head);
    root.appendChild(tabs);
    root.appendChild(body);
    root.appendChild(footer);

    document.body.appendChild(root);

    // speichern
    __UI__.root = root;
    __UI__.head = head;
    __UI__.tabs = tabs;
    __UI__.body = body;
    __UI__.footer = footer;
    __UI__.closeBtn = btnClose;

    // Tastatur-Shortcuts
    window.addEventListener('keydown', function(ev){
      try{
        if (ev.key==='Escape' && __STATE__.open){ Inspector.close(); ev.preventDefault(); }
        else if ((ev.ctrlKey||ev.metaKey) && (ev.key==='i' || ev.key==='I')){ Inspector.toggle(); ev.preventDefault(); }
      }catch(_){}
    }, {passive:false});

    rebuildTabs();
  }

  // Tabs gemäß Registry aufbauen
  function rebuildTabs(){
    if (!__UI__.tabs) return;
    __UI__.tabs.textContent = '';

    var frag = document.createDocumentFragment();
    var haveActive = false;
    var visibleTabs = 0;

    for (var i=0;i<__TAB_REGISTRY__.length;i++){
      var t = __TAB_REGISTRY__[i];
      var enabled = !t.when || !!t.when();
      if (!enabled) continue; // ausgeblendete Tabs gar nicht rendern
      visibleTabs++;

      var b = document.createElement('button');
      b.type='button';
      b.className = 'insp-tab';
      b.textContent = t.title || t.id;
      b.dataset.tabId = t.id;
      if (t.id === __STATE__.activeTab){ b.classList.add('active'); haveActive=true; }
      b.addEventListener('click', function(ev){
        var id = ev.currentTarget.dataset.tabId;
        Inspector.showTab(id);
      });
      frag.appendChild(b);
    }

    // wenn kein aktiver Tab mehr sichtbar → ersten nehmen
    if (!haveActive && visibleTabs>0){
      for (var j=0;j<__TAB_REGISTRY__.length;j++){
        var tt=__TAB_REGISTRY__[j];
        var ok = !tt.when || !!tt.when();
        if (ok){ __STATE__.activeTab = tt.id; break; }
      }
    }

    __UI__.tabs.appendChild(frag);
    // Tab-Inhalt neu zeichnen
    renderActiveTab();
  }

  function getTabDesc(id){
    for (var i=0;i<__TAB_REGISTRY__.length;i++){
      if (__TAB_REGISTRY__[i].id===id) return __TAB_REGISTRY__[i];
    }
    return null;
  }

  function setActiveTabButton(id){
    var kids = __UI__.tabs.querySelectorAll('.insp-tab');
    kids.forEach(function(k){
      if (k.dataset.tabId===id) k.classList.add('active'); else k.classList.remove('active');
    });
  }

  function renderActiveTab(){
    if (!__UI__.body) return;
    __UI__.body.textContent = '';
    var desc = getTabDesc(__STATE__.activeTab);
    if (!desc){
      var info=document.createElement('div');
      info.className='insp-empty';
      info.textContent='Kein Inhalt verfügbar.';
      __UI__.body.appendChild(info);
      return;
    }
    try{
      desc.render(__UI__.body);
      emit('inspector:tab-change', {id: __STATE__.activeTab});
      // Speziell: Logs-Tab → bitte neu laden
      if (__STATE__.activeTab==='logs'){ setTimeout(function(){ emit('inspector:refresh-logs',{}); }, 0); }
    }catch(e){
      ERR('[inspector.core] Tab-Render-Fehler:', e && e.message);
      var err=document.createElement('div');
      err.className='insp-error';
      err.textContent='Fehler beim Rendern: '+(e && e.message);
      __UI__.body.appendChild(err);
    }
  }

  // ---------------------------------------------------------------------------
  // Öffnen/Schließen/Toggle
  // ---------------------------------------------------------------------------
  Inspector.open = function(){
    if (!__UI__.root) buildUI();
    if (__STATE__.open) return;
    __STATE__.open = true;
    try{ ssSet(SSKEY_OPEN, '1'); }catch(_){}
    __UI__.root.style.display = 'block';
    document.body.classList.add('insp-open');

    // Beim Öffnen Logs-Tab triggern, falls aktiv
    if (__STATE__.activeTab==='logs'){ emit('inspector:refresh-logs',{}); }
    LOG('[inspector.core] geöffnet (v18.10.4)');
  };

  Inspector.close = function(){
    if (!__UI__.root || !__STATE__.open) return;
    __STATE__.open = false;
    try{ ssSet(SSKEY_OPEN, '0'); }catch(_){}
    __UI__.root.style.display = 'none';
    document.body.classList.remove('insp-open');
    LOG('[inspector.core] geschlossen');
  };

  Inspector.toggle = function(){
    if (__STATE__.open) Inspector.close(); else Inspector.open();
  };

  Inspector.isOpen = function(){ return !!__STATE__.open; };

  Inspector.showTab = function(id){
    if (!id) return;
    var desc = getTabDesc(id); if (!desc) return;
    __STATE__.activeTab = id;
    try{ ssSet(SSKEY_TAB, id); }catch(_){}
    setActiveTabButton(id);
    renderActiveTab();
  };

  // ---------------------------------------------------------------------------
  // Init (idempotent)
  // ---------------------------------------------------------------------------
  Inspector.init = function(){
    if (window.__INSPECTOR_CORE_READY__) return;

    // Zustand laden
    __STATE__.open = (ssGet(SSKEY_OPEN,'0') === '1');
    var t = ssGet(SSKEY_TAB, 'logs'); if (t) __STATE__.activeTab = t;

    buildUI();

    // GameUI-Anschluss
    try{
      window.GameUI = window.GameUI || {};
      if (typeof GameUI.toggleInspector !== 'function'){
        GameUI.toggleInspector = function(){ Inspector.toggle(); };
      }
    }catch(e){
      WARN('[inspector.core] GameUI-Toggle konnte nicht registriert werden:', e && e.message);
    }

    // Grund-Tabs als Platzhalter eintragen, falls Module spät kommen:
    ensurePlaceholderTabs();

    window.__INSPECTOR_CORE_READY__ = true;
    LOG('[inspector.core] bereit (v18.10.4)');
    emit('cb:inspector-ready', { version:'v18.10.4' });

    // Auto-Open (optional)
    if (window.__INSPECTOR_AUTO_OPEN__ === true){
      // nur beim ersten Init respektieren
      if (ssGet(SSKEY_OPEN,'0')!=='1') Inspector.open();
    }
  };

  function ensurePlaceholderTabs(){
    // Falls Module noch nicht geladen sind, gibt es später echte Register-Calls.
    // Bis dahin legen wir Platzhalter an (werden bei register() ersetzt).
    var haveLogs  = !!getTabDesc('logs');
    var haveBuild = !!getTabDesc('build');
    var havePaths = !!getTabDesc('paths');
    var haveTests = !!getTabDesc('tests');

    if (!haveLogs){
      InspectorTabsAPI.register('logs', {
        title:'Logs', order:10,
        render: function(root){
          var p=document.createElement('div');
          p.className='insp-empty';
          p.textContent='Lade Logs…';
          root.appendChild(p);
          // sobald logs.js da ist, überschreibt es diesen Renderer
        }
      });
    }
    if (!haveBuild){
      InspectorTabsAPI.register('build', {
        title:'Build', order:20,
        render: function(root){
          var p=document.createElement('div');
          p.className='insp-empty';
          p.textContent='Build-UI lädt…';
          root.appendChild(p);
        }
      });
    }
    if (!havePaths){
      InspectorTabsAPI.register('paths', {
        title:'Pfade', order:30,
        render: function(root){
          var p=document.createElement('div');
          p.className='insp-empty';
          p.textContent='Pfade-Tools laden…';
          root.appendChild(p);
        }
      });
    }
    if (!haveTests){
      InspectorTabsAPI.register('tests', {
        title:'Tests', order:40,
        render: function(root){
          var p=document.createElement('div');
          p.className='insp-empty';
          p.textContent='Tests werden geladen…';
          root.appendChild(p);
        }
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Boot: nach DOM bereit
  // ---------------------------------------------------------------------------
  function boot(){
    try{ Inspector.init(); }catch(e){ ERR('[inspector.core] Init-Fehler:', e && e.message); }
  }
  if (document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', boot, {once:true});
  } else {
    boot();
  }

})();
