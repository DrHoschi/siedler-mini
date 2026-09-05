# CR-23B – Resident ↔ Home Assignment Contract

Status: **IMPLEMENTED – NOT FROZEN**

## Zweck

CR-23B verbindet erstmals die eingefrorene CR-23A-Personenidentität mit einem eingefrorenen CR-22-Building-Owner als fachlichem Zuhause.

CR-23B beantwortet ausschließlich: **Welches Building ist das Home dieser Person?**

## Vertrag

Der Vertrag enthält ausschließlich:

- `kind: resident-home-assignment`
- `personId`: gültige stabile `unit:`-ID aus CR-23A
- `state`: `UNASSIGNED` oder `ASSIGNED`
- `homeBuildingId`: bei `UNASSIGNED` exakt `null`, bei `ASSIGNED` eine gültige stabile `building:`-ID aus CR-22

Die Person referenziert ihr Home. CR-23B erzeugt ausdrücklich keine zweite Bewohnerliste im Building und keine parallele Wahrheit.

## Regeln

- `UNASSIGNED` darf keine `homeBuildingId` tragen.
- `ASSIGNED` muss genau eine gültige `homeBuildingId` tragen.
- Person- und Building-ID-Kinds werden strikt validiert.
- Gleicher Input erzeugt denselben immutable Contract-Wert.
- Ein späterer Wechsel von Building A zu Building B ist nur als explizit neu definierte Zuordnung darstellbar; CR-23B mutiert keine vorherige Zuordnung und führt keine Bewegung aus.

## Ausdrücklich nicht im Scope

- Prüfung, ob ein konkreter Gebäudetyp Wohnraum anbietet,
- Housing Capacity,
- Occupancy / Bewohnerzähler / Bewohnerliste im Building,
- automatische Ablehnung wegen vollem Haus,
- Household / Eltern / Kinder / Nachwuchs,
- BirthTimer / Bevölkerungsregeneration,
- Profession / Workforce / Jobs,
- Werkzeuge / Kleidung,
- Produktion,
- BuildingStock / Lager / Inventory,
- Construction,
- Transport,
- Bewegung / Position / Route,
- UI / Rendering.

Die fachliche Housing-Eignung und Kapazitätsgrenze werden erst in CR-23C definiert.

## Abgrenzung innerhalb CR-23

- **CR-23A:** Person / Resident Identity Contract – **PASS / FROZEN / 0 BLOCKER**
- **CR-23B:** Resident ↔ Home Assignment Contract – **IMPLEMENTED / NOT FROZEN**
- **CR-23C:** Housing Capacity & Occupancy Foundation – noch nicht begonnen
