(() => {
  function init(){
    window.addEventListener("cb:build:ready",(e)=>{
      const box=document.getElementById("insp-build");
      if(box) box.textContent=JSON.stringify(e.detail||{info:"ready"},null,2);
    });
  }
  document.addEventListener("DOMContentLoaded",init);
})();
