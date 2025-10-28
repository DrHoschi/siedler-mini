<script>
/* ============================================================================
 * Datei   : ui/ui-inspector.js
 * Projekt : Neue Siedler – Inspector (Core/Wrapper)
 * Version : v25.10.28-final
 * Struktur: Imports → Konstanten → Helpers → Klassen → Hauptlogik → Exports
 * Zweck   : Stellt eine stabile API bereit:
 *           - window.UIInspector.open/close/toggle/registerTab/log
 *           - Body-Flag setzt/entfernt ('is-inspector' bevorzugt, 'inspector-open' Fallback)
 *           - Erstellt #inspector bei Bedarf selbstständig
 *           - Sendet/empfängt Ereignis-Aliasse (req:insp:*, req:inspector:*)
 * Hinweise:
 *   • Abwärtskompatibel zu älteren Ständen (inspector-open + UIInspector.*)
 *   • Tabs können sich per UIInspector.registerTab(name, initFn) registrieren
 *   • Minimale Abhängigkeiten – funktioniert autark
 * ============================================================================
 */

/* ---------- Konstanten ---------- */
const INSPECTOR_ID   = 'inspector';
const BODY_FLAG_NEW  = 'is-inspector';     // neuer Standard
const BODY_FLAG_OLD  = 'inspector-open';   // kompatibler Alt-Flag
const EVT_ALIAS_REQ  = ['req:insp:open','req:insp:close','req:insp:toggle',
                        'req:inspector:open','req:inspector:close','req:inspector:toggle'];
const EVT_CB_OPEN    = ['cb:insp:open','cb:inspector:open'];
const EVT_CB_CLOSE   = ['cb:insp:close','cb:inspector:close'];

/* ---------- Helpers ---------- */
function qs(sel, root=document){ return root.querySelector(sel); }
function ensureHost(){
  let host = qs('#'+INSPECTOR_ID);
  if (!host){
    host = document.createElement('div');
    host.id = INSPECTOR_ID;
    host.hidden = true;           // CSS blendet via Body-Flag trotzdem ein
    document.body.appendChild(host);
  }
  if (!host.firstElementChild){
    host.innerHTML = `
      <div class="insp-shell" role="dialog" aria-label="Inspector" aria-modal="true">
        <div class="insp-header">
          <div class="insp-title">Inspector</div>
          <button class="insp-close" type="button" data-action="close">Schließen</button>
        </div>
        <div class="insp-tabs" role="tablist"></div>
        <div class="insp-content"></div>
      </div>`;
    host.querySelector('.insp-close')?.addEventListener('click', ()=>UIInspector.close());
  }
  return host;
}
function setBodyFlag(on){
  const b = document.body.classList;
  if (on){ b.add(BODY_FLAG_NEW); b.add(BODY_FLAG_OLD); }
  else   { b.remove(BODY_FLAG_NEW); b.remove(BODY_FLAG_OLD); }
}
function emit(names){
  for (const n of names){ dispatchEvent(new CustomEvent(n)); }
}

/* ---------- Klassen ---------- */
class TabRegistry{
  constructor(){
    this._tabs = new Map();  // name -> {init, panelEl, buttonEl}
    this._active = null;
  }
  register(name, init){
    this._tabs.set(name, {init, panelEl:null, buttonEl:null});
    if (UIInspector._initialized) UIInspector._mountTab(name); // live-register
  }
  names(){ return [...this._tabs.keys()]; }
}

/* ---------- Hauptlogik (UIInspector-Core) ---------- */
const UIInspector = {
  _initialized: false,
  _tabs: new TabRegistry(),
  _logs: [],

  registerTab(name, initFn){ this._tabs.register(name, initFn); },

  log(entry){
    // leichtgewichtiges Logging für den Logs-Tab
    const time = new Date().toLocaleTimeString();
    this._logs.push({time, ...entry});
    // optional: Live-Update, wenn Logs aktiv ist
    const panel = qs('#'+INSPECTOR_ID+' .insp-panel-block[data-tab="Logs"]');
    panel?.dispatchEvent(new CustomEvent('insp:logs:add', {detail: entry}));
  },

  _mountTab(name){
    const host = ensureHost();
    const tabsEl = host.querySelector('.insp-tabs');
    const contEl = host.querySelector('.insp-content');

    // Panel
    const panel = document.createElement('section');
    panel.className = 'insp-panel-block';
    panel.dataset.tab = name;

    // Button
    const btn = document.createElement('button');
    btn.className = 'insp-tab';
    btn.setAttribute('role','tab');
    btn.textContent = name;
    btn.addEventListener('click', ()=> this.activate(name));

    // Speichern & anhängen
    const rec = this._tabs._tabs.get(name);
    rec.panelEl = panel;
    rec.buttonEl = btn;
    tabsEl.appendChild(btn);
    contEl.appendChild(panel);

    // init() des Tabs aufrufen
    try{ rec.init(panel, this); } catch(e){ console.error('[inspector] init tab failed', name, e); }
    if (!this._tabs._active) this.activate(name); // ersten Tab aktivieren
  },

  _ensureInitialized(){
    if (this._initialized) return;
    ensureHost();

    // vorhandene Tabs in DOM bringen
    for (const name of this._tabs.names()) this._mountTab(name);

    // Event-Aliasse unterstützen
    EVT_ALIAS_REQ.forEach(alias=>{
      addEventListener(alias, (ev)=>{
        if (/open$/.test(alias))   this.open();
        if (/close$/.test(alias))  this.close();
        if (/toggle$/.test(alias)) this.toggle();
      });
    });

    this._initialized = true;
  },

  open(){
    this._ensureInitialized();
    setBodyFlag(true);
    emit(EVT_CB_OPEN);
  },
  close(){
    setBodyFlag(false);
    emit(EVT_CB_CLOSE);
  },
  toggle(){
    const isOpen = document.body.classList.contains(BODY_FLAG_NEW) ||
                   document.body.classList.contains(BODY_FLAG_OLD);
    isOpen ? this.close() : this.open();
  },

  activate(name){
    const host = ensureHost();
    host.querySelectorAll('.insp-panel-block').forEach(el=>{
      el.classList.toggle('active', el.dataset.tab===name);
    });
    host.querySelectorAll('.insp-tab').forEach(btn=>{
      btn.setAttribute('aria-selected', btn.textContent===name ? 'true' : 'false');
    });
    this._tabs._active = name;
  }
};

/* ---------- Exports ---------- */
window.UIInspector = UIInspector;
// Optional: moderner Alias, falls irgendwo erwartet:
window.Inspector = window.Inspector || {
  open:   ()=>UIInspector.open(),
  close:  ()=>UIInspector.close(),
  toggle: ()=>UIInspector.toggle()
};
</script>
