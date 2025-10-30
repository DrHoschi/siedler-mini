(() => {
  document.addEventListener("DOMContentLoaded",()=>{
    window.dispatchEvent(new CustomEvent("cb:res:change",{detail:{list:{Holz:5,Stein:3,Fisch:2}}}));
  });
})();
