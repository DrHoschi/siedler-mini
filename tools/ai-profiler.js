// Beispiel: Im Inspector "Tools"-Tab ein weiteres Modul laden
fetch("tools/ai-profiler.js")
  .then(r => r.text())
  .then(js => eval(js));  // oder mit dynamic import(), falls als ES-Modul
