/* ============================================================================
 * Datei   : ui/ui-inspector.js
 * Version : v25.10.28-clean
 * Zweck   : Öffentliche API (UIInspector.*), Body-Flags, Tab-Registry, Events
 * Flags   : body.is-inspector (neu) + body.inspector-open (kompatibel)
 * ========================================================================= */

const INSPECTOR_ID   = 'inspector';
const BODY_FLAG_NEW  = 'is-inspector';
const BODY_FLAG_OLD  = 'inspector-open';
const EVT_ALIAS_REQ  = [
  'req:insp:open','req:insp:close','req:insp:toggle',
  'req:inspector:open','req:inspector:close','req:inspector:toggle'
];
const EVT_CB_OPEN  = ['cb:insp:open','cb:inspector:open'];
const EVT_CB_CLOSE = ['cb:insp:close','cb:inspector:close'];

const $ = (sel, root=document)=> root.querySelector(sel);
function ensureHost(){
  let host = $('#'+INSPECTOR_ID);
  if (!host){
    host = document.createElement('div');
    host.id = INSPECTOR_ID; host.hidden = true;
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
function emit(names){ names.forEach(n=>dispatchEvent(new CustomEvent(n))); }

class TabRegistry{
  constructor(){ this._tabs = new Map(); this._active = null; }
  register(name, init){ this._tabs.set(name, {init, panelEl:null, buttonEl:null});
    if (UIInspector._initialized) UIInspector._mountTab(name);
  }
  names(){ return [...this._tabs.keys()]; }
}

const UIInspector = {
  _initialized:false, _tabs:new TabRegistry(), _logs:[],

  registerTab(name, initFn){ this._tabs.register(name, initFn); },
  log(entry){
    const time = new Date().toLocaleTimeString();
    this._logs.push({time, ...entry});
    const panel = $('#'+INSPECTOR_ID+' .insp-panel-block[data-tab="Logs"]');
    panel?.dispatchEvent(new CustomEvent('insp:logs:add', {detail: entry}));
  },
  _mountTab(name){
    const host = ensureHost();
    const tabsEl = host.querySelector('.insp-tabs');
    const contEl = host.querySelector('.insp-content');

    const panel = document.createElement('section');
    panel.className = 'insp-panel-block'; panel.dataset.tab = name;

    const btn = document.createElement('button');
    btn.className = 'insp-tab'; btn.setAttribute('role','tab'); btn.textContent = name;
    btn.addEventListener('click', ()=> this.activate(name));

    const rec = this._tabs._tabs.get(name);
    rec.panelEl = panel; rec.buttonEl = btn;
    tabsEl.appendChild(btn); contEl.appendChild(panel);

    try{ rec.init(panel, this); }catch(e){ console.error('[inspector] init tab', name, e); }
    if (!this._tabs._active) this.activate(name);
  },
  _ensureInitialized(){
    if (this._initialized) return;
    ensureHost();
    for (const n of this._tabs.names()) this._mountTab(n);
    EVT_ALIAS_REQ.forEach(alias=>{
      addEventListener(alias, ()=>{
        if (alias.endsWith('open'))   this.open();
        if (alias.endsWith('close'))  this.close();
        if (alias.endsWith('toggle')) this.toggle();
      });
    });
    this._initialized = true;
  },
  open(){ this._ensureInitialized(); setBodyFlag(true);  emit(EVT_CB_OPEN); },
  close(){                          setBodyFlag(false); emit(EVT_CB_CLOSE); },
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

window.UIInspector = UIInspector;
// Moderner Alias, falls irgendwo erwartet:
window.Inspector = window.Inspector || {
  open:  ()=>UIInspector.open(),
  close: ()=>UIInspector.close(),
  toggle:()=>UIInspector.toggle()
};
