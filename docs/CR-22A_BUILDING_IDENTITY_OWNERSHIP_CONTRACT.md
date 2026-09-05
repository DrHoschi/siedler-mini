# CR-22A – Building Identity & Ownership Contract

Status: **IMPLEMENTED – NOT FROZEN**

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

- **CR-22A:** Building Identity & Ownership Contract
- **CR-22B:** Building Lifecycle State Contract
- **CR-22C:** Building Registration & World Ownership Integration

CR-22A darf deshalb noch keine Lifecycle- oder Registry-Logik vorwegnehmen.

## Prüfziel

`src/dev/cr-22a-self-test.js` prüft insbesondere:

- gültige stabile Building-ID,
- Ablehnung falscher ID-Kinds,
- erforderliche Definition-Referenz,
- Owner-Anker zeigt exakt auf dasselbe Building,
- Deep-Immutability,
- keine vorgezogenen Population-, Workforce-, Production-, Stock-, Construction- oder Registry-Zustände.
