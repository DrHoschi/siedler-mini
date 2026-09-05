# CR-22B – Building Lifecycle State Contract

Status: **PASS / FROZEN**

Freeze-Gate: **PASS / 0 BLOCKER**  
Frozen-Basis: CR-22A `58ffd58ac423171ad80b6ff7f29c7271a10d3090`  
CR-22B Gate-CI: `a78975a2ead0dcc760d0a48df4f92c981b4b71c9` – SUCCESS

## Zweck

CR-22B ergänzt die in CR-22A eingefrorene Building-Identität um einen minimalen, rein existentiellen Lifecycle-Zustand.

Verbindliche Zustände:

- `EXISTS` – die Building-Entität existiert fachlich als Building-Owner.
- `RETIRED` – der fachliche Lifecycle der Building-Entität ist beendet.

Einziger erlaubter Zustandsübergang:

`EXISTS -> RETIRED`

`RETIRED` ist terminal.

## Abgrenzung

CR-22B beschreibt **keinen Bauzustand**. Zustände wie `PLANNED`, `CONSTRUCTING`, `FINISHED` oder `DAMAGED` gehören ausdrücklich nicht in diesen Vertrag.

`RETIRED` entfernt das Building in CR-22B noch nicht aus einem Store. Registrierung, Lookup und Removal bleiben CR-22C vorbehalten.

## Ausdrücklich nicht im Scope

- Registrierung / Lookup / Removal im Building- oder World-Store,
- Construction / Baufortschritt / Bauphasen,
- Residents / Haushalte / Nachwuchs,
- Workforce / Profession / Kleidung / Werkzeuge,
- Produktion,
- Stock / Storage / Inventory,
- Transport- oder Job-Erzeugung,
- Rendering oder UI-Gameplay.

## Prüfziel und Freeze-Ergebnis

`src/dev/cr-22b-self-test.js` und `src/dev/cr-22b-freeze-gate.js` prüfen insbesondere:

- Defaultzustand `EXISTS`,
- exakt die Zustände `EXISTS` und `RETIRED`,
- ausschließlich `EXISTS -> RETIRED`,
- terminales `RETIRED`,
- Ablehnung von No-op-, Rückwärts- und fremden Übergängen,
- Immutability,
- keine Registry-, Construction-, Population-, Workforce-, Production- oder Storage-Side-Effects,
- Regression der eingefrorenen CR-22A-Basis.

Ergebnis: **PASS / 0 BLOCKER – CR-22B FROZEN.**
