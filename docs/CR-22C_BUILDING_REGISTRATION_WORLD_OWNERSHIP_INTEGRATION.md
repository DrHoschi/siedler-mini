# CR-22C – Building Registration & World Ownership Integration

Status: **PASS / FROZEN / 0 BLOCKER**

## Zweck

CR-22C verbindet erstmals die in CR-22A eingefrorene Building-Identität/Ownership und den in CR-22B eingefrorenen minimalen Lifecycle mit dem bereits vorhandenen `CoreDomainStores.buildings`-Store.

Eine vollständige Building-Instanz wird unter exakt ihrer stabilen `buildingId` registriert und kann über dieselbe ID deterministisch gefunden oder entfernt werden.

## Im Scope

- vollständige Building-Instanz aus CR-22A Identity/Ownership + CR-22B Lifecycle registrieren,
- dieselbe `buildingId` eindeutig wiederauflösen,
- doppelte Registrierung derselben `buildingId` deterministisch ablehnen,
- unbekanntes Building kontrolliert als nicht vorhanden behandeln,
- exakt ein Building entfernen, ohne andere Buildings zu verändern,
- deterministische sortierte ID-Auflösung über den bestehenden Building-DomainStore.

## Verbindliche Invarianten

- Identity und Lifecycle müssen dieselbe `buildingId` adressieren.
- Der vorhandene `domains.buildings`-Store bleibt der einzige Building-DomainStore.
- Registry-Integration verändert weder den CR-22A-Identity-/Owner-Vertrag noch den CR-22B-Lifecycle-Vertrag.
- Removal führt in CR-22C keinen Lifecycle-Übergang aus.

## Ausdrücklich nicht im Scope

- automatische `EXISTS -> RETIRED`-Transition vor Removal,
- Construction / Abriss / Baufortschritt / Bauphasen,
- Map-/Geometrie-/Rendering-Entfernung,
- Residents / Haushalte / Nachwuchs,
- Workforce / Profession / Kleidung / Werkzeuge,
- Produktion,
- Stock / Storage / Inventory,
- Transport-/Job-Erzeugung oder -Abbruch,
- UI-Gameplay.

## Prüfziel

`src/dev/cr-22c-self-test.js` und `src/dev/cr-22c-freeze-gate.js` prüfen insbesondere:

- Registrierung im vorhandenen Building-DomainStore,
- exakte Identity-/Lifecycle-ID-Kohärenz,
- deterministischen Lookup,
- kontrollierten Unknown-Lookup,
- Duplicate-Rejection,
- deterministische ID-Reihenfolge,
- gezieltes Removal ohne Seiteneffekte auf andere Buildings,
- kein automatisches Lifecycle-Policy-Verhalten,
- keine vorgezogenen Construction-, Population-, Workforce-, Production-, Storage- oder Transport-Zustände,
- gemeinsame Regression der eingefrorenen CR-22A-/CR-22B-Basis mit CR-22C.

## Freeze-Nachweis

Das CR-22C Abschluss-/Regression-/Freeze-Gate wurde mit **PASS / 0 BLOCKER** abgeschlossen. Der CI-Schritt `Run CR-22C completion/freeze gate + CR-22B frozen regression` war erfolgreich.

## Abgrenzung innerhalb CR-22

- **CR-22A:** Building Identity & Ownership Contract – **FROZEN**
- **CR-22B:** Building Lifecycle State Contract – **FROZEN**
- **CR-22C:** Building Registration & World Ownership Integration – **PASS / FROZEN / 0 BLOCKER**
