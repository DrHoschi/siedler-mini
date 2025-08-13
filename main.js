import './render.js';
import './game.js';
import './world.js';
import './core/assets.js';
import './core/camera.js';
import './core/carriers.js';
import './core/input.js';

// Start-Button
document.getElementById('startButton').addEventListener('click', () => {
    startGame();
});

// Vollbild-Button
document.getElementById('fullscreenButton').addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.warn(`Vollbild-Fehler: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
});

// Globale Spielstart-Funktion
function startGame() {
    console.log("Spiel wird gestartet...");
    initGame();
}
