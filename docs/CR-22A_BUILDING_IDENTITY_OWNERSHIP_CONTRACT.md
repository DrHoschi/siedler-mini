# CR-22A – Building Identity & Ownership Contract

Status: **PASS / FROZEN**

Freeze-Gate: **PASS / 0 BLOCKER**  
Frozen-Basis: CR-21 `4cb7261dc2325767070177a68f951df69b7523fd`  
CR-22A Gate-CI: `fddaf91b55aca7d0ee287b6c5e1c96daa85feca6` – SUCCESS

## Zweck

CR-22A führt erstmals den minimalen fachlichen Identitäts- und Ownership-Vertrag einer Gebäudeinstanz ein.

Eine Gebäudeinstanz besitzt:

- eine stabile `buildingId` vom Stable-ID-Kind `building`,
- eine Referenz `definitionId` auf ihre fachliche Gebäudedefinition,
- einen unveränderlichen `ownerRef`, der das Gebäude selbst als späteren fachlichen Owner adressiert.

Verbindlicher Anker:

`BuildingId -> Building Owner -> spätere Building-bezogene Module`

Der `ownerRef` beschreibt ausdrücklich **keine Spieler-/Fraktionszugehörigkeit**. Er schafft ausschließlich den stabilen Building-Anker, an den spätere Systeme über die `BuildingId` andocken können.

## Im Scope

- Building-Identität validieren,
- Gebäudedefinition referenzieren,
- Building selbst als eindeutigen Owner-Anker ausdrücken,
- Vertrag und verschachtelte Owner-Referenz unveränderlich zurückgeben.

## Ausdrücklich nicht im Scope

CR-22A enthält keinerlei:

- Lifecycle-/Statuszustände,
- Registrierung, Lookup, Update oder Removal im Building-/World-Store,
- Residents / Haushalte / Kinder / Nachwuchs,
- BirthTimer oder sonstige Population-Timer,
- Workforce / Worker / Profession,
- Kleidung oder Werkzeuge,
- Produktion,
- Stock / Storage / Inventory,
- Construction / Bauphasen / Progress,
- Transport- oder Job-Erzeugung,
- Rendering oder UI.

Diese Verantwortungen bleiben späteren CRs vorbehalten.

## Abgrenzung innerhalb CR-22

- **CR-22A:** Building Identity & Ownership Contract – **FROZEN**
- **CR-22B:** Building Lifecycle State Contract
- **CR-22C:** Building Registration & World Ownership Integration

CR-22A darf deshalb auch nach dem Freeze keine Lifecycle- oder Registry-Logik aufnehmen. Änderungen an diesem Vertrag benötigen einen ausdrücklich benannten Reparatur-/Change-Block.

## Prüfziel und Freeze-Ergebnis

`src/dev/cr-22a-self-test.js` und `src/dev/cr-22a-freeze-gate.js` prüfen insbesondere:

- gültige stabile Building-ID,
- Ablehnung falscher ID-Kinds,
- erforderliche Definition-Referenz,
- Owner-Anker zeigt exakt auf dasselbe Building,
- Deep-Immutability,
- keine vorgezogenen Population-, Workforce-, Production-, Stock-, Construction- oder Registry-Zustände,
- Regression der eingefrorenen CR-21-Basis.

Ergebnis: **PASS / 0 BLOCKER – CR-22A FROZEN.**
