# CR-23C – Housing Capacity & Occupancy Foundation

Status: **IMPLEMENTED – NOT FROZEN**

## Zweck

CR-23C ergänzt die eingefrorenen CR-23A-/CR-23B-Verträge ausschließlich um Housing Capacity und deterministisch daraus abgeleitete Occupancy.

CR-23C beantwortet ausschließlich:

- Wie viele Wohnplätze bietet ein Building?
- Wie viele dieser Plätze sind durch bestehende CR-23B-Home-Zuordnungen belegt?
- Ist die aktuelle bzw. geplante Belegung noch innerhalb der Kapazität?

## Vertrag

Ein Housing-Capacity-Vertrag enthält:

- `kind: housing-capacity`
- `buildingId`: gültige stabile `building:`-ID
- `capacity`: ganze Zahl >= 0

`capacity = 0` bedeutet: dieses Building bietet in diesem Vertrag keinen Wohnplatz an.

Die Occupancy wird nicht separat gespeichert. Sie wird ausschließlich aus `ASSIGNED`-CR-23B-Zuordnungen abgeleitet, deren `homeBuildingId` exakt der `buildingId` des Capacity-Vertrags entspricht.

Die abgeleitete Summary enthält:

- `buildingId`
- `capacity`
- `occupancy`
- `availableSlots = capacity - occupancy`
- `withinCapacity = occupancy <= capacity`

## Regeln

- Keine zweite Building-seitige Bewohnerliste.
- Keine frei mutierbare Occupancy-Zahl.
- `occupancy` ist ausschließlich Projektion aus CR-23B.
- Exakt `capacity` Bewohner sind zulässig.
- Eine weitere Zuordnung ist nur zulässig, wenn `occupancy < capacity`.
- Überbelegung wird deterministisch abgelehnt.
- Contract- und Summary-Werte sind immutable und deterministisch.

## Ausdrücklich nicht im Scope

- konkrete Gebäudetypnamen wie HOUSE_SMALL, TENT oder HQ,
- Content-Zuordnung von DefinitionId -> Capacity,
- automatische Bewohnererzeugung,
- Household / Eltern / Kinder / Familien,
- Alter / Geschlecht / Namen,
- BirthTimer / Bevölkerungsregeneration / Population Growth,
- Profession / Workforce / Jobs,
- Werkzeuge / Kleidung,
- Produktion,
- BuildingStock / Lager / Inventory,
- Construction,
- Transport,
- Bewegung / Position / Route,
- UI / Rendering.

## Abgrenzung innerhalb CR-23

- **CR-23A:** Person / Resident Identity Contract – **PASS / FROZEN / 0 BLOCKER**
- **CR-23B:** Resident ↔ Home Assignment Contract – **PASS / FROZEN / 0 BLOCKER**
- **CR-23C:** Housing Capacity & Occupancy Foundation – **IMPLEMENTED / NOT FROZEN**
