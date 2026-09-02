# S2D-06 – ROADMAP & VALIDATION

Status: **V0.1 FROZEN – PASS / 0 BLOCKER**  
Datum: 2026-09-02  
Repository: `DrHoschi/siedler-mini`  
Arbeitsbranch: `feature/s2d-06-roadmap-validation`  
Verbindliche Basis: S2D-00 bis S2D-05 jeweils **V0.1 FROZEN – PASS / 0 BLOCKER**  
Freeze-Gate: **S2D-06D – Internal Consistency & Roadmap Freeze Gate – PASS / 0 BLOCKER**

## 1. Zweck

S2D-06 übersetzt die eingefrorene Produkt-, Workforce-, Architektur-, UI- und Contentplanung in eine konkrete, prüfbare und freigabefähige technische Migrationsroadmap.

Ziel ist ausdrücklich kein Big-Bang-Rewrite. Die bestehende funktionierende Spielbasis wird schrittweise in die Zielarchitektur überführt. Jeder technische Block besitzt einen klaren Owner-/Funktionsscope, Entry-/Exit-Gates, definierte Regressionen, nachvollziehbare Evidence und einen eindeutigen Rückfallpunkt.

Zentrale Regeln:

> **Erst Ziel-Owner und Vertrag funktionsfähig machen, dann Legacy-Guard entfernen.**

> **Ein Implementierungsblock ist erst PASS, wenn seine neue Zielverantwortung funktioniert und alle bis dahin bereits freigegebenen Kerninvarianten erhalten bleiben.**

> **Kein Implementierungsblock startet ohne freigegebenen Parent-Stand; kein Block wird eingefroren ohne nachgewiesenen Exit-Gate; kein Branch wandert weiter, solange ein verpflichtender Nachweis BLOCKED oder FAIL ist.**

---

# S2D-06A – Implementation Work Breakdown & Migration Sequence

## 2. Globale Regeln für jeden Implementierungsblock

Vor jedem Block:
1. erwarteten Branch prüfen,
2. erwarteten Parent-/Start-HEAD prüfen,
3. Branch gegen den letzten freigegebenen Stand vergleichen,
4. Zielowner und erwartete Changed Files/Modulgruppen benennen,
5. ausgeschlossenen Scope benennen,
6. relevante Acceptance Criteria/VAL-Tests festlegen,
7. keine fachliche Scope-Erweiterung außerhalb S2D-00 bis S2D-05 zulassen.

Nach jedem Block:
1. Changed Files prüfen,
2. keine unbeabsichtigten Fremdmodule/Assets,
3. T1/T2 und je nach Matrix T3/T4 ausführen,
4. zentrale Invarianten prüfen,
5. Geräte-Gate ausführen, falls erforderlich,
6. Evidence dokumentieren,
7. Commit setzen,
8. Ergebnis PASS/BLOCKED/FAIL festhalten.

## 3. Dauerhafte Regression-Invarianten

- New Game erzeugt genau einen gültigen Startzustand.
- Continue restauriert ohne additive Defaults.
- Gebäudezustand bleibt nach Continue erhalten.
- Physische Waren besitzen genau einen autoritativen wirtschaftlichen Ort.
- Produktion schreibt zuerst in lokalen BuildingStock.
- HQ-Credit erst nach realer Lieferung.
- Baufortschritt erst nach vollständigen Materialien und realer Builder-Ankunft.
- Kein Transport über realen Restbedarf hinaus.
- Resident-Helfer bleiben Resident.
- Spezialisten bleiben reale Personen.
- WorkArea-Produktion nutzt reale Weltziele.
- Pause stoppt neue Produktion; fertige lokale Ware bleibt transportierbar.
- Kein Zombie-Job/Assignment/Reservation.
- Keine A*-Hot-Fail-Schleife.
- Trampelpfade bleiben aus realer Bewegung/Wear ableitbar.
- Continue startet Scheduler/Subscriptions genau einmal.
- UI, Renderer, Guidance und Inspector werden nie Gameplay-Owner.
- Kein neuer dauerhafter Guard ersetzt einen alten Guard.

## 4. Gesamt-Migrationsreihenfolge

1. **IM-00 – Baseline & Safety Harness**
2. **IM-01 – Public Owner Boundaries & Runtime Contracts**
3. **IM-02 – Central Scheduler & Lifecycle Foundation**
4. **IM-03 – Runtime Validation Foundation**
5. **IM-04 – BuildingStore Ownership Consolidation**
6. **IM-05 – Unit Identity, Housing & Start Roster Foundation**
7. **IM-06 – JobEngine / Assignment Contract Migration**
8. **IM-07 – ConstructionSystem Migration**
9. **IM-08 – BuildingStock & ProductionSystem Migration**
10. **IM-09 – Logistics & Reservation Migration**
11. **IM-10 – Housing / Population / Gold Integration**
12. **IM-11 – NavigationService Consolidation**
13. **IM-12 – Path/Wear System Migration**
14. **IM-13 – SaveGame Owner Snapshot & Continue Reconstruction**
15. **IM-14 – UI / Mobile Runtime Integration**
16. **IM-15 – Guidance & Inspector Read/Command Integration**
17. **IM-16 – Legacy Guard Removal & Architecture Closure**
18. **IM-17 – V1 Core End-to-End Validation**

Diese Reihenfolge folgt der eingefrorenen Ownership- und Legacy-Migrationslogik aus S2D-03. Einzelne vorbereitende Interfaces dürfen früher entstehen, aber fachliche Ownership wird nicht übersprungen.

## 5. IM-00 – Baseline & Safety Harness

Ziel: aktuellen Referenzstand reproduzierbar und messbar machen, ohne fachliche Migration.

### IM-00A – Branch/Version/Reference Baseline
- Implementierungsbranch direkt vom S2D-06-Frozen-Commit,
- Referenzcommit und Bootpfade dokumentieren,
- keine fachliche Funktion verändern.

### IM-00B – Core Smoke Checklist
Mindestens:
- New Game,
- Gebäude platzieren,
- Baustelle beliefern,
- Builder baut,
- Produktion,
- Carriertransport,
- Pause/Resume,
- Bewohner/Population,
- Gold,
- Tiere,
- WorkArea,
- Pfade,
- Save/Continue.

### IM-00C – Diagnostic Baseline
Mindestens erfassen:
- GameTick/Simulation-Dauer,
- Unit-Kosten,
- Navigation calls/ok/fail,
- aktive Jobs/Assignments/Reservations,
- Carrier-/Workerzahl,
- Timer-/Interval-/Subscription-Ausgangslage.

Exit: **Referenzstand reproduzierbar und messbar.**

## 6. IM-01 – Public Owner Boundaries & Runtime Contracts

Ziel: öffentliche Read-/Command-/Event-Grenzen für Buildings, Units, Jobs, Construction, BuildingStock, Production, Logistics, Housing/Economy, MapResources/Animals, Navigation, Path und SaveGame.

- Read APIs/Snapshots ohne zweite State-Kopie.
- Mutationen schrittweise über Owner-Commands/Operations.
- Domain Events informieren über bereits erfolgte Fakten und führen keine versteckte zweite Mutation aus.

Exit: **grundlegende Owner-Verträge vorhanden, Gameplay unverändert.**

## 7. IM-02 – Central Scheduler & Lifecycle Foundation

- zentrale Scheduler-Phasen,
- explizite Boot-Registrierung,
- Pause/Resume/Shutdown-Vertrag,
- erste unkritische Feature-Intervalle in Scheduler/Due-Tasks überführen.

Exit:
- Pause stoppt Simulationszeit,
- Scheduler/Systeme nach Reload/Continue nicht doppelt,
- verbleibende Legacy-Timer inventarisiert und bewusst beibehalten.

## 8. IM-03 – Runtime Validation Foundation

Prüffelder:
- Goods one-location,
- FREE vs. ASSIGNED,
- Zombie Assignment/Reservation,
- Builder-arrival invariant,
- Building/Home ownership,
- duplicate scheduler/subscriptions,
- invalid restore references.

Validator erkennt/isoliert fail-closed, repariert aber keinen fremden State heimlich.

Exit: **kritische Invarianten sichtbar und testbar.**

## 9. IM-04 – BuildingStore Ownership Consolidation

- eine autoritative Building-Collection,
- Construction, Renderer, UI, Pause und SaveGame lesen denselben Owner,
- Legacy-Sync erst nach PASS entfernen.

Regression:
- Placement,
- Selection,
- zulässige Pause,
- Save/Continue,
- keine Gebäude fehlen/duplizieren,
- keine zweite Buildingliste.

Exit: **Building-Doppel-Owner geschlossen.**

## 10. IM-05 – Unit Identity, Housing & Start Roster Foundation

Runtimebasis:
`Person + Home + Spezialisierung + Capabilities + Assignment`

Teilziele:
- stabile Person-ID,
- Home getrennt vom Arbeitsplatz,
- Carrier/Builder/Lumberjack/Stonecutter/Fisher/Hunter plus allgemeiner Resident Helper,
- reale Gründergruppe am HQ mit vollständiger Mindest-Capability-Abdeckung,
- kleines Haus Kapazität 2, mittleres Haus 3,
- Gründer-Umsiedlung zuerst, danach verbleibende Plätze mit allgemeinen Bewohnern.

Exit:
- Population = reale Personen,
- keine Resident-Type-Mutation,
- keine doppelten Gründer,
- keine zufällige Spezialistenproduktion.

## 11. IM-06 – JobEngine / Assignment Contract Migration

- Jobs nur aus realem Bedarf,
- Eligibility = Capability + Availability + Reachability + Preconditions,
- genau ein Assignment pro normal arbeitender Unit,
- definierte Completion/Cancel/Recovery-Pfade,
- kein Zombie-State,
- kein Hot-Retry.

Exit: **Jobbedarf und konkrete Unit-Zuweisung sauber getrennt.**

## 12. IM-07 – ConstructionSystem Migration

- `Restbedarf = Soll - geliefert - gültig reserviert/unterwegs`,
- `WAIT_MATERIAL -> WAIT_BUILDER -> BUILDING -> COMPLETE`,
- Builder muss real gültigen Baupunkt erreichen,
- Fortschritt nur während gültiger Builderarbeit,
- Construction Guards erst nach PASS entfernen.

Exit: **Builder-/Overdelivery-Korrektur ist nativ und kein Construction-Guard mehr nötig.**

## 13. IM-08 – BuildingStock & ProductionSystem Migration

- BuildingStock besitzt lokale fertige Waren,
- Spezialist + WorkArea + reales Weltziel + reale Anreise,
- Lumberjack -> wood,
- Quarry -> stone,
- Fisher -> fish,
- Hunter -> meat + pelt,
- Pause stoppt neue Produktion, nicht Abholung,
- direkte HQ-Gutschrift/Production Bridge erst nach PASS entfernen.

Exit: **Production erzeugt ausschließlich lokalen physischen Output.**

## 14. IM-09 – Logistics & Reservation Migration

- realer Transportbedarf Quelle/Ziel/Ware/Menge,
- Reservation ist keine Warenkopie,
- Pickup: Quelle -> Unit,
- Delivery: Unit -> Ziel,
- Recovery vor/nach Pickup definiert,
- Overdelivery Guard erst entfernen, wenn Restbedarf Reservation/en route nativ berücksichtigt.

Exit: **physische Warenkette ohne Duplikation, Verlust oder Überlieferung.**

## 15. IM-10 – Housing / Population / Gold Integration

- Population derived aus realen Bewohnern,
- Gründer kontrolliert in Häuser umziehen,
- nur verbleibende freie Wohnplätze erzeugen allgemeine Bewohner,
- Gold über Economy-Owner aus realen gültigen Bewohnern,
- Gold nicht physisch,
- keine Restore-Zusatzsteuer.

Exit: **Housing/Economy ohne Doppelwahrheit.**

## 16. IM-11 – NavigationService Consolidation

- gültige Access-/Dockingpunkte,
- Structural Reachability vor teurer Suche,
- Exact Reachability/Path Request nur für geeignete Kandidaten,
- positive/negative Caches und Backoff,
- keine `A* pro Job × Unit × Tick`,
- PFGlue/Feature-Retry-Schichten erst nach Migration entfernen.

Exit:
- keine Navigation-Hotloop,
- unerreichbare Jobs backoffen,
- normale Bewegung/Arbeitsankunft korrekt,
- Performance gegen IM-00-Baseline kontrolliert.

## 17. IM-12 – Path/Wear System Migration

- realer Wear-State aus Unitbewegung,
- Dirty Regions,
- Render Cache/Bake getrennt vom Gameplay-State,
- langsamer Decay in Simulationszeit,
- Legacy-Stampmodell erst nach äquivalenter Darstellung entfernen.

Exit:
- häufig genutzte Strecken verstärken sich,
- schwache Nutzung kann verblassen,
- keine unbegrenzt wachsende Stempelliste,
- Wear über Save/Continue erhalten,
- Mobile Rendering/Performance PASS.

## 18. IM-13 – SaveGame Owner Snapshot & Continue Reconstruction

- Owner liefern Snapshots ihrer autoritativen Wahrheit,
- stabile Building/Unit/Home/Assignment/Waren-Referenzen,
- Restore-Reihenfolge: stop -> validate -> clear -> owners -> relations -> carried goods/recovery -> jobs reconstruct -> cross-owner validate -> transient rebuild -> register once -> scheduler start,
- New Game und Continue strikt getrennt,
- Save Guards erst nach vollständigem PASS entfernen.

Exit: **Continue benötigt keinen Gameplay-Patch mehr und erzeugt einen fachlich äquivalenten Zustand.**

## 19. IM-14 – UI / Mobile Runtime Integration

- Compact HUD: wood, stone, gold, population, menu/build,
- Context Panels aus echten Read Models,
- Build Catalog Wohnen/Produktion,
- Placement Preview + Validity + Confirm/Cancel,
- WorkArea-Vorschlag getrennt vom aktiven Bereich bis Confirm,
- Economy Overview mit Available/Local/Reserved/En route,
- New Game/Continue/Save getrennt und verständlich,
- alle Kernaktionen touch-first.

Exit: **UI nutzt nur Owner-Read/Command-Verträge; vollständiger Smartphone-PASS.**

## 20. IM-15 – Guidance & Inspector Integration

Guidance:
- stabile Guidance IDs,
- reagiert auf reale Events,
- persistierbar und restartbar,
- keine Gameplay-Ausnahme.

Inspector:
- Runtime Snapshots + kontrollierte Debug Commands,
- Buildings, Units/Workforce, Jobs, Economy/Stocks, Construction, Navigation, Path, SaveGame, Scheduler/Performance,
- keine Business-Logik,
- keine Asset-/Sprite-/JSON-Editorfunktionen im Game-Inspector.

Exit: **Abschalten von Guidance/Inspector verändert Gameplay nicht.**

## 21. IM-16 – Legacy Guard Removal & Architecture Closure

Kandidaten u. a.:
- SA04 Runtime Guards,
- Production Bridge,
- Stock Persistence Patch,
- Pause/Builder Fixes,
- Hunter Fixes,
- Resident Workforce Patch,
- SaveGame UID Guard,
- Event Compatibility Layer,
- obsolete PF-/Render-/Compatibility-Shims.

Für jede Entfernung:
1. Zielowner nachweisen,
2. Regression mit Legacy aktiv PASS,
3. Guard entfernen,
4. gleiche Regression erneut PASS,
5. Restreferenzen prüfen,
6. keine Ersatz-Patchschicht.

Exit: **keine produktive Legacy-Korrekturschicht mehr für migrierte Kernregeln.**

## 22. IM-17 – V1 Core End-to-End Validation

Golden Path:
1. New Game.
2. Gründergruppe vorhanden.
3. erstes Wohnhaus bauen.
4. Material real liefern.
5. Builder real ankommen lassen.
6. Bewohner/Home korrekt.
7. Holzproduktion.
8. lokaler Stock.
9. realer Carriertransport ins HQ.
10. Steinproduktion.
11. Fischproduktion.
12. Jagd auf reales Tier.
13. Fleisch/Fell transportieren.
14. weitere Gebäude.
15. Pause/Resume.
16. WorkArea ändern.
17. Resident Helper Transport.
18. Gold/Population.
19. Trampelpfade.
20. Save.
21. Continue.
22. Zustand vergleichen.

Stress mindestens:
- mehrere Produzenten/Baustellen,
- knappe Carrier/Builder,
- fehlender Spezialist,
- voller lokaler Stock,
- erschöpfte Weltressource,
- keine Jagdtiere in WorkArea,
- unerreichbares Ziel,
- Transportabbruch/Recovery,
- längere Laufzeit,
- Save/Continue unter Last.

Exit: **V1 Small Economic Core funktional, persistierbar, mobile-bedienbar und architektonisch konsistent.**

## 23. Blockgrößen-Regel

Ein technischer Unterblock soll möglichst nur eine Hauptverantwortung verändern. Wenn mehrere Owner gleichzeitig grundlegend verändert werden müssten, ist der Block vor Umsetzung weiter zu teilen.

---

# S2D-06B – Validation Matrix & Acceptance Criteria

## 24. Teststufen

- **T1 – Static/Contract Check**: Dateien, APIs, Ownership, unerlaubte Direktzugriffe.
- **T2 – Targeted Runtime Regression**: exakt der geänderte Ablauf.
- **T3 – Core Smoke Regression**: kurzer vollständiger Kerncheck.
- **T4 – End-to-End / Stress**: längere Szenarien, Last, Save/Continue.

Jeder produktive Block benötigt mindestens T1 + T2. Owner-/Lifecycle-/Scheduler-/Save-Änderungen benötigen zusätzlich T3. T4 wird bei den dafür definierten Stress-/End-to-End-Gates eingesetzt.

## 25. Automatisierungsgrade

- **A1 – Static Automatable**: Branch/HEAD/Diff, Contracts, bekannte Legacy-Referenzen, definierte statische Invarianten.
- **A2 – Runtime Automatable**: Owner-State, Warenort, Jobs/Assignments, Construction, Save/Restore, Navigation, Population/Home/Gold.
- **A3 – Tool-Assisted / Visual**: Pathdarstellung, Context Panel, WorkArea, Guidance, Rendering.
- **A4 – Real Device Required**: Touch/Pointer, Smartphone-Layout, Mobile Browser Save/Reload, echte Lifecycle-/Storage-/Performanceeffekte.

## 26. Ergebniszustände

- **PASS** – alle verpflichtenden Acceptance Criteria erfüllt.
- **PASS WITH DEFERRED NON-BLOCKER** – nur explizite echte Non-Blocker offen.
- **BLOCKED** – Test/Abhängigkeit/Nachweis fehlt.
- **FAIL** – mindestens ein verpflichtendes Criterion verletzt.

Ein FAIL darf nicht durch einen neuen Runtime-Guard kaschiert werden.

## 27. Globale Acceptance Criteria produktiver Blöcke

1. Branch/Parent korrekt.
2. Changed Files entsprechen Scope.
3. Keine neue dauerhafte Patch-/Guard-Schicht ohne Exit-Gate.
4. Keine zweite autoritative State-Kopie.
5. Keine neue Feature-eigene primäre Timer-/Interval-Schleife.
6. Keine direkte Fremdmutation.
7. T2 PASS.
8. bisherige kritische Invarianten PASS.
9. T3 bei Owner-/Lifecycle-/Scheduler-/Save-Änderungen.
10. Geräte-PASS, wenn vorgeschrieben.

## 28. Validation Matrix IM-00 bis IM-17

| Block | Schwerpunkt | Pflichtprüfung | Geräte-Gate |
|---|---|---|---|
| IM-00 | reproduzierbare Referenz/Baseline | T1 + T3 Baseline | einmaliger Referenz-Gerätecheck |
| IM-01 | Owner/Read/Command/Event | T1 + T2 | nein |
| IM-02 | Scheduler/Lifecycle | T1 + T2 + T3 | realer Browser-Lifecycle am Exit, wenn betroffen |
| IM-03 | Runtime-Invarianten | T1 + T2 | nein |
| IM-04 | eine Building-Collection | T1 + T2 + T3 | Browser Save/Continue, wenn betroffen |
| IM-05 | Person/Home/Capabilities/Founder | T1 + T2 + T3 | nein |
| IM-06 | Jobs/Assignment/Recovery | T1 + T2 + T3 | nein |
| IM-07 | Material/WAIT_BUILDER/Arrival | T1 + T2 + T3 | Runtime-Nachweis ausreichend |
| IM-08 | local-first Production | T1 + T2 + T3 | nein |
| IM-09 | Logistics/Reservation/Recovery | T1 + T2 + T3 | nein |
| IM-10 | Housing/Population/Gold | T1 + T2 + T3 | nein |
| IM-11 | Navigation/Backoff/Performance | T1 + T2 + T4 | mobiler Performance-PASS |
| IM-12 | Wear/Dirty/Bake/Decay | T1 + T2 + T4 | Smartphone/Tablet Rendering + Performance |
| IM-13 | Save/Restore/New-vs-Continue | T1 + T2 + T3 + T4 | echter Mobile Browser Reload/Storage-PASS |
| IM-14 | UI/Mobile | T1 + T2 + T3 | vollständiger Smartphone-UX-PASS |
| IM-15 | Guidance/Inspector Non-Ownership | T1 + T2 | Mobile Guidance empfohlen |
| IM-16 | Legacy Cleanup | T1 + T2 + T3 | je betroffenem Gerätepfad |
| IM-17 | kompletter V1-Kern | T3 + T4 | zwingender finaler Geräte-PASS |

## 29. Verbindliche Invariant Test Cases

### VAL-001 – New Game Single Initialization
PASS: genau ein HQ, genau eine Gründergruppe gemäß Balanceprofil, Startressourcen genau einmal, Systemregistrierungen genau einmal.

### VAL-002 – Continue No Additive Defaults
PASS: kein Starter-Roster, keine Default-Ressourcen, keine Zusatzbewohner und keine zusätzlichen Timer/Subscriptions durch Continue.

### VAL-003 – Goods One-Location
PASS: eine physische Warenmenge liegt wirtschaftlich immer genau an einem Ort; Reservation erzeugt keine Zusatzmenge.

### VAL-004 – Construction Builder Arrival
PASS: Fortschritt bleibt bis zur realen Builder-Ankunft unverändert; erst danach Bauarbeit.

### VAL-005 – Construction No Overdelivery
PASS: Bedarf = Soll - geliefert - gültig reserviert/unterwegs; bei Restbedarf 0 kein neuer Transport.

### VAL-006 – Production Local First
PASS: Produktionsoutput steigt ausschließlich lokal; HQ erst nach realer Delivery.

### VAL-007 – Pause Semantics
PASS: pausierte Produktion erzeugt nichts Neues; fertige lokale Ware bleibt vorhanden/transportierbar.

### VAL-008 – Resident Identity Preservation
PASS: einfacher Transport ändert nur Assignment/Activity, nicht Person-ID/Home/Spezialisierung.

### VAL-009 – Specialist Capability Gate
PASS: Fachjob bleibt ohne passende Capability unbesetzt; keine automatische Umqualifizierung.

### VAL-010 – Single Assignment / No Zombie
PASS: nie zwei normale aktive Assignments; Cancel/Recovery hinterlässt keine verwaisten Jobs/Reservations/Bindings.

### VAL-011 – Navigation Backoff
PASS: unerreichbares Ziel führt zu kontrolliertem Backoff, nicht identischem A*-Retry pro Tick.

### VAL-012 – Path Wear Ownership
PASS: häufige Nutzung verstärkt Wear, Decay kann schwache Nutzung reduzieren, Renderstempel sind keine autoritative Wahrheit.

### VAL-013 – Housing / Population Consistency
PASS: Hauskapazität 2/3, Population aus realen Personen, Gründer werden umgebunden statt neu erzeugt.

### VAL-014 – Gold Exactly Once
PASS: Gold folgt Simulationszeit/realen Bewohnern genau einmal; Pause/Continue erzeugen keinen Bonus/Replay.

### VAL-015 – Save/Continue State Equivalence
PASS: authoritative fachliche Zustände sind nach Continue äquivalent; nur transiente Caches/Queues dürfen neu aufgebaut sein.

### VAL-016 – Scheduler Registration Once
PASS: Anzahl registrierter Scheduler-Systeme/Subscriptions bleibt nach wiederholtem Continue konstant.

### VAL-017 – Inspector/Guidance Non-Ownership
PASS: Abschalten von Inspector/Guidance verändert fachlichen Zustand/Simulation nicht.

### VAL-018 – Mobile Core Interaction
PASS auf kleinem Smartphone: Pan, Zoom, Select, Build, Placement Confirm/Cancel, Context Panel, WorkArea, Systemmenü und Save/Continue sind erreichbar/eindeutig; keine Kernaktion nur Hover/Keyboard/Rechtsklick.

## 30. Block-zu-VAL-Zuordnung

| Block | mindestens erneut ausführen |
|---|---|
| IM-00 | VAL-001, VAL-002 Baseline, VAL-018 Referenz |
| IM-01 | VAL-003, VAL-017 + Contract Checks |
| IM-02 | VAL-001, VAL-002, VAL-007, VAL-016 |
| IM-03 | Negativfälle aus VAL-003/004/010/016 |
| IM-04 | VAL-001, VAL-002, VAL-015 Buildings |
| IM-05 | VAL-008, VAL-009, VAL-013 |
| IM-06 | VAL-008, VAL-009, VAL-010, VAL-011 |
| IM-07 | VAL-004, VAL-005, VAL-010 |
| IM-08 | VAL-006, VAL-007, VAL-009 |
| IM-09 | VAL-003, VAL-005, VAL-008, VAL-010 |
| IM-10 | VAL-013, VAL-014, VAL-002 |
| IM-11 | VAL-011 + Performance-Baselinevergleich |
| IM-12 | VAL-012, VAL-015 Path, Geräte-Rendering |
| IM-13 | VAL-002, VAL-003, VAL-013, VAL-014, VAL-015, VAL-016 |
| IM-14 | VAL-018 + VAL-017 UI-Ownership |
| IM-15 | VAL-017 + Guidance-Persistenz |
| IM-16 | zugehörige VAL-Tests vor und nach jeder Guard-Entfernung |
| IM-17 | VAL-001 bis VAL-018 vollständig bzw. alle anwendbaren Varianten |

## 31. Performance-Gate

Keine pauschale Millisekundenzahl wird vor IM-00 eingefroren. Verbindlich:
- bekannte Hotloop-Strukturen dürfen nicht wieder entstehen,
- Navigation-Fails dürfen unter unveränderter Welt nicht durch sofortige Wiederholungen anwachsen,
- Timer/Subscription/Job/Reservation-Zahlen dürfen bei stabilem Zustand nicht monoton ohne fachlichen Grund wachsen,
- IM-11/12/17 werden gegen IM-00 verglichen,
- deutliche unbegründete Regression blockiert den Exit.

## 32. Evidence Requirement

Jeder technische Block dokumentiert mindestens:
- Branch,
- Parent-/Start-HEAD,
- End-Commit,
- Changed Files,
- T1/T2/T3/T4,
- relevante VAL-IDs,
- Geräte-PASS ja/nein/nicht erforderlich,
- bekannte Non-Blocker/Baseline Issues,
- Ergebnis PASS/BLOCKED/FAIL.

---

# S2D-06C – Release Gates, Freeze Criteria & Implementation Entry Conditions

## 33. Statusmodell

- **PLANNED** – Scope/Gate definiert.
- **READY** – Entry Conditions erfüllt.
- **IN PROGRESS** – produktive Arbeit läuft.
- **BLOCKED** – Abhängigkeit/Testumgebung/Nachweis fehlt.
- **FAIL** – verpflichtendes Criterion verletzt.
- **PASS** – alle verpflichtenden Gates/Evidence erfüllt.
- **FROZEN** – PASS-Stand als verbindlicher Parent festgezogen.

`PASS WITH DEFERRED NON-BLOCKER` darf nur FROZEN werden, wenn kein Deferred-Punkt eine Kerninvariante, den nächsten Entry-Gate oder eine notwendige Migration berührt.

## 34. Globales Entry Gate

Vor READY:
1. FROZEN/PASS-Parent eindeutig,
2. Arbeitsbranch direkt vom Parent oder identisch,
3. ahead/behind dokumentiert,
4. Scope/Owner/Changed Files/Excluded Scope definiert,
5. Vorgängerblöcke PASS/FROZEN,
6. T1–T4/VAL-Prüfungen vor Änderung bekannt,
7. Rollback-Commit vorhanden,
8. keine offene Kernregression,
9. keine ungeklärte neue Produkt-/Architekturentscheidung; andernfalls S2D-07,
10. T2-Nachweis grundsätzlich ausführbar.

## 35. Block Entry Record

Vor erstem produktiven Commit mindestens:
- Block-ID,
- Parent/Frozen Commit,
- Branch,
- Ziel/Owner,
- erwartete Changed Files/Modulgruppen,
- ausgeschlossene Bereiche,
- Vorgänger,
- Tests/VAL-IDs,
- Geräte-Gate,
- Rollback-Commit,
- Status READY.

## 36. In-Progress Stop-/Change-Control

### Scope Expansion
Weiteren Owner nicht beiläufig grundlegend mitverändern. Block stoppen/teilen und neues Entry-Gate.

### Neue fachliche Entscheidung
Keine spontane Codeentscheidung. BLOCKED -> S2D-07 -> kontrollierte Aktualisierung.

### Neue Regression
Im aktuellen Block klären oder zum letzten FROZEN-Stand zurück. Nicht in den nächsten Block verschieben.

### Neuer Guard/Patch
Standardmäßig FAIL/BLOCKED. Temporär nur mit dokumentiertem Grund, Zielowner, Exit-Gate und Entfernungspunkt.

## 37. Exit Gate eines Unterblocks

PASS nur wenn:
- Scope vollständig,
- Changed Files plausibel,
- T1/T2 PASS,
- relevante bestehende Invarianten PASS,
- erforderliche T3/T4 PASS,
- Geräte-Gate erfüllt oder laut Matrix am Hauptblock-Exit fällig,
- keine zweite Ownership,
- keine neue versteckte Timer-/Self-Start-/Patchstruktur,
- Evidence vollständig,
- nur echte dokumentierte Non-Blocker offen.

## 38. Freeze Criteria eines IM-Hauptblocks

FROZEN erst wenn:
- alle Pflicht-Unterblöcke PASS,
- Hauptblock-VAL-Zuordnung PASS,
- vorgeschriebene T3/T4 PASS,
- vorgeschriebenes Geräte-Gate PASS,
- Legacy-Exit nur nach vollständiger Ownerübernahme,
- keine Kernregression/ungeklärte Ownership/Save-Lifecycle-Auswirkung,
- alle Changed Files bewertet,
- finaler Commit eindeutig,
- Branch gegen Parent/Startstand geprüft,
- Status/Evidence aktualisiert.

Nur dieser FROZEN-Commit ist regulärer Parent des nächsten Hauptblocks.

## 39. Branch-Weiterwanderung

Regel:
`FROZEN Parent -> IM-Branch -> PASS -> FROZEN -> nächster Block`

Kein späterer Block basiert auf einem zufälligen Zwischencommit eines unfertigen Vorgängers. Parallele Vorarbeit ist nur isoliert als Dokument-/Testarbeit ohne vorgezogene Zielownership zulässig.

## 40. Main-/Merge-Regel

S2D-06 erteilt keine automatische Merge-Freigabe nach `main`.
- `main` bleibt unangetastet bis ausdrücklicher Merge-Schritt,
- FROZEN = verbindlicher Entwicklungsstand, nicht automatisch gemerged,
- nur PASS/FROZEN darf Mergequelle sein,
- BLOCKED/FAIL/IN PROGRESS nie nach main.

## 41. Deferred Non-Blocker

Nur zulässig, wenn:
- keine V1-Kernregel verletzt,
- keine Daten-/Waren-/Personeninkonsistenz,
- kein Save/Continue-Risiko,
- kein Navigation-Hotloop/Leak,
- kein unbedienbarer Mobile-Core-Flow,
- keine Voraussetzung des nächsten Blocks,
- späterer Zielblock/Tuningbereich benannt.

Nicht als Non-Blocker zulässig: Bau vor Builder-Ankunft, doppelte Ware, State-Verlust bei Continue, Resident-Type-Mutation, Overdelivery, Doppel-Scheduler, unerreichbare Smartphone-Kernaktion.

## 42. Legacy-Removal Release Gate

1. Zielowner implementiert.
2. Regression mit Legacy aktiv PASS.
3. Keine alleinige Fachverantwortung mehr im Legacy-Code.
4. Legacy entfernen.
5. Gleiche Regression erneut PASS.
6. Restreferenzen prüfen.
7. Erst danach Removal PASS/FROZEN.

## 43. Save-/Lifecycle Release Gate

Vor Änderungen an New Game/Continue/Scheduler-Start/Restore/Storage:
- Referenz-Save/Testzustand vorhanden,
- persistente Owner-State-Liste bekannt,
- additive Defaults als verbotener Continue-Effekt getestet,
- Scheduler-/Subscription-Zählung messbar,
- Rollback vorhanden,
- echter Browser-/Reload-Test spätestens am Exit.

Korruptes/inkompatibles Save: fail-closed; kein stiller New-Game-Fallback.

## 44. Mobile-/Rendering Release Gate

Vor IM-12/14 bzw. anderen Touch-/Renderänderungen:
- kleines Smartphone als Pflichtziel,
- betroffene Kerninteraktionen definiert,
- visuelle Darstellung besitzt keine Gameplay-Ownership,
- Desktop-PASS ersetzt Mobile-PASS nicht.

## 45. Entry Conditions von S2D-06 zu IM-00

IM-00 darf erst beginnen, wenn:
1. S2D-00…05 FROZEN/PASS/0 BLOCKER,
2. S2D-06A COMPLETE,
3. S2D-06B COMPLETE,
4. S2D-06C COMPLETE,
5. S2D-06D PASS/FROZEN,
6. keine widersprüchliche Blockreihenfolge,
7. IM-00…17 besitzen Exit-/Acceptance-Gates,
8. Gerätepflichten eindeutig,
9. Legacy-Entfernung besitzt Exit-Regeln,
10. während S2D-06 keine produktive Codeänderung vorgezogen,
11. finaler S2D-06-Frozen-Commit bekannt,
12. Implementierungsbranch direkt davon erzeugt.

## 46. IM-00 Entry Gate

Nach S2D-06 Freeze:
- Implementierungsbranch direkt vom Frozen Commit,
- Branch/HEAD identisch zum Parent,
- produktiver Referenzstand startbar,
- echter Referenz-Gerätetest des Altstands möglich,
- Save/Continue grundsätzlich testbar,
- Diagnose/Baseline ohne Gameplay-Reparatur möglich,
- keine neue Produktentscheidung nötig.

IM-00 darf Baseline/Test-/Diagnoseharness vorbereiten, aber keine Migration aus IM-01+ vorziehen.

## 47. IM-00 Freeze Gate

FROZEN wenn:
- Referenzcommit/Bootpfad dokumentiert,
- Core-Smoke-Checklist reproduzierbar,
- Diagnostic Baseline erfasst,
- Timer-/Interval-/Scheduler-Ausgangslage nachvollziehbar,
- New Game/Continue als Referenzabläufe dokumentiert,
- bekannte bestehende Fehler als Baseline Issues getrennt erfasst,
- keine fachliche Funktion absichtlich verändert,
- Geräte-Referenzcheck abgeschlossen,
- Evidence vollständig.

Erst danach IM-01 READY.

## 48. Known Baseline Issues

Ein vor IM-00 reproduzierbarer Fehler wird `KNOWN BASELINE ISSUE`:
- blockiert IM-00 nicht automatisch, wenn sichere Messung möglich bleibt,
- darf später nur als Altfehler gelten, wenn im FROZEN IM-00 nachgewiesen,
- Verschlechterung in Häufigkeit/Auswirkung/Datenkonsistenz = neue Regression,
- Zielprobleme späterer IM-Blöcke dürfen als Altprobleme bestehen, müssen spätestens am vorgesehenen Exit geschlossen sein.

## 49. Release Evidence Record

Für jeden FROZEN-Hauptblock mindestens:
- Block-ID/Titel,
- Parent Commit,
- Start Branch/HEAD,
- End Commit,
- Changed Files,
- veränderte Owner/Contracts,
- entfernte Legacy-Komponenten,
- T1/T2/T3/T4,
- VAL-IDs,
- Geräte/Browser,
- Performancevergleich falls relevant,
- Known Baseline Issues,
- Deferred Non-Blocker,
- Open Blockers = 0,
- Freeze Decision = PASS/FROZEN.

## 50. Stop-the-Line Criteria

Weiterwanderung stoppt bei:
- Datenverlust/Warenverdopplung,
- Resident-/Unit-Duplikation,
- neuer SaveGame-Korruption,
- Continue mit additiven Defaults,
- Baufortschritt ohne Builder-Ankunft nach zuständigem Construction-Gate,
- neuem Navigation-Hotloop,
- unkontrolliert wachsendem Timer-/Subscription-/Job-/Reservation-State,
- zweitem autoritativen Owner,
- notwendigem undokumentiertem Runtime-Patch,
- nicht reproduzierbarem Branch-/Parent-Stand,
- erforderlichem Geräte-Gate FAIL.

Letzter FROZEN-Commit bleibt verbindliche Basis.

---

# S2D-06D – Internal Consistency & Roadmap Freeze Gate

## 51. Prüfumfang

S2D-06A/B/C wurden geschlossen gegen S2D-00 bis S2D-05 geprüft.

Geprüft wurden insbesondere:
- Produktumfang / kleiner Wirtschaftskern,
- reale Waren- und Transportlogik,
- Construction Material-/Builder-Gate,
- Unit-Identität, Home, Spezialisten und Gründerstart,
- ein State / ein Owner,
- Scheduler-/Lifecycle-Regeln,
- SaveGame-/Continue-Trennung,
- Navigation/Backoff,
- Path/Wear Ownership,
- Mobile-first UI/Touch-Gates,
- Guidance-/Inspector Non-Ownership,
- Contentgrenzen NOW/LATER,
- Balance-Offenheit,
- Legacy Exit Gates,
- Branch-/Freeze-/Evidence-Regeln.

## 52. Prüfergebnis

| Prüfung | Ergebnis |
|---|---|
| Widersprüche zu S2D-00 Product Scope | 0 |
| Widersprüche zu S2D-01 Game Design / Economy | 0 |
| Widersprüche zu S2D-02 Unit & Workforce | 0 |
| Widersprüche zu S2D-03 Technical Architecture | 0 |
| Widersprüche zu S2D-04 UI / Mobile UX | 0 |
| Widersprüche zu S2D-05 Content Catalog | 0 |
| fehlende IM-Hauptblöcke für eingefrorene Ownerbereiche | 0 |
| IM-Blöcke ohne Exit-/Acceptance-Gate | 0 |
| ungeklärte Gerätepflicht | 0 |
| Legacy-Removal ohne vorheriges Zielowner-Gate | 0 |
| Save/Continue-Lifecycle-Widerspruch | 0 |
| Navigation-/Path-Performance-Widerspruch | 0 |
| vorgezogene LATER-Contentmechanik | 0 |
| vorgezogene finale Balancezahlen | 0 |
| produktive Gameplay-/Runtime-/UI-Codeänderungen während S2D-06 | 0 |
| offene S2D-06-Blocker | **0** |

## 53. Kritische Cross-Checks

- S2D-06 übernimmt den verbindlichen Wirtschaftskern `HQ -> Häuser -> Bewohner -> Produktion -> lokaler Stock -> physischer Transport -> HQ -> Bau -> Expansion` ohne Scope-Erweiterung.
- Goods One-Location wird durch IM-08/09, VAL-003 und Save/Recovery-Gates durchgehend geschützt.
- Construction bleibt `WAIT_MATERIAL -> WAIT_BUILDER -> BUILDING -> COMPLETE`; IM-07/VAL-004/005 verhindern Bau vor Builder-Ankunft und Overdelivery.
- Resident Identity und Capability-Modell bleiben in IM-05/06/09/10 erhalten; Resident Helper wird nie temporär Carrier-Typ.
- S2D-05-Gründerroster wird nur in New Game erzeugt; Continue darf keine Gründer/Defaults addieren.
- Ein Owner pro Zustand wird zuerst über Contracts/Validation und danach domainweise konsolidiert; UI/Renderer/Inspector bleiben Consumer.
- Scheduler-Migration liegt vor Owner-Großumbauten; Feature-Timer werden nicht durch neue dauerhafte Feature-Timer ersetzt.
- Navigation bleibt zunächst A*-basiert, wird aber über NavigationService, Reachability und Backoff zentralisiert; kein Pathfinder-Big-Bang.
- Path/Wear wird erst nach Navigation migriert und besitzt separaten autoritativen Wear-State; Render Cache bleibt Darstellung.
- SaveGame wird nach den Domainmigrationen owner-basiert konsolidiert und startet Scheduler erst nach vollständigem Restore-PASS.
- Smartphone-Gates sind bei Navigation/Path/Save/UI/End-to-End explizit verankert; Desktop-PASS ersetzt sie nicht.
- Legacy-Schichten werden nur nach zugehörigem Zielowner-PASS entfernt und danach mit denselben Regressionen erneut geprüft.
- `main` wird durch S2D-06 nicht automatisch verändert oder freigegeben.
- Known Baseline Issues legitimieren Altfehler nicht als Zielzustand; sie trennen nur vorhandene Altprobleme von neuen Regressionen.

## 54. Freeze-Entscheidung

S2D-06A – COMPLETE  
S2D-06B – COMPLETE  
S2D-06C – COMPLETE  
S2D-06D – PASS / 0 BLOCKER

**S2D-06 ROADMAP & VALIDATION V0.1 FROZEN – PASS / 0 BLOCKER**

Änderungen an dieser Roadmap oder den eingefrorenen Produkt-/Architekturregeln erfolgen ab jetzt nur kontrolliert über `S2D-07 – DECISION & CHANGE LOG` bzw. einen ausdrücklich freigegebenen Roadmap-Revisionsblock.

Der nächste zulässige technische Hauptblock ist **IM-00 – Baseline & Safety Harness**. Ein neuer Implementierungsbranch muss direkt vom finalen S2D-06-Frozen-Commit erzeugt werden.