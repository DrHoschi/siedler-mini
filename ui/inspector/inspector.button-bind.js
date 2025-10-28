// Datei   : inspector.button-bind.js
// Pfad    : ui/inspector/inspector.button-bind.js
// Version : v1.0.0

  (() => {
    const btn = document.getElementById('inspector-toggle');
    if(!btn) return;

    const open = () => document.body.classList.add('inspector-open');
    const close = () => document.body.classList.remove('inspector-open');
    const toggle = () => document.body.classList.toggle('inspector-open');

    // Klick: Open/Close
    btn.addEventListener('click', toggle);

    // Optional (falls du schon Events nutzt):
    window.addEventListener('req:inspector:open', open);
    window.addEventListener('req:inspector:close', close);
    window.addEventListener('req:inspector:toggle', toggle);

    // Sichtbarkeits-Check (Debug kurz aktiv lassen, dann entfernen)
    console.log('[inspector-toggle] ready, z:', getComputedStyle(btn).zIndex);
  })();
