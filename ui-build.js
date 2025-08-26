/* ============================================================================
   Siedler-Mini – ui-build.js
   Version: v16.0.9
   Inhalte:
     - Bau-Menü (iPad-freundlich)
     - Tool-Auswahl + Platzierung auf Tipp
     - Logs mit Status-Icons
   ========================================================================== */
(() => {
  const VER = 'v16.0.9';
  const TOOLS = [
    {id:'road',     label:'Straße', icon:'🛣️'},
    {id:'path',     label:'Weg',    icon:'🚶'},
    {id:'bulldoze', label:'Abreißen', icon:'🧨'},
    {id:'house',    label:'Haus',   icon:'🏠'},
    {id:'factory',  label:'Fabrik', icon:'🏭'},
    {id:'cancel',   label:'Abbrechen', icon:'⛔'},
  ];

  const GameUIBuild = {
    active:null,
    mounted:false,

    ensureMounted(){
      if (this.mounted) return;
      const row = Game.buildRow;
      row.innerHTML = '';
      for (const t of TOOLS){
        const b = document.createElement('button');
        b.className = 'tool';
        b.innerHTML = `<b>${t.icon}</b><span>${t.label}</span>`;
        b.onclick = ()=> this.setTool(t.id, b);
        row.appendChild(b);
        t._el = b;
      }
      this._attachStageInput();
      this.mounted = true;
      Game.logOK(`Bau-Menü bereit (ui-build.js ${VER})`);
    },

    _attachStageInput(){
      const stage = Game.canvas;
      const pickCellFromEvt = (evt) => {
        const rect = stage.getBoundingClientRect();
        const x = (evt.clientX - rect.left);
        const y = (evt.clientY - rect.top);
        const {cx, cy} = Game.worldToCell(x, y);
        return {cx, cy};
      };
      const onTap = (evt) => {
        if (!this.active) return;
        if (this.active==='cancel') { this.setTool(null); return; }
        const {cx, cy} = pickCellFromEvt(evt);
        if (this.active==='road' || this.active==='path'){
          Game.place(this.active, cx, cy);
        } else if (this.active==='bulldoze'){
          Game.place('bulldoze', cx, cy);
        } else {
          // Gebäude
          Game.place(this.active, cx, cy);
        }
      };
      stage.addEventListener('pointerdown', onTap);
    },

    setTool(id, el){
      // Visual toggle
      for (const t of TOOLS){ t._el?.classList.remove('active'); }
      if (id && el) el.classList.add('active');
      this.active = id;
      if (!id) Game.logOK('Tool abgewählt');
      else Game.logOK(`Tool gesetzt: ${id}`);
    },

    toggle(){
      this.ensureMounted();
      const bar = Game.buildBar;
      const show = bar.style.display !== 'block';
      bar.style.display = show ? 'block' : 'none';
    }
  };

  window.GameUIBuild = GameUIBuild;
})();
