(() => {
  document.addEventListener("DOMContentLoaded",()=>{
    const div=document.getElementById("insp-tests");
    if(!div)return;
    div.innerHTML=`
      <button onclick="UIInspector.open()">Open</button>
      <button onclick="UIInspector.close()">Close</button>
      <button onclick="UIInspector.toggle()">Toggle</button>`;
  });
})();
