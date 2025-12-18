(function(){
  const map = {
    'cb:game-start': 'cb:game:start',
    'req:game-start': 'req:game:start',
    'cb:game-continue': 'cb:game:continue',
    'req:game-continue': 'req:game:continue',
  };

  Object.keys(map).forEach(oldName=>{
    window.addEventListener(oldName, (ev)=>{
      try {
        window.dispatchEvent(new CustomEvent(map[oldName], { detail: ev.detail }));
      } catch {}
    });
  });
})();
