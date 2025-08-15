// =====================
// game.js – Version 15
// =====================

// Grund-Setup
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 1024;
canvas.height = 768;

let buildings = [];
let units = [];
let selectedBuildingType = null;
let mapTiles = []; // Falls schon existiert

// Texturen laden (bestehende + neue Platzhalter)
const textures = {
    grass: loadImage("assets/tex/topdown_grass.png"),
    road: loadImage("assets/tex/topdown_road_straight.png"),
    hq: loadImage("assets/tex/topdown_hq.png"),
    depot: loadImage("assets/tex/topdown_depot.png"),
    woodcutter: loadImage("assets/tex/topdown_woodcutter.png"),

    // Neue Gebäude – Platzhalter 64x64
    farm: loadImage("assets/tex/topdown_farm.png"),
    bakery: loadImage("assets/tex/topdown_bakery.png"),
    sawmill: loadImage("assets/tex/topdown_sawmill.png"),
    smithy: loadImage("assets/tex/topdown_smithy.png"),
    builderhut: loadImage("assets/tex/topdown_builderhut.png"),
    wheatfield: loadImage("assets/tex/topdown_wheatfield.png")
};

// Image Loader
function loadImage(src) {
    const img = new Image();
    img.src = src;
    return img;
}

// Gebäude platzieren
canvas.addEventListener("click", e => {
    if (!selectedBuildingType) return;
    const x = Math.floor(e.offsetX / 64) * 64;
    const y = Math.floor(e.offsetY / 64) * 64;

    // Check: kein anderes Gebäude an der Stelle
    if (buildings.some(b => b.x === x && b.y === y)) return;

    buildings.push({
        type: selectedBuildingType,
        x: x,
        y: y
    });
});

// Render
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Karte (Platzhalter)
    for (let y = 0; y < canvas.height; y += 64) {
        for (let x = 0; x < canvas.width; x += 64) {
            ctx.drawImage(textures.grass, x, y, 64, 64);
        }
    }

    // Gebäude
    for (let b of buildings) {
        ctx.drawImage(textures[b.type], b.x, b.y, 64, 64);
    }

    // Einheiten
    for (let u of units) {
        ctx.fillStyle = u.color || "yellow";
        ctx.beginPath();
        ctx.arc(u.x, u.y, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    requestAnimationFrame(draw);
}

draw();
