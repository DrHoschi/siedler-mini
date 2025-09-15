/* ============================================================================
 * ui-build.js — Tabbed Bau-Menü (2 Zeilen sichtbar, Rest scrollbar)
 * Version: v17.0.2
 * Projekt: Siedler-Mini
 * ========================================================================== */
(function(){
  'use strict';
  var MOD = '[ui-build]';
  var Bridge = window.BuildDataBridge;

  var EVT_CATS_READY = 'cb:build-categories-ready';
  var EVT_UI_READY   = 'ui:build:ready';
  var EVT_SELECT     = 'ui:build:select';

  var ROW_HEIGHT_PX  = 64;
  var ROW_GAP_PX     = 6;
  var HEADER_H_PX    = 36;
  var PAD_V_PX       = 8;

  function log(){ try{ console.log.apply(console, arguments); }catch(_){} }
  function qs(sel, root){ return (root||document).querySelector(sel); }
  function qsa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

  function ensureBaseStyles(){
    if(document.getElementById('ui-build-base-styles')) return;
    var css =
      '.ui-build{position:relative;display:flex;flex-direction:column;width:100%;' +
      '  background:var(--build-bg, rgba(0,0,0,0.25));border-top:1px solid rgba(255,255,255,0.06);}' +
      '.ui-build__tabs{display:flex;align-items:center;gap:8px;height:'+HEADER_H_PX+'px;padding:0 8px;' +
      '  background:var(--build-tabs-bg, rgba(0,0,0,0.15));border-bottom:1px solid rgba(255,255,255,0.06);overflow-x:auto;}' +
      '.ui-build__tab{flex:0 0 auto; padding:6px 10px; cursor:pointer; border-radius:6px;' +
      '  color:var(--text-muted,#cfd6e6); background:transparent; border:1px solid transparent; user-select:none; font-size:13px;}' +
      '.ui-build__tab[aria-selected="true"]{ color:#fff; background:rgba(255,255,255,0.08); border-color:rgba(255,255,255,0.15);}' +
      '.ui-build__body{ position:relative; padding:'+PAD_V_PX+'px 8px; }' +
      '.ui-build__viewport{ overflow:auto; max-height:'+(PAD_V_PX*2 + ROW_HEIGHT_PX*2 + ROW_GAP_PX)+'px; }' +
      '.ui-build__grid{ display:grid; grid-template-columns:repeat(auto-fill, minmax(96px,1fr)); gap:6px; }' +
      '.ui-build__btn{ display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px;' +
      '  height:'+ROW_HEIGHT_PX+'px; padding:6px 6px; border-radius:8px; cursor:pointer; user-select:none;' +
      '  background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); }' +
      '.ui-build__btn:hover{ background:rgba(255,255,255,0.07); }' +
      '.ui-build__btn:active{ transform:translateY(1px); }' +
      '.ui-build__icon{ width:28px; height:28px; object-fit:contain; }' +
      '.ui-build__label{ font-size:12px; line-height:1.1; text-align:center; color:#e9eefb; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; }' +
      '.ui-build__empty{ color:#9fb0cf; font-size:13px; padding:8px; }';
    var style = document.createElement('style');
    style.id = 'ui-build-base-styles';
    style.type = 'text/css';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function createEl(tag, cls, text){
    var el = document.createElement(tag);
    if(cls) el.className = cls;
    if(text) el.textContent = text;
    return el;
  }
  function dispatch(name, detail){
    var evt = new CustomEvent(name, { detail: detail || {} });
    window.dispatchEvent(evt);
  }

  function BuildDock(opts){
    this.root = opts.root || null;
    this.categories = opts.categories || [];
    this.activeCatId = this.categories[0] ? this.categories[0].id : null;
    this.elements = { tabs:null, viewport:null, grid:null };
  }

  BuildDock.prototype.render = function(){
    ensureBaseStyles();

    // → Wenn #build-panel existiert, dort mounten; sonst body
    var mount = qs('#build-panel') || document.body;
    var container = this.root || createEl('div','ui-build');
    if(!this.root){ mount.appendChild(container); }

    var tabs = createEl('div','ui-build__tabs');
    var self = this;
    this.categories.forEach(function(cat){
      var t = createEl('button','ui-build__tab', cat.title || cat.id);
      t.setAttribute('type','button');
      t.dataset.id = cat.id;
      t.setAttribute('aria-selected', (cat.id === self.activeCatId) ? 'true' : 'false');
      t.addEventListener('click', function(){
        self.activeCatId = cat.id;
        qsa('.ui-build__tab', tabs).forEach(function(b){
          b.setAttribute('aria-selected', b.dataset.id === self.activeCatId ? 'true' : 'false');
        });
        self._renderGrid();
      });
      tabs.appendChild(t);
    });

    var body = createEl('div','ui-build__body');
    var viewport = createEl('div','ui-build__viewport');
    var grid = createEl('div','ui-build__grid');

    viewport.appendChild(grid);
    body.appendChild(viewport);
    container.innerHTML = '';
    container.appendChild(tabs);
    container.appendChild(body);

    this.elements.tabs = tabs;
    this.elements.viewport = viewport;
    this.elements.grid = grid;

    this._renderGrid();
    return container;
  };

  BuildDock.prototype._getActiveItems = function(){
    var active = this.categories.find(function(c){ return c.id === this.activeCatId; }, this);
    return active ? (active.items || []) : [];
  };

  BuildDock.prototype._renderGrid = function(){
    var grid = this.elements.grid;
    grid.innerHTML = '';
    var items = this._getActiveItems();
    if(!items || !items.length){
      grid.appendChild(createEl('div','ui-build__empty','Keine Einträge in dieser Kategorie.'));
      return;
    }
    var self = this;
    items.forEach(function(item){
      var btn = createEl('button','ui-build__btn');
      btn.setAttribute('type','button');
      btn.title = item.label || item.id;

      var iconSrc = (Bridge && Bridge.getIconFor) ? Bridge.getIconFor(item.id) : (item.icon || '');
      var img = createEl('img','ui-build__icon');
      img.alt = item.label || item.id;
      img.src = iconSrc;

      var lab = createEl('div','ui-build__label', item.label || item.id);

      btn.appendChild(img);
      btn.appendChild(lab);
      btn.addEventListener('click', function(){
        dispatch(EVT_SELECT, { item: item });
      });

      grid.appendChild(btn);
    });
  };

  // ---------------------------- Lebenszyklus ---------------------------------
  var _dock = null;

  function init(categories, origin){
    try{
      _dock = new BuildDock({ categories: categories });
      var el = _dock.render();
      log(MOD, 'ready — Kategorien:', categories.length,
          'Items gesamt:', categories.reduce((n,c)=>n+(c.items?c.items.length:0),0),
          'origin:', origin||'unknown');
      dispatch(EVT_UI_READY, { el: el, categories: categories });
    } catch(err){
      console.error(MOD, 'Init-Fehler', err);
    }
  }

  function bootWithExisting(){
    if(Array.isArray(window.BUILD_CATEGORIES) && window.BUILD_CATEGORIES.length){
      init(window.BUILD_CATEGORIES, 'boot-existing');
      return true;
    }
    return false;
  }

  if(!bootWithExisting()){
    window.addEventListener(EVT_CATS_READY, function(ev){
      var cats = (ev && ev.detail && ev.detail.categories) ? ev.detail.categories : [];
      if(!cats.length) return;
      init(cats, ev.detail && ev.detail.source || 'event');
    });
  }

  // Öffentliche API (inkl. Legacy)
  window.UIBuild = {
    rerender: function(){
      if(_dock){
        document.querySelectorAll('.ui-build').forEach(function(el){ el.remove(); });
        _dock.render();
      } else if(Array.isArray(window.BUILD_CATEGORIES)){
        init(window.BUILD_CATEGORIES, 'manual');
      }
    },
    // Legacy-Signatur, damit alter Code/Watches nicht crasht (macht ein simples Redraw)
    setItems: function(cats){
      if(Array.isArray(cats) && cats.length){
        window.BUILD_CATEGORIES = cats;
      }
      this.rerender();
    }
  };
})();
