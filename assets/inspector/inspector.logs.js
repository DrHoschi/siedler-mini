/* ============================================================================
 * Datei: assets/inspector/inspector.logs.js
 * Projekt: Siedler-Mini
 * Version: v18.11.0
 *
 * Zweck:
 *   - Log-Tab UI (Filter, Badges, Suche, Kopieren/Export)
 *   - Striktes Slot-Rendering in Inspector-Slots (KEIN body-Append!)
 *   - Safety-Hook: Historie sofort beim Öffnen rendern (ohne Tab-Wechsel)
 * ========================================================================== */
(function(){
  "use strict";

  var MOD = "[inspector.logs]";
  var VER = "v18.11.0";
  var core = window.__INSPECTOR_CORE__;
  if (!core || !core.api || typeof core.api.mount !== "function"){
    console.warn(MOD, "core API fehlt – breche ab.");
    return;
  }

  var info = (...a)=> (window.CBLog?.info || console.log)(MOD, ...a);
  var warn = (...a)=> (window.CBLog?.warn || console.warn)(MOD, ...a);

  // --- Slotsucher ------------------------------------------------------------
  function qSlot(name){
    return core.api.getSlot?.(name)
        || document.getElementById("ins-"+name)
        || document.querySelector("#inspector .slot-"+name);
  }

  // --- Level / Mapping -------------------------------------------------------
  var LVL_CLASS = { info:"log-info", ok:"log-ok", warn:"log-warn", err:"log-error", error:"log-error",
                    INFO:"log-info", OK:"log-ok", WARN:"log-warn", ERR:"log-error" };

  function detectLevel(line){
    if (!line) return "info";
    if (typeof line === "object"){
      return (line.lvl || line.level || "info").toString().toLowerCase();
    }
    var s = String(line);
    if (/\bERR(OR)?\b/i.test(s))  return "err";
    if (/\bWARN(ING)?\b/i.test(s))return "warn";
    if (/\bOK\b/i.test(s))        return "ok";
    if (/\bINFO\b/i.test(s))      return "info";
    return "info";
  }
  function toText(line){
    if (!line && line !== 0) return "";
    if (typeof line === "object"){
      var t   = line.t || line.time || "";
      var src = line.src || line.source || "";
      var msg = line.msg ?? line.message ?? line.text ?? JSON.stringify(line);
      return t ? ("["+t+"] "+(src?src+" ":"")+msg) : ((src?src+" ":"")+msg);
    }
    return String(line);
  }

  // --- Puffer / Stream -------------------------------------------------------
  var raw = [];       // Rohpuffer (Objekte/Strings)
  var lastLen = 0;
  var poll = null;

  function readBuffer(){
    try{
      var buf = window.CBLog?.getBuffer?.();
      return Array.isArray(buf) ? buf.slice() : [];
    }catch(_){ return []; }
  }
  function onAppend(entry){
    raw.push(entry);
    pushLine(entry);        // inkrementell anzeigen
  }
  function startStream(){
    raw = readBuffer();
    lastLen = raw.length;

    if (typeof window.CBLog?.on === "function"){
      try{
        window.CBLog.on("append", onAppend);
        info("Stream verbunden (append)");
        return;
      }catch(_){}
    }
    // Fallback: Poll
    poll = window.setInterval(function(){
      var buf = readBuffer();
      if (buf.length !== lastLen){
        var diff = buf.slice(lastLen);
        lastLen = buf.length;
        diff.forEach(onAppend);
      }
    }, 800);
    warn("nutze Poll-Fallback (kein CBLog.on)");
  }
  function stopStream(){
    if (poll) window.clearInterval(poll);
    poll = null;
    if (typeof window.CBLog?.off === "function"){
      try{ window.CBLog.off("append", onAppend); }catch(_){}
    }
  }

  // --- UI-State --------------------------------------------------------------
  var state = { showInfo:true, showOk:true, showWarn:true, showErr:true, query:"", counts:{info:0,ok:0,warn:0,err:0} };
  var els   = { view:null, search:null, bInfo:null, bOk:null, bWarn:null, bErr:null };

  function buildControls(){
    var host = qSlot("logs-controls"); if (!host) return;
    host.innerHTML = "";

    var wrap = document.createElement("div");
    wrap.className = "ins-controls";

    function mkToggle(label, key, title){
      var b = document.createElement("button");
      b.className = "ins-toggle";
      b.dataset.key = key;
      b.textContent = label;
      if (state[key]) b.classList.add("active");
      if (title) b.title = title;
      b.addEventListener("click", function(){
        state[key] = !state[key];
        b.classList.toggle("active", !!state[key]);
        renderList();
      });
      return b;
    }
    function mkBadge(){ var s=document.createElement("span"); s.className="ins-badge"; s.textContent="0"; return s; }

    var tInfo = mkToggle("INFO","showInfo","Info ein/aus");
    var bInfo = mkBadge(); tInfo.appendChild(bInfo); els.bInfo=bInfo;

    var tOk   = mkToggle("OK","showOk","OK ein/aus");
    var bOk   = mkBadge(); tOk.appendChild(bOk); els.bOk=bOk;

    var tWarn = mkToggle("WARN","showWarn","Warnungen ein/aus");
    var bWarn = mkBadge(); tWarn.appendChild(bWarn); els.bWarn=bWarn;

    var tErr  = mkToggle("ERR","showErr","Fehler ein/aus");
    var bErr  = mkBadge(); tErr.appendChild(bErr); els.bErr=bErr;

    var search = document.createElement("input");
    search.type = "search";
    search.placeholder = "Suche…";
    search.className = "ins-search";
    search.addEventListener("input", function(){
      state.query = (search.value||"").trim().toLowerCase();
      renderList();
    });
    els.search = search;

    var btnCopy = document.createElement("button");
    btnCopy.textContent = "Kopieren";
    btnCopy.addEventListener("click", async function(){
      try{
        var lines = Array.from(els.view?.querySelectorAll("div")||[]).map(function(n){return n.textContent||"";});
        await navigator.clipboard.writeText(lines.join("\n"));
        flash(btnCopy);
      }catch(_){ alert("Kopieren nicht möglich (Clipboard)"); }
    });

    var btnExport = document.createElement("button");
    btnExport.textContent = "Export";
    btnExport.addEventListener("click", function(){
      var lines = Array.from(els.view?.querySelectorAll("div")||[]).map(function(n){return n.textContent||"";});
      var blob = new Blob([lines.join("\n")], {type:"text/plain"});
      var url  = URL.createObjectURL(blob);
      var a    = document.createElement("a");
      a.href=url; a.download="logs.txt";
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    });

    wrap.append(tInfo, tOk, tWarn, tErr, search, btnCopy, btnExport);
    host.appendChild(wrap);
  }

  function flash(el){
    el.classList.add("ins-flash");
    setTimeout(function(){ el.classList.remove("ins-flash"); }, 600);
  }

  function mountView(){
    var host = qSlot("logs-view"); if (!host) return;
    host.innerHTML = "";
    var box = document.createElement("div");
    box.className = "ins-logview"; // wichtig: bekommt overflow-y:auto per CSS
    box.style.cssText = "min-height:0;max-height:100%;overflow:auto;";
    host.appendChild(box);
    els.view = box;
  }

  function resetCounters(){
    state.counts.info = state.counts.ok = state.counts.warn = state.counts.err = 0;
  }
  function updateBadges(){
    if (els.bInfo) els.bInfo.textContent = String(state.counts.info);
    if (els.bOk)   els.bOk.textContent   = String(state.counts.ok);
    if (els.bWarn) els.bWarn.textContent = String(state.counts.warn);
    if (els.bErr)  els.bErr.textContent  = String(state.counts.err);
  }

  function renderList(){
    if (!els.view) return;
    var q = state.query;
    resetCounters();

    var frag = document.createDocumentFragment();
    for (var i=0;i<raw.length;i++){
      var obj = raw[i];
      var txt = toText(obj);
      var lvl = detectLevel(obj).toLowerCase();

      if (lvl in state.counts) state.counts[lvl]++;

      // Levelfilter
      if ((lvl==="info"&&!state.showInfo) || (lvl==="ok"&&!state.showOk) ||
          (lvl==="warn"&&!state.showWarn) || (lvl==="err"&&!state.showErr)) continue;

      // Textfilter
      if (q && !txt.toLowerCase().includes(q)) continue;

      var line = document.createElement("div");
      line.className = LVL_CLASS[lvl] || "log-info";
      line.textContent = txt;
      frag.appendChild(line);
    }
    els.view.innerHTML = "";
    els.view.appendChild(frag);
    els.view.scrollTop = els.view.scrollHeight;
    updateBadges();
  }

  function pushLine(entry){
    if (!els.view) return;
    var txt = toText(entry);
    var lvl = detectLevel(entry).toLowerCase();
    if (lvl in state.counts) state.counts[lvl]++;

    var passLevel = (lvl!=="info"||state.showInfo) && (lvl!=="ok"||state.showOk) &&
                    (lvl!=="warn"||state.showWarn) && (lvl!=="err"||state.showErr);
    var passText  = !state.query || txt.toLowerCase().includes(state.query);

    if (passLevel && passText){
      var div = document.createElement("div");
      div.className = LVL_CLASS[lvl] || "log-info";
      div.textContent = txt;
      els.view.appendChild(div);
      els.view.scrollTop = els.view.scrollHeight;
    }
    updateBadges();
  }

  // --- SAFETY-HOOK: Historie beim Öffnen sofort laden -----------------------
  (function attachOpenOnce(){
    if (window.__INS_LOGS_AUTO__) return;
    window.__INS_LOGS_AUTO__ = true;

    function pumpHistoryAndStart(){
      try{
        raw = readBuffer();
        lastLen = raw.length;
      }catch(_){ raw=[]; lastLen=0; }
      // Falls UI schon gemountet ist, direkt rendern
      renderList();
      startStream();
    }

    // Beim Öffnen initial befüllen
    window.addEventListener("cb:inspector-open", pumpHistoryAndStart);

    // Optional stoppen beim Schließen
    window.addEventListener("cb:inspector-close", stopStream);
  })();

  // --- Tab-Mount registrieren -----------------------------------------------
  core.api.mount("logs", function onMount(){
    buildControls();
    mountView();

    // Wenn Inspector bereits offen ist, sofort füllen
    if (document.body.classList.contains("inspector-open")){
      raw = readBuffer(); lastLen = raw.length;
      renderList();
      startStream();
    }
    info("bereit", VER);

    // Unmount
    return function onUnmount(){
      stopStream();
    };
  });
})();
