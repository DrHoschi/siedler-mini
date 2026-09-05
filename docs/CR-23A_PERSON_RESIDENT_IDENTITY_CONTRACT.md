# CR-23A – Person / Resident Identity Contract

Status: **PASS / FROZEN / 0 BLOCKER**

## Zweck

CR-23A führt erstmals eine stabile fachliche Identität für eine Person / einen Bewohner ein.

Die Person verwendet bewusst den bestehenden Stable-ID-Kind `unit`. `personId` ist damit die semantische Personenidentität auf der bereits vorhandenen allgemeinen Unit-ID-Basis. CR-23A erzeugt keinen zweiten Personen-Store und keine parallele ID-Welt.

## Vertrag

Ein CR-23A-Personenvertrag enthält ausschließlich:

- `kind: person-resident-identity`
- `personId`: gültige stabile `unit:`-ID
- `existenceState: EXISTS`

`EXISTS` ist in CR-23A nur der minimale Ausgangszustand. Weitere Person-Lifecycle-Zustände und Übergänge werden hier ausdrücklich nicht definiert.

## Im Scope

- stabile Person-Identität auf bestehender Unit-ID-Basis,
- deterministische Validierung der `personId`,
- minimaler Existenz-Ausgangszustand `EXISTS`,
- immutable Contract-Werte,
- klare Erweiterungsgrenze für spätere Home-/Housing-/Workforce-Systeme.

## Ausdrücklich nicht im Scope

- Registrierung im Unit-DomainStore,
- Home-/Building-Zuordnung,
- Housing Capacity / Occupancy,
- Household / Eltern / Kinder / Nachwuchs,
- Alter / Geschlecht / Namenssystem,
- BirthTimer oder Bevölkerungsregeneration,
- Profession / Workforce / Job-Zuweisung,
- Werkzeuge / Kleidung,
- Produktion,
- BuildingStock / Lager / Inventory,
- Construction,
- Transport,
- Bewegung / Position / Route,
- UI / Rendering.

## Architekturregel

Eine reale Person soll später dieselbe physische Entität bleiben, unabhängig davon, ob sie Bewohner, Carrier oder Spezialist ist. CR-23A schafft deshalb keine getrennte Bewohner-Identität neben der allgemeinen Unit-Identität.

## Freeze-Nachweis

Der dedizierte CR-23A Abschluss-/Regression-/Freeze-Gate regressiert CR-23A gemeinsam gegen den eingefrorenen CR-22-Unterbau.

Bestätigt:

- Browser-/Device-Preview: **PASS / 0 BLOCKER**,
- GitHub CI `CR-23A completion/freeze gate + CR-22 frozen regression`: **SUCCESS**,
- stabile `personId` auf bestehender `unit:`-ID-Basis,
- `EXISTS` als einziger CR-23A-Ausgangszustand,
- Immutability und Determinismus,
- keine vorgezogene Home-, Housing-, Population-, Workforce-, Production-, Storage-, Construction-, Transport- oder Bewegungslogik.

## Abgrenzung innerhalb CR-23

- **CR-23A:** Person / Resident Identity Contract – **PASS / FROZEN / 0 BLOCKER**
- **CR-23B:** Resident ↔ Home Assignment Contract – nächster zu definierender Sub-Block
- **CR-23C:** Housing Capacity & Occupancy Foundation – noch nicht begonnen
