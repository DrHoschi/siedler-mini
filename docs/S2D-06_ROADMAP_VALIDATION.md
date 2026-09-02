# S2D-06 – ROADMAP & VALIDATION

Status: **V0.1 DRAFT – S2D-06A COMPLETE**  
Datum: 2026-09-02  
Repository: `DrHoschi/siedler-mini`  
Arbeitsbranch: `feature/s2d-06-roadmap-validation`  
Verbindliche Basis: S2D-00 bis S2D-05 jeweils **V0.1 FROZEN – PASS / 0 BLOCKER**

# S2D-06A – Implementation Work Breakdown & Migration Sequence

## 1. Zweck

S2D-06A übersetzt die eingefrorene Produkt-, Workforce-, Architektur-, UI- und Contentplanung in eine konkrete technische Umsetzungsreihenfolge.

Ziel ist ausdrücklich **kein Big-Bang-Rewrite**.

Jeder Implementierungsblock soll:

- eine klar begrenzte Ownership-/Funktionsverantwortung übernehmen,
- möglichst wenige produktive Dateien gleichzeitig verändern,
- vorhandene funktionierende Mechanik erhalten,
- bekannte Legacy-Guards erst nach bestandenem Exit-Gate entfernen,
- einen eindeutigen Regressionstest besitzen,
- bei Fehlern auf einen klaren vorherigen Stand zurückführbar bleiben.

## 2. Zentrale Migrationsregel

> **Erst Ziel-Owner und Vertrag funktionsfähig machen, dann Legacy-Guard entfernen.**

Unzulässig ist:

`alte Patchschicht entfernen -> große Funktionslücke -> später irgendwann Zielsystem bauen`

Zulässig ist:

`Zielowner vorbereiten -> Altpfad kontrolliert anbinden -> Regression PASS -> alten Guard/Pfad entfernen -> erneut Regression PASS`

## 3. Globale Gates für jeden Implementierungsblock

Vor jedem Block:

1. erwarteten Branch prüfen,
2. erwarteten HEAD prüfen,
3. Branch gegen vorherigen freigegebenen Stand vergleichen,
4. geplante betroffene Owner/Dateien benennen,
5. keine fachliche Scope-Erweiterung außerhalb S2D-00 bis S2D-05 zulassen.

Nach jedem Block:

1. geänderte Dateien prüfen,
2. keine unbeabsichtigten Fremdmodule/Assets verändert,
3. Block-spezifische Regression durchführen,
4. zentrale Invarianten prüfen,
5. Commit setzen,
6. Blockstatus PASS / BLOCKED dokumentieren.

## 4. Dauerhafte Regression-Invarianten

Jeder spätere technische Block muss mindestens sicherstellen, dass keine bereits bestätigte Kernregel verletzt wird:

- New Game erzeugt genau einen gültigen Startzustand.
- Continue restauriert ohne additive Defaults.
- Gebäudezustand bleibt nach Continue erhalten.
- physische Waren existieren wirtschaftlich nur an genau einem Ort.
- Produktion schreibt zuerst in lokalen BuildingStock.
- HQ-Credit erst nach realer Lieferung.
- Baustellen erzeugen keinen Baufortschritt vor realer Builder-Ankunft.
- Carrier liefern nicht über den realen Restbedarf hinaus.
- Resident-Helfer bleiben Resident.
- Spezialisten bleiben reale Personen.
- WorkArea-Produktion nutzt reale Weltziele.
- Pause stoppt neue Produktion, nicht Abtransport fertiger Ware.
- kein Zombie-Job/Assignment/Reservation.
- keine A*-Hot-Fail-Schleife.
- automatische Pfade bleiben aus realer Bewegung ableitbar.
- Continue startet Scheduler/Subscriptions nicht doppelt.
- UI/Renderer/Inspector werden nie Gameplay-Owner.

---

# 5. Gesamt-Migrationsreihenfolge

Die Implementierung erfolgt in folgenden Hauptphasen:

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

Diese Reihenfolge folgt den eingefrorenen Ownership- und Exit-Gate-Abhängigkeiten. Einzelne vorbereitende Interfaces dürfen früher entstehen, aber fachliche Ownership wird nicht übersprungen.

---

# 6. IM-00 – Baseline & Safety Harness

## Ziel

Vor produktiver Migration wird der aktuelle funktionierende Referenzstand technisch messbar und reproduzierbar gemacht.

## Teilblöcke

### IM-00A – Branch/Version/Reference Baseline

- neuen Implementierungsbranch später direkt vom eingefrorenen S2D-06-Stand erzeugen,
- Referenzcommit dokumentieren,
- aktuelle produktive Startdateien/Bootpfade festhalten,
- keine Funktion verändern.

Gate:
- Spiel startet,
- New Game möglich,
- Continue grundsätzlich erreichbar,
- keine produktive Codeänderung außer ggf. Versions-/Diagnosemetadaten.

### IM-00B – Core Smoke-Test Checklist

Verbindliche kurze Regression definieren:
- New Game,
- Gebäude setzen,
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

Messwerte vor Migration erfassen:
- GameTick/Simulation-Dauer,
- Unit-Kosten,
- Navigation-Aufrufe/Failrate,
- aktive Jobs,
- Carrier-/Workerzahl,
- ggf. Timer-/Interval-Inventur aktualisieren.

Keine Optimierung in diesem Block.

Exit Gate IM-00:
**Referenzstand reproduzierbar und messbar.**

---

# 7. IM-01 – Public Owner Boundaries & Runtime Contracts

## Ziel

Vor größeren Umbauten werden die öffentlichen Zugriffsgrenzen der künftigen Owner eingeführt, ohne sofort alle Interna zu ersetzen.

Betroffene Domänen:
- Buildings,
- Units,
- Jobs,
- Construction,
- BuildingStock,
- Production,
- Logistics,
- Housing/Economy,
- MapResources/Animals,
- Navigation,
- Path,
- SaveGame.

## Teilblöcke

### IM-01A – Read APIs / Snapshots

Für relevante Owner kontrollierte Read-/Snapshot-Zugriffe definieren.

Gate:
- UI/Inspector können bestehende Informationen weiterhin lesen,
- keine zweite State-Kopie als Owner.

### IM-01B – Command Boundaries

Mutationen schrittweise über Owner-Commands/Operations leiten.

Gate:
- bestehende Kernfunktionen unverändert,
- keine neue direkte Fremdmutation eingeführt.

### IM-01C – Domain Events

Nur echte Fakten emittieren, z. B. BuildingPlaced, GoodsDelivered, AssignmentCompleted.

Gate:
- Events lösen keine versteckte zweite Mutation aus.

Exit Gate IM-01:
**Grundlegende Owner-Verträge vorhanden, ohne Gameplay-Regression.**

---

# 8. IM-02 – Central Scheduler & Lifecycle Foundation

## Ziel

Genau eine autoritative Quelle für Simulationsfortschritt etablieren.

## Teilblöcke

### IM-02A – Scheduler Core

Zentrale Phasenstruktur implementieren, zunächst parallel zu noch nicht migrierten Legacy-Systemen nur dort aktiv, wo sicher.

### IM-02B – Boot Registration

Systeme werden explizit registriert; kein neuer Hidden Self-Start.

### IM-02C – Pause / Resume / Shutdown Contract

Simulation Pause, Continue-Vorbereitung und Shutdown sauber trennen.

### IM-02D – Timer Migration Wave 1

Unkritische Feature-Intervalle in Scheduler/Due-Tasks überführen.

Exit Gate:
- Pause stoppt Simulationszeit,
- kein doppelter Scheduler nach Reload/Continue,
- noch vorhandene Legacy-Timer sind inventarisiert und absichtlich beibehalten.

---

# 9. IM-03 – Runtime Validation Foundation

## Ziel

Fehler erkennen, bevor weitere Owner migriert werden.

## Prüffelder

- Goods one-location,
- FREE vs. ASSIGNED,
- Zombie Assignment/Reservation,
- Builder-arrival invariant,
- Building ownership,
- Home ownership,
- duplicate scheduler/subscriptions,
- invalid restore references.

## Regel

Validator beobachtet/stoppt fail-closed, repariert aber keine fremden Zustände heimlich.

Exit Gate:
**kritische Invarianten sichtbar/testbar, ohne produktive Auto-Reparatur.**

---

# 10. IM-04 – BuildingStore Ownership Consolidation

## Ziel

Genau eine autoritative Building-Collection.

## Teilblöcke

### IM-04A – Authoritative BuildingStore

Bestehende Building-Daten auf eine Ownerquelle festziehen.

### IM-04B – Consumers migrieren

Construction, Renderer, UI, Pause, SaveGame lesen denselben Owner.

### IM-04C – Legacy Building Sync entfernen

Erst nach PASS.

Regression Gate:
- Gebäude platzieren,
- auswählen,
- pausieren soweit zulässig,
- speichern,
- Continue,
- Gebäude weiterhin exakt vorhanden,
- keine doppelte Buildingliste.

Exit Gate:
**Building-Doppel-Owner geschlossen.**

---

# 11. IM-05 – Unit Identity, Housing & Start Roster Foundation

## Ziel

Das eingefrorene Modell `Person + Home + Spezialisierung + Capabilities + Assignment` als Runtimebasis etablieren.

## Teilblöcke

### IM-05A – Stable Person Identity

Stabile Unit-ID und dauerhafte Personidentität.

### IM-05B – Home Binding

Home-Bindung unabhängig vom Arbeitsplatz.

### IM-05C – Specialization & Capabilities

Carrier, Builder, Lumberjack, Stonecutter, Fisher, Hunter plus allgemeiner Resident Helper.

### IM-05D – New Game Founder Roster

Reale Gründergruppe mit temporärer HQ-Home-Bindung und vollständiger Mindest-Capability-Abdeckung.

### IM-05E – House Occupancy

Kleines Haus Kapazität 2, mittleres Haus 3; Gründer-Umsiedlung zuerst, danach ggf. neue allgemeine Bewohner.

Regression Gate:
- Population = reale Personen,
- Resident-Helfer bleibt Resident,
- Gründer werden nicht doppelt gezählt,
- Häuser besitzen korrekte Belegung,
- keine zufällige Spezialistenproduktion.

Exit Gate:
**saubere Person-/Housing-Basis ohne Resident-Type-Mutation.**

---

# 12. IM-06 – JobEngine / Assignment Contract Migration

## Ziel

JobEngine verwaltet Bedarf/Priorität, Assignment bindet reale Units; keine Identitätsänderung.

## Teilblöcke

### IM-06A – Job Validity

Job nur aus realem Bedarf.

### IM-06B – Eligibility

Capability + Availability + Reachability + Preconditions.

### IM-06C – Single Assignment

Keine Doppelzuweisung einer Unit.

### IM-06D – Completion / Cancel / Recovery Contract

Kein Zombie-State.

Regression Gate:
- Carrierjob,
- Resident-Helferjob,
- Builderjob,
- Produktionsjob,
- ungültiger Job verschwindet sauber,
- keine Hot-Retry-Schleife.

Exit Gate:
**Job und Assignment fachlich getrennt und konsistent.**

---

# 13. IM-07 – ConstructionSystem Migration

## Ziel

Construction nativ nach eingefrorenem Material-/Builder-Modell.

## Teilblöcke

### IM-07A – Material Demand

`Restbedarf = Soll - geliefert - gültig reserviert/unterwegs`

### IM-07B – WAIT_BUILDER State

Material vollständig erzeugt noch keinen Fortschritt.

### IM-07C – Builder Assignment & Arrival

Builder muss real den gültigen Baupunkt erreichen.

### IM-07D – Construction Progress / Completion

Fortschritt nur während gültiger Builderarbeit.

### IM-07E – Construction Guard Exit

`sa04.pause-builder-fixes`/vergleichbare Construction Guards erst jetzt entfernen.

Regression Gate:
- Material unvollständig -> kein Bau,
- Material vollständig, Builder unterwegs -> kein Bau,
- Builder angekommen -> Bau beginnt,
- Baustellenpause/Abbruch sauber,
- Continue während Baustelle korrekt.

Exit Gate:
**Construction Builder Guard nicht mehr erforderlich.**

---

# 14. IM-08 – BuildingStock & ProductionSystem Migration

## Ziel

Produktion erzeugt ausschließlich lokalen physischen Output.

## Teilblöcke

### IM-08A – BuildingStock Ownership

Lokale Mengen je Produktionsgebäude eindeutig.

### IM-08B – Production Worker Contract

Spezialist + WorkArea + reales Weltziel + reale Ankunft.

### IM-08C – Outputs

- Lumberjack -> wood,
- Quarry -> stone,
- Fisher -> fish,
- Hunter -> meat + pelt.

### IM-08D – Pause

Neue Produktion stoppt; vorhandener Output bleibt abholbar.

### IM-08E – Production Bridge Exit

Direkte HQ-Gutschrift und historische Bridge erst nach PASS entfernen.

Regression Gate:
- Output entsteht lokal,
- HQ bleibt zunächst unverändert,
- voller lokaler Stock blockiert korrekt,
- Pause funktioniert,
- Continue erhält lokalen Stock.

Exit Gate:
**Production Bridge nicht mehr erforderlich.**

---

# 15. IM-09 – Logistics & Reservation Migration

## Ziel

Physischer Warentransport über eindeutige Reservation und reale Unit.

## Teilblöcke

### IM-09A – Transport Demand

Quelle, Ziel, Ware, Menge und realer Bedarf.

### IM-09B – Reservation

Reservation verändert keinen physischen Warenort.

### IM-09C – Pickup

Ware wechselt Quelle -> Unit.

### IM-09D – Delivery

Ware wechselt Unit -> Ziel.

### IM-09E – Recovery

Abbruch vor/nach Pickup sauber.

### IM-09F – Overdelivery Guard Exit

Erst wenn Restbedarf nativ Reservation/unterwegs berücksichtigt.

Regression Gate:
- Produzent -> lokaler Stock -> Carrier -> HQ,
- Baustellenlieferung exakt bis Bedarf,
- kein Überschussjob,
- Ziel verschwindet vor/nach Pickup sauber behandelt,
- Resident Helper funktioniert ohne Typänderung.

Exit Gate:
**physische Warenkette und Overdelivery nativ korrekt.**

---

# 16. IM-10 – Housing / Population / Gold Integration

## Ziel

Population und Economy auf realen Bewohnern aufbauen.

## Teilblöcke

### IM-10A – Population Derived View

Kein eigener Resource-Counter als Wahrheit.

### IM-10B – Founder Rehousing

HQ-Gründer kontrolliert in regulären Wohnraum umziehen.

### IM-10C – General Resident Spawn

Nur verbleibende freie Plätze erzeugen neue allgemeine Bewohner.

### IM-10D – Gold / Tax Economy

Gold aus realen gültigen Bewohnern über Economy-Owner; keine physische Goldware.

Regression Gate:
- Haus klein 2 / mittel 3 Kapazität,
- Population korrekt,
- keine Doppelzählung,
- Gold wächst genau einmal,
- Pause stoppt Simulationszeit,
- Continue erzeugt keine Zusatzsteuer beim Restore.

Exit Gate:
**Housing/Economy ohne Legacy-Doppelwahrheit.**

---

# 17. IM-11 – NavigationService Consolidation

## Ziel

Alle produktiven Systeme verwenden einen NavigationService.

## Teilblöcke

### IM-11A – Access/Docking Points

Gebäudeziele auf gültige Interaktionspunkte normalisieren.

### IM-11B – Structural Reachability

Grobe Vorprüfung.

### IM-11C – Exact Reachability / Path Request

Nur geeignete Kandidaten lösen echte Pfadsuche aus.

### IM-11D – Negative/Positive Cache & Backoff

Keine `A* pro Job × Unit × Tick`-Struktur.

### IM-11E – PFGlue Absorb/Exit

Historische Glue-Schichten erst nach vollständiger Migration entfernen.

Regression Gate:
- bekannte Performance-Stressszene,
- A*-FAIL keine Hotloop,
- unerreichbare Jobs backoffen,
- normale Bewegung/Arbeitsankunft korrekt,
- GameUnits-Budget deutlich unter problematischem Altzustand.

Exit Gate:
**Navigation zentralisiert, Feature-Retry-Schleifen entfernt.**

---

# 18. IM-12 – Path/Wear System Migration

## Ziel

Trampelpfade aus Wear-State statt permanenten Einzelstempeln.

## Teilblöcke

### IM-12A – Wear State

Reale Unitbewegung erhöht lokale Nutzung.

### IM-12B – Dirty Regions

Nur veränderte Bereiche markieren.

### IM-12C – Render Cache / Bake

Periodische visuelle Aktualisierung.

### IM-12D – Decay

Langsames Nachwachsen in Simulationszeit.

### IM-12E – Legacy Stamp Exit

Altes Overlay-/Stampmodell entfernen, wenn Darstellung äquivalent funktioniert.

Regression Gate:
- häufig genutzte Strecke wird sichtbarer,
- keine endlos wachsende Stempelliste,
- wenig genutzte Strecke kann verblassen,
- Performance stabil,
- Save/Continue erhält Wear-Zustand.

Exit Gate:
**PathSystem owns Wear, Renderer nur Cache/Darstellung.**

---

# 19. IM-13 – SaveGame Owner Snapshot & Continue Reconstruction

## Ziel

Continue wird vollständig owner-basiert und benötigt keine additive Patchphase mehr.

## Teilblöcke

### IM-13A – Snapshot Contracts je Owner

Persistieren nur authoritative/persistenznotwendige Daten.

### IM-13B – Stable References

Building/Unit/Home/Assignment/Warenbeziehungen über stabile IDs.

### IM-13C – Restore Order

Verbindliche Reihenfolge aus S2D-03 umsetzen:
- Scheduler stop,
- validate,
- clear,
- foundational owners,
- domain owners,
- Units/relations,
- carried goods/reservations/recovery,
- jobs reconstruct,
- cross-owner validation,
- transient rebuild,
- register once,
- scheduler start after PASS.

### IM-13D – New Game vs Continue Separation

Kein New-Game-Starter-Roster, kein Default-Resource-Credit, kein Resident-Spawn beim Continue.

### IM-13E – Save Guards Exit

UID-/Persistence-/Restore-Patches erst nach vollständigem PASS entfernen.

Regression Gate:
- Gebäude,
- HQ-Waren,
- lokale BuildingStocks,
- Baustellenlieferungen/Fortschritt,
- Bewohner/Gründer/Home,
- Spezialisten,
- Gold,
- MapResources,
- Tiere soweit persistenzpflichtig,
- WorkAreas,
- Path Wear,
- carried goods/recovery,
- Pausezustände

nach Continue äquivalent.

Exit Gate:
**Continue benötigt keinen Gameplay-Patch mehr.**

---

# 20. IM-14 – UI / Mobile Runtime Integration

## Ziel

Die eingefrorene S2D-04-Bedienlogik auf die neuen Owner-APIs anbinden.

## Teilblöcke

### IM-14A – Compact HUD

Wood, stone, gold, population plus Menü/Bauen; weitere Goods schnell erreichbar.

### IM-14B – Context Panel

Gebäude-/Baustellenzustände aus echten Read Models.

### IM-14C – Build Catalog & Placement

Wohnen/Produktion, Preview, Validity, Confirm/Cancel.

### IM-14D – WorkArea Editor

Vorschlag getrennt vom aktiven Bereich bis Confirm.

### IM-14E – Economy Overview

Available / Local / Reserved / En route ohne Doppelzählung.

### IM-14F – Main Menu / Save / Continue

New Game und Continue technisch/visuell getrennt.

Regression Gate Smartphone:
- Pan/Zoom/Select,
- Build,
- Placement confirm/cancel,
- Context Panel,
- Pause,
- WorkArea,
- Save/Continue,
- keine core action nur per Hover/Keyboard.

Exit Gate:
**UI arbeitet ausschließlich über Owner-Read/Command-Verträge.**

---

# 21. IM-15 – Guidance & Inspector Integration

## IM-15A – Guidance

Stable Guidance IDs, real-event-driven, persisted, restartable.

Keine Gameplay-Ausnahme durch Tutorial.

## IM-15B – Runtime Inspector

Read-only Snapshots plus kontrollierte Debug Commands für:
- Buildings,
- Units/Workforce,
- Jobs,
- Economy/Stocks,
- Construction,
- Navigation,
- Path,
- SaveGame,
- Scheduler/Performance.

Keine Asset-/Sprite-/JSON-Editorfunktionen zurück in den Game-Inspector.

Exit Gate:
**Guidance und Inspector optional; Abschalten verändert Gameplay nicht.**

---

# 22. IM-16 – Legacy Guard Removal & Architecture Closure

## Ziel

Alle bekannten Übergangs-/Patchschichten gegen ihre Exit-Gates prüfen und nur bei PASS entfernen.

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
2. Regression vor Entfernung PASS,
3. Guard entfernen,
4. Regression erneut PASS,
5. keine neue Ersatz-Patchschicht einführen.

Exit Gate:
**keine produktive Legacy-Korrekturschicht mehr für bereits migrierte Kernregeln.**

---

# 23. IM-17 – V1 Core End-to-End Validation

## Ziel

Erstmals den vollständig migrierten kleinen Wirtschaftskern als zusammenhängendes Spiel prüfen.

## 23.1 Functional Golden Path

1. New Game.
2. Gründergruppe vorhanden.
3. erstes Wohnhaus bauen.
4. Material real liefern.
5. Builder real ankommen lassen.
6. Bewohner/Home korrekt.
7. Holzproduktion starten.
8. lokaler Stock entsteht.
9. Carrier bringt Holz real ins HQ.
10. Steinproduktion.
11. Fischproduktion.
12. Jagd auf reales Tier.
13. Fleisch/Fell transportieren.
14. zweites/weiteres Gebäude bauen.
15. Produktionspause/Resume.
16. WorkArea ändern.
17. Resident Helper Transport beobachten.
18. Gold/Population prüfen.
19. Trampelpfade entstehen lassen.
20. Save.
21. Continue.
22. gesamten Zustand vergleichen.

## 23.2 Stress Gates

- mehrere Produktionsgebäude,
- mehrere Baustellen,
- knappe Carrier,
- knapper Builder,
- fehlender Spezialist,
- voller lokaler Stock,
- erschöpfte Weltressource,
- keine Jagdtiere in WorkArea,
- unerreichbares Ziel,
- Transportabbruch/Recovery,
- längere Simulationslaufzeit,
- Save/Continue unter belastetem Zustand.

## 23.3 Performance Gate

Mindestens prüfen:
- keine Navigation-Hotloop,
- keine wachsende Timer-/Subscription-Duplikation,
- keine unbegrenzt wachsende Path-Stamp-Liste,
- keine dauerhaft wachsenden Zombie-Jobs/Reservations,
- Scheduler-/Unit-/Navigation-Kosten bleiben unter kontrollierter Last stabil.

## 23.4 Mobile Gate

Mindestens auf kleinem Smartphone:
- HUD lesbar,
- Menüs erreichbar,
- Placement sicher,
- Pan/Zoom/Select zuverlässig,
- Context Panel bedienbar,
- Save/Continue nutzbar,
- keine abgeschnittenen Kernbuttons.

Exit Gate IM-17:
**V1 Small Economic Core = funktional, persistierbar, mobile-bedienbar und architektonisch konsistent.**

---

# 24. Blockgrößen-Regel für die tatsächliche Implementierung

Jeder technische Unterblock soll bevorzugt so klein sein, dass:
- eine Hauptverantwortung verändert wird,
- ein konkretes Exit-/Regression-Gate existiert,
- Fehlerursachen lokalisiert werden können,
- kein mehrtägiger Big-Bang-Zustand entsteht.

Wenn ein Block mehrere Owner gleichzeitig grundlegend verändern müsste, ist er vor Umsetzung weiter zu teilen.

## 25. Testarten

S2D-06 verwendet künftig vier Testebenen:

### T1 – Static/Contract Check

Dateien, APIs, Ownership, keine unerlaubten Direktzugriffe.

### T2 – Targeted Runtime Regression

Genau der geänderte Ablauf.

### T3 – Core Smoke Regression

Kurzer kompletter Kerncheck aus IM-00B.

### T4 – End-to-End / Stress

Längere Szenarien und Save/Continue unter Last.

Nicht jeder kleine Block benötigt T4. Jeder produktive Block benötigt mindestens T1 + T2; bei Owner-/Lifecycle-/Save-/Scheduler-Änderungen zusätzlich T3.

## 26. Geräte-PASS-Regel

Nicht jede interne Architekturänderung muss auf jedem Gerät einzeln manuell geprüft werden.

Geräte-/Mobile-PASS ist besonders erforderlich, wenn betroffen sind:
- UI,
- Touch/Pointer,
- Rendering,
- Canvas/Path-Darstellung,
- Performance,
- Save/Storage-Verhalten im Browser,
- Lifecycle bei echter Seitennavigation/Reload.

Reine interne Contract-/Owner-Änderungen können zunächst automatisiert/gezielt geprüft werden, solange das nächste relevante Geräte-Gate nicht übersprungen wird.

## 27. S2D-06A Abschlussstatus

- technische Migrationsreihenfolge aus S2D-03 abgeleitet: **PASS**
- S2D-04 UI-/Mobile-Abhängigkeiten eingebunden: **PASS**
- S2D-05 Content-/Startroster-Abhängigkeiten eingebunden: **PASS**
- Legacy Exit-Gates berücksichtigt: **PASS**
- Save/Continue als eigener Lifecycle berücksichtigt: **PASS**
- Navigation-/Path-Performance berücksichtigt: **PASS**
- kleine prüfbare Implementierungsblöcke definiert: **PASS**
- Regressionsebenen definiert: **PASS**
- Gameplay-/Runtime-/UI-Codeänderungen: **0**
- offene S2D-06A-Blocker: **0**

**S2D-06A – Implementation Work Breakdown & Migration Sequence: COMPLETE / 0 BLOCKER**

S2D-06 bleibt **V0.1 DRAFT** bis Validation Matrix, Release-/Freeze-Gates und der interne Konsistenzabschluss definiert sind.
