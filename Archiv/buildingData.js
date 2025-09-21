// =====================
// buildingData.js – Version 15
// =====================

const buildingTypes = [
    { id: "hq", name: "Hauptquartier", cost: 100 },
    { id: "depot", name: "Depot", cost: 50 },
    { id: "woodcutter", name: "Holzfäller", cost: 50 },

    // Neue Gebäude
    { id: "farm", name: "Bauernhof", cost: 80 },
    { id: "bakery", name: "Bäckerei", cost: 60 },
    { id: "sawmill", name: "Sägewerk", cost: 70 },
    { id: "smithy", name: "Schmiede", cost: 90 },
    { id: "builderhut", name: "Bauhütte", cost: 40 },
    { id: "wheatfield", name: "Getreidefeld", cost: 20 }
];

// UI – Auswahl Buttons erstellen
const uiContainer = document.getElementById("buildingButtons");
uiContainer.innerHTML = "";

buildingTypes.forEach(bt => {
    const btn = document.createElement("button");
    btn.textContent = bt.name;
    btn.onclick = () => {
        selectedBuildingType = bt.id;
    };
    uiContainer.appendChild(btn);
});
