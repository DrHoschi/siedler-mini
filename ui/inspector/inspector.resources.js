/* ============================================================================
 * Datei   : ui/inspector/inspector.resources.js
 * Projekt : Neue Siedler – Inspector (Resources-Tab)
 * Version : v25.10.29-devtools
 *
 * Features:
 *   • Anzeige aller Ressourcen (auch ungenutzte)
 *   • Live-Updates (Snapshot / cb:res:change)
 *   • Export JSON / CSV
 *   • Filter / Suche / Sortierung / Auto-Refresh
 *   • "Cheat-Panel": Ressourcen hinzufügen / entfernen / setzen
 *   • Header mit „×“-Button zum Schließen
 *
 * Events (Outbound)
 *   - req:res:snapshot
 *   - cb:res:change {id,old,value}      (manuelles Add/Sub)
 *   - cb:res:set    {id,value}          (direktes Setzen)
 *
 * Events (Inbound)
 *   - cb:res:snapshot / cb:res:change / cb:res:reset
 *   - cb:registry:ready
 *   - cb:insp:tab:change
 * ========================================================================== */
(function(){
  'use strict';

  const TAG='[inspector.resources]';
  const LOG = (window.CBLog?.info  || console.info ).bind(console, TAG);
  const OK  = (window.CBLog?.ok    || console.log  ).bind(console, TAG);
  const WRN = (window.CBLog?.warn  || console.warn ).bind(console, TAG);
  const ERR = (window.CBLog?.error || console.error).bind(console, TAG);

  const mount = (window.__INSPECTOR_CORE__?.api?.mount
              || window.Inspector?.mount
              || window.UIInspector?.mount);
  if (!mount) { WRN('Kein Inspector-Core gefunden – Tab wird nicht registriert'); return; }

  const $  = (s, r=document)=>r.querySelector(s);
  const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));
  const toKey = v => String(v??'').trim();

  // ---------------------------------------------------------------------------
  // [Datenquellen & Hilfsfunktionen]
  // ---------------------------------------------------------------------------
  function getResRaw(){
    const R = window.Registry || {};
    return R.resources || R.data?.resources || window.RegistryValues || null;
  }

  function getResDefs(){
    try {
      const R = window.Registry || {};
      if (typeof R.list === 'function') {
        const arr = R.list('resources');
        if (Array.isArray(arr)) return arr;
      }
    } catch(_){}
    return [];
  }

  function normalizeDefs(arr){
    return (arr||[]).map((r,i)=>{
      const id=toKey(r.id||r.name);
      return {
        id,
        name:r.name||id,
        icon:r.icon||`assets/icons/resources/${id}.png`,
        epoche:Number(r.epoche||1),
        order:Number(r.order??(1000+i))
      };
    }).filter(r=>r.id);
  }

  function snapshotFromRaw(raw){
    const out={};
    if (Array.isArray(raw)){
      raw.forEach(x=>{ if (x?.id) out[toKey(x.id)]=Number(x.value||x.amount||0); });
      return out;
    }
    if (raw && typeof raw==='object'){
      Object.entries(raw).forEach(([k,v])=>out[toKey(k)]=Number(v?.value??v??0));
      return out;
    }
    return {};
  }

  // ---------------------------------------------------------------------------
  // [Zustand]
  // ---------------------------------------------------------------------------
  let DEF_LIST=[], DEF_MAP={}, rows=[], lastSnap={};
  let sortKey='id', sortDir=1, filterQ='', onlyPositive=false;

  function computeRows(snap){
    const ids = new Set([...Object.keys(DEF_MAP), ...Object.keys(snap)]);
    return Array.from(ids).sort((a,b)=>{
      const oa=DEF_MAP[a]?.order??9999, ob=DEF_MAP[b]?.order??9999;
      if (oa!==ob) return oa-ob;
      return a.localeCompare(b);
    }).map(id=>{
      const def=DEF_MAP[id]||{id,name:id,epoche:1,icon:`assets/icons/resources/${id}.png`};
      const val=Number(snap[id]||0);
      const delta=(id in lastSnap)?val-Number(lastSnap[id]||0):0;
      return {...def,value:val,delta};
    });
  }

  // ---------------------------------------------------------------------------
  // [Renderer]
  // ---------------------------------------------------------------------------
  mount('resources', async (host)=>{
    host.innerHTML=`
      <div class="insp-frame">
        <div class="insp-header">
          <h3>Ressourcen</h3>
          <button class="insp-close" title="Inspector schließen">×</button>
        </div>

        <div class="insp-content">
          <div class="pad">

            <!-- Toolbar -->
            <div class="toolbar" style="flex-wrap:wrap;gap:8px;align-items:center">
              <button class="insp-btn" id="r-refresh">Refresh</button>
              <button class="insp-btn" id="r-snapshot">Snapshot</button>
              <button class="insp-btn" id="r-export">Export JSON</button>
              <button class="insp-btn" id="r-csv">Export CSV</button>

              <input id="r-q" class="insp-btn" placeholder="Suche (ID/Name)">
              <label class="hint"><input type="checkbox" id="r-only"> nur > 0</label>

              <span id="r-hint" class="hint"></span>
            </div>

            <!-- Cheat-Panel -->
            <div class="toolbar" style="flex-wrap:wrap;gap:8px;margin-top:8px;background:#252525;padding:6px 8px;border-radius:6px">
              <strong>Cheat-Panel:</strong>
              <input id="r-add-id" class="insp-btn" placeholder="Ressourcen-ID" style="min-width:120px">
              <input id="r-add-val" class="insp-btn" type="number" placeholder="Menge" style="width:90px">
              <button class="insp-btn" id="r-add-plus">+</button>
              <button class="insp-btn" id="r-add-minus">–</button>
              <button class="insp-btn" id="r-add-set">Wert setzen</button>
            </div>

            <!-- Tabelle -->
            <div id="r-info" class="hint" style="margin:8px 0"></div>
            <div style="overflow:auto; max-height:55vh; border:1px solid #444; border-radius:6px">
              <table class="inspector-table" id="r-table">
                <thead>
                  <tr>
                    <th></th><th data-k="id">ID</th><th data-k="name">Name</th>
                    <th data-k="epoche" style="width:70px">Epoche</th>
                    <th data-k="value"  style="width:90px">Menge</th>
                    <th data-k="delta"  style="width:90px">Δ</th>
                  </tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>

            <div id="r-empty" class="warn" style="display:none;margin-top:8px">
              <strong>Keine Ressourcen gefunden.</strong>
            </div>
          </div>
        </div>
      </div>
    `;

    $('.insp-close',host)?.addEventListener('click',()=>window.Inspector?.close());
    const ui={
      hint:$('#r-hint',host),
      info:$('#r-info',host),
      empty:$('#r-empty',host),
      tbody:$('#r-table tbody',host),
      head:$('#r-table thead',host),
      q:$('#r-q',host),
      only:$('#r-only',host),
      addId:$('#r-add-id',host),
      addVal:$('#r-add-val',host),
      addPlus:$('#r-add-plus',host),
      addMinus:$('#r-add-minus',host),
      addSet:$('#r-add-set',host)
    };

    function hint(t){ui.hint.textContent=t;setTimeout(()=>ui.hint.textContent='',1200);}

    function renderTable(){
      let data=rows.filter(r=>{
        if (onlyPositive && !(r.value>0)) return false;
        if (filterQ){
          const q=filterQ.toLowerCase();
          return (`${r.id} ${r.name}`).toLowerCase().includes(q);
        }
        return true;
      }).sort((a,b)=>{
        const A=a[sortKey],B=b[sortKey];
        if(typeof A==='number'||typeof B==='number')return (A-B)*sortDir;
        return A.toString().localeCompare(B.toString())*sortDir;
      });
      ui.tbody.innerHTML=data.map(r=>{
        const dc=r.delta>0?'#3bd16f':r.delta<0?'#f87171':'#999';
        return `<tr>
          <td><img src="${r.icon}" style="width:22px;height:22px;object-fit:contain"></td>
          <td><code>${r.id}</code></td>
          <td>${r.name}</td>
          <td style="text-align:right">${r.epoche}</td>
          <td style="text-align:right">${r.value}</td>
          <td style="text-align:right;color:${dc}">${r.delta>0?`+${r.delta}`:r.delta}</td>
        </tr>`;
      }).join('');
      ui.info.textContent=`Einträge: ${rows.length}`;
      ui.empty.style.display=rows.length?'none':'';
    }

    async function refresh(){
      const defs=normalizeDefs(getResDefs());
      DEF_LIST=defs; DEF_MAP=Object.fromEntries(defs.map(d=>[d.id,d]));
      const raw=getResRaw(); const snap=snapshotFromRaw(raw);
      rows=computeRows(snap);
      renderTable(); lastSnap=Object.assign({},snap);
      OK('Refresh',{rows:rows.length});
    }

    function exportJSON(){
      const blob=new Blob([JSON.stringify(rows,null,2)],{type:'application/json'});
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download='resources.json';a.click();URL.revokeObjectURL(a.href);
      hint('JSON exportiert');
    }

    function exportCSV(){
      const lines=['id;name;value;delta'];
      rows.forEach(r=>lines.push(`${r.id};${r.name};${r.value};${r.delta}`));
      const blob=new Blob([lines.join('\n')],{type:'text/csv'});
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download='resources.csv';a.click();URL.revokeObjectURL(a.href);
      hint('CSV exportiert');
    }

    // ----------------------------- Cheat Panel -------------------------------
    function cheatModify(sign){
      const id=toKey(ui.addId.value);
      const val=Number(ui.addVal.value||0);
      if(!id||!val)return hint('ID/Menge fehlt');
      const current=rows.find(r=>r.id===id)?.value||0;
      const newVal=current+(sign*val);
      dispatchEvent(new CustomEvent('cb:res:change',{detail:{id,old:current,value:newVal}}));
      hint(`${sign>0?'+':'-'} ${val} ${id}`);
    }

    function cheatSet(){
      const id=toKey(ui.addId.value);
      const val=Number(ui.addVal.value||0);
      if(!id)return hint('ID fehlt');
      dispatchEvent(new CustomEvent('cb:res:set',{detail:{id,value:val}}));
      dispatchEvent(new CustomEvent('cb:res:change',{detail:{id,old:0,value:val}}));
      hint(`${id} = ${val}`);
    }

    ui.addPlus.addEventListener('click',()=>cheatModify(+1));
    ui.addMinus.addEventListener('click',()=>cheatModify(-1));
    ui.addSet.addEventListener('click',cheatSet);

    // ------------------------------ Events -----------------------------------
    $('#r-refresh',host).addEventListener('click',refresh);
    $('#r-snapshot',host).addEventListener('click',()=>dispatchEvent(new Event('req:res:snapshot')));
    $('#r-export',host).addEventListener('click',exportJSON);
    $('#r-csv',host).addEventListener('click',exportCSV);
    ui.q.addEventListener('input',()=>{filterQ=ui.q.value.trim();renderTable();});
    ui.only.addEventListener('change',()=>{onlyPositive=ui.only.checked;renderTable();});
    ui.head.addEventListener('click',e=>{
      const th=e.target.closest('th');if(!th)return;
      const k=th.dataset.k;if(!k)return;
      if(sortKey===k)sortDir*=-1;else{sortKey=k;sortDir=1;}
      renderTable();
    });

    addEventListener('cb:res:snapshot',e=>{
      const raw=e?.detail?.resources||{};rows=computeRows(snapshotFromRaw(raw));
      renderTable();lastSnap=snapshotFromRaw(raw);
      hint('Snapshot aktualisiert');
    });
    addEventListener('cb:res:change',e=>{
      const d=e?.detail||{};const id=toKey(d.id);const val=Number(d.value??0);
      const i=rows.findIndex(r=>r.id===id);
      if(i>=0){rows[i].delta=val-rows[i].value;rows[i].value=val;}else{
        rows.push({id,name:id,icon:`assets/icons/resources/${id}.png`,epoche:1,value:val,delta:0});
      }
      renderTable();
    });

    addEventListener('cb:insp:tab:change',e=>{
      if((e.detail?.tab||'')==='resources')refresh();
    });

    // ------------------------------ Start ------------------------------------
    await refresh();
    OK('bereit v25.10.29-devtools');
  });
})();
