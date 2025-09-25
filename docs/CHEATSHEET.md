# 📘 Cheat-Sheet – HTML | CSS | JavaScript (Projekt: Neue Siedler)

Dieses Cheat-Sheet fasst die wichtigsten Elemente für unser Projekt zusammen.  
Es ist kein vollständiges Web-Handbuch – nur die **praktisch relevanten Bausteine**, die wir regelmäßig brauchen.

---

## 1. HTML – Grundgerüst & wichtige Elemente

| Kategorie       | Element / Beispiel | Zweck im Projekt |
|-----------------|-------------------|------------------|
| Grundrahmen     | `<!DOCTYPE html>`<br>`<html><head>…</head><body>…</body></html>` | Startseite, Basis für index.html |
| Head-Inhalte    | `<meta charset="utf-8">`<br>`<title>Neue Siedler</title>`<br>`<link rel="stylesheet" href="ui/ui-start.css?v=18.0.3">` | Sprache, Titel, Stylesheets |
| Hauptcontainer  | `<div id="app"></div>` | Wrapper für Spiel + UI |
| Spielfeld       | `<canvas id="gameCanvas"></canvas>` | Rendering des Spiels |
| Panels          | `<div id="start-panel"></div>`<br>`<div id="hud-top"></div>`<br>`<div id="build-dock"></div>`<br>`<div id="inspector"></div>` | Startfenster, HUD, Baumenü, Inspector |
| Buttons         | `<button id="btn-start">Start</button>` | Start/Debug/Reset |
| Listen/Tabs     | `<ul class="menu"><li>Holzfäller</li><li>Fischer</li></ul>` | Kategorien im Baumenü |
| Bilder/Icons    | `<img src="assets/ui/wood.png" alt="Holz">` | Ressourcen & Gebäude |
| Overlay/Modal   | `<div class="overlay">Debug Info</div>` | Popups, Tooltips |

---

## 2. CSS – wichtigste Styles

| Kategorie         | Beispiel | Zweck im Projekt |
|-------------------|----------|------------------|
| Reset             | `body,html {margin:0; padding:0;}` | sauberes Grundlayout |
| Layout/Position   | `display:flex;`<br>`position:absolute; top:0; left:0;` | HUD, Dock, Inspector platzieren |
| Größe/Abstände    | `width:200px; height:100%;`<br>`margin:5px; padding:10px;` | Panels & Buttons skalieren |
| Farben            | `background:#222; color:#fff;`<br>`opacity:0.9;` | Dark-Mode-Style, Panels |
| Fonts             | `font-family:sans-serif; font-size:14px;` | Lesbare UI |
| Rahmen            | `border:1px solid #444; border-radius:4px;` | Buttons & Panels |
| Hover/Active      | `button:hover {background:#555;}` | Buttons interaktiv machen |
| Responsive        | `@media (max-width:600px){…}` | Mobile-Optimierung (iPhone/iPad) |
| Z-Index           | `.overlay {z-index:1000;}` | Überlagerungen sichtbar machen |
| Transform/Scale   | `transform:scale(1.2);` | Animationen, Inspector vergrößern |

---

## 3. JavaScript – Grundlogik

| Kategorie         | Beispiel | Zweck im Projekt |
|-------------------|----------|------------------|
| DOM-Zugriff       | `document.getElementById("start-panel")` | Panels ansprechen |
| Event-Handling    | `btn.addEventListener("click", startGame)` | Buttons klickbar machen |
| Input             | `window.addEventListener("keydown", e=>{…})` | Tastatursteuerung |
| Variablen         | `let wood=0; const maxPop=50;` | Ressourcen, Limits |
| Objekte/Arrays    | `const buildings=[{id:"hq",cost:100}];` | Datenstruktur für Gebäude |
| Funktionen        | `function startGame(){ … }` | Spielstart, Debug-Funktionen |
| Klassen           | `class AssetManager { load(){…} }` | Core-Manager, Registry |
| Module            | `import {Assets} from "./core/asset.js";` | Code trennen & wiederverwenden |
| Logik             | `if(food<=0){gameOver();}` | Spielablauf |
| Schleifen         | `for(const b of buildings){ … }` | Iterationen über Listen |
| Fehler/Debug      | `try { … } catch(e){ console.error(e); }` | Stabilität, Debug-Logs |
| Dispatcher        | `dispatchEvent(new CustomEvent("build:select",{detail:{id:"woodcutter"}}))` | Events für Baumenü/Inspector |
| Rendering         | `ctx.drawImage(img,x,y); requestAnimationFrame(loop);` | Spielfeld malen |

---

## 4. Projekt-Tipp

- **HTML:** IDs sauber vergeben (`#start-panel`, `#hud-top`)  
- **CSS:** Ein zentrales Farb-/Layout-Schema (`:root { --bg:#222; --fg:#fff; }`)  
- **JS:** Module strikt halten (Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports)  

Damit bleibt der Code **sauber, erweiterbar und debug-freundlich**.
