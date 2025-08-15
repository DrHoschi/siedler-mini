// =====================
// unitLogic.js – Version 15
// =====================

class Unit {
    constructor(type, x, y) {
        this.type = type; // "woodcutter", "carrier", "builder"
        this.x = x;
        this.y = y;
        this.target = null;
        this.speed = 1;
        this.color = type === "carrier" ? "yellow" : "white";
    }

    update() {
        if (!this.target) return;

        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 2) {
            this.reachTarget();
        } else {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }
    }

    reachTarget() {
        if (this.type === "woodcutter") {
            // Holz abliefern: Depot bevorzugen, wenn näher
            let depot = findNearestBuilding("depot", this.x, this.y);
            let hq = findNearestBuilding("hq", this.x, this.y);

            if (depot && distance(this, depot) < distance(this, hq)) {
                this.target = depot;
            } else {
                this.target = hq;
            }
        }
        if (this.type === "carrier") {
            // Träger bringt Waren HQ <-> Depot
            let depot = findNearestBuilding("depot", this.x, this.y);
            let hq = findNearestBuilding("hq", this.x, this.y);

            this.target = (this.target === depot) ? hq : depot;
        }
    }
}

// Hilfsfunktionen
function distance(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function findNearestBuilding(type, x, y) {
    let nearest = null;
    let bestDist = Infinity;
    for (let b of buildings) {
        if (b.type === type) {
            let d = Math.sqrt((b.x - x) ** 2 + (b.y - y) ** 2);
            if (d < bestDist) {
                bestDist = d;
                nearest = b;
            }
        }
    }
    return nearest;
}

// Update-Loop
function updateUnits() {
    for (let u of units) {
        u.update();
    }
    requestAnimationFrame(updateUnits);
}

updateUnits();
