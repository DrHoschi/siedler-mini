# S2D-03F – Path/Wear Runtime, Dirty Regions & Render Cache Architecture

Status: **COMPLETE – Bestandteil von S2D-03 TECHNICAL ARCHITECTURE V0.1 DRAFT**  
Datum: 2026-09-02  
Repository: `DrHoschi/siedler-mini`  
Arbeitsbranch: `feature/s2d-03-technical-architecture`  
Verbindliche Basis: `S2D-00 PROJECT MASTER V0.1 FROZEN` + `S2D-01 GAME DESIGN V0.1 FROZEN` + `S2D-02 UNIT & WORKFORCE MODEL V0.1 FROZEN` + `S2D-03A/B/C/D/E COMPLETE`

> Konsolidierungshinweis: Dieser geschlossene Teilblock wird spätestens beim S2D-03 Freeze-Gate in `S2D-03_TECHNICAL_ARCHITECTURE.md` konsolidiert. Er ist kein zusätzliches dauerhaftes Architektur-Masterdokument.

## 1. Zweck

S2D-03F definiert die technische Zielarchitektur für automatisch entstehende Trampelpfade, lokale Wear-Akkumulation, Dirty-Regionen und die daraus abgeleitete Darstellung.

Der Block legt fest:

- welches System den dauerhaften Wear-Zustand besitzt,
- wie reale Unit-Bewegung Wear erzeugt,
- wie wiederholte Bewegung räumlich zusammengefasst wird,
- wie Wear anwächst und langsam wieder abklingt,
- wie Dirty-Bereiche markiert werden,
- wie Renderer/Render-Cache nur geänderte Bereiche neu erzeugen,
- wie Gameplay-State und Darstellung strikt getrennt bleiben,
- wie Save/Continue mit Wear und Render-Caches umgeht,
- wie verhindert wird, dass erneut tausende dauerhafte Einzelstempel oder Renderobjekte entstehen.

Noch nicht festgelegt werden konkrete Rastergröße, Brush-/Maskengröße, Transparenzwerte, Decay-Geschwindigkeit, Re-Bake-Intervalle, Canvas-/GPU-Technik oder finale Texturen.

## 2. Zentrale Ownership-Regel

> **PathSystem besitzt den autoritativen Wear-Zustand; Renderer und Render-Cache besitzen ausschließlich dessen visuelle Repräsentation.**

Zielbild:

`reale Unit-Bewegung -> PathSystem Wear-Akkumulation -> Dirty Region -> PathRenderer/Re-Bake -> sichtbarer Trampelpfad`

Nicht Zielbild:

`Unit-Bewegung -> neues dauerhaftes Sprite/Stempelobjekt -> Renderer verwaltet tausende Objekte -> SaveGame speichert Renderobjekte`

Das sichtbare Pfadbild ist daher niemals zweite Gameplay-Wahrheit.

## 3. Wear statt permanenter Einzelstempel

Die historische Logik mit immer neuen unabhängigen Markierungen wird nicht übernommen.

Stattdessen wird die Karte fachlich in räumliche Wear-Zellen bzw. kleine aggregierbare Bereiche unterteilt.

Jeder Bereich besitzt einen Wear-Wert innerhalb eines definierten Bereichs, sinngemäß:

`0 = keine sichtbare Nutzung`

bis

`MAX = stark ausgelaufener Trampelpfad`

Wiederholte Bewegung nahe derselben Stelle erhöht denselben lokalen Wear-Zustand statt neue permanente Objekte anzulegen.

## 4. Wear entsteht nur durch reale Bewegung

Wear wird ausschließlich aus tatsächlich stattfindender Unit-Bewegung erzeugt.

Beispiele:

- Carrier läuft mit Ware,
- Bewohner geht zur Arbeit,
- Bewohner geht in Freizeitnähe spazieren,
- Builder geht zur Baustelle,
- Worker geht zum Arbeitsziel,
- Unit kehrt nach Hause zurück.

Nicht ausreichend für Wear sind:

- geplanter Pfad ohne Bewegung,
- reine A*-Berechnung,
- Jobzuweisung,
- Teleport/Restore-Positionierung,
- Renderer-Animation ohne tatsächliche Simulationsbewegung.

Damit bleibt der sichtbare Pfad ein direktes Ergebnis realer Nutzung.

## 5. Bewegungsintegration

Das Unit-System meldet während der zentralen Movement-Phase echte zurückgelegte Bewegung an PathSystem.

Fachlich reicht ein Vertrag wie:

`Movement Segment / Position Delta -> PathSystem.accumulateWear(...)`

Der genaue Methodenname bleibt offen.

Wichtig:

- PathSystem liest keine Unit-Interna direkt,
- Unit-System schreibt Wear nicht selbst,
- Rendering erzeugt kein Wear,
- ein einzelner Simulationsschritt darf denselben Bewegungsabschnitt nicht mehrfach verbuchen.

## 6. Räumliche Aggregation

Wear wird räumlich zusammengefasst.

Mehrere Bewegungen innerhalb desselben oder benachbarten kleinen Bereichs sollen denselben sichtbaren Pfad verstärken.

Ziel ist:

- keine perfekte mathematische Ein-Pixel-Linie,
- keine zufällige dauerhafte Stempelwolke,
- ein organisch breiter werdender Bereich bei häufiger Nutzung,
- leichte Variation innerhalb einer kontrollierten Breite.

Die konkrete Raster-/Brush-Auflösung wird erst bei Implementierung festgelegt.

## 7. Segmentbasierte Eintragung

Bei Bewegung zwischen zwei Positionen muss Wear nicht nur am Endpunkt entstehen.

PathSystem soll fachlich den tatsächlich durchlaufenen Bewegungsabschnitt abbilden.

Dazu kann später verwendet werden:

- Sampling entlang des Segments,
- Raster-Traversal,
- Brush entlang der Strecke,
- andere äquivalente Verfahren.

Verbindlich ist nur:

> **Schnell bewegte Units dürfen keine sichtbaren Lücken im Wear hinterlassen, nur weil zwischen zwei Ticks größere Positionsabstände entstehen.**

## 8. Wear-Zuwachs

Wear wächst kontrolliert und sättigt sich.

Wiederholte Nutzung eines Bereichs:

- erhöht vorhandenen Wear,
- darf einen Maximalwert nicht unbegrenzt überschreiten,
- erzeugt keine zusätzliche unabhängige Stempelinstanz.

Optional dürfen verschiedene Unit-/Bewegungstypen später unterschiedliche Beiträge besitzen, z. B. Träger mit Ware stärker als seltene Freizeitbewegung. Für V1 wird damit noch kein finaler Balancewert festgelegt.

## 9. Organische Variation

Die Darstellung darf trotz aggregiertem State natürlich wirken.

Variation kann später entstehen durch:

- transparente Footprint-/Noise-Masken,
- leicht unterschiedliche Deckkraft,
- kontrollierte lokale Streuung,
- mehrere Detailmasken,
- Terrainabhängigkeit.

Diese Variation ist rein visuell.

Sie darf niemals zusätzliche persistente Wear-Objekte oder zweite Gameplay-Werte erzeugen.

## 10. Wear Decay / Zuwachsen

Ungenutzte Trampelpfade sollen langfristig schwächer werden können.

Daher besitzt PathSystem fachlich einen kontrollierten Decay-Mechanismus.

Ziel:

`starke Nutzung -> Wear steigt`

`keine Nutzung über längere Simulationszeit -> Wear sinkt langsam`

`Wear nahe 0 -> Pfad verschwindet visuell`

Decay wird durch die zentrale Simulationszeit gesteuert und nicht durch einen eigenen unkoordinierten `setInterval`.

Exakte Rate und Balance bleiben offen.

## 11. Decay ist Low-Frequency Work

Wear muss nicht in jedem Simulationsschritt über die gesamte Karte abgesenkt werden.

Der Scheduler darf Decay als Low-Frequency-/Maintenance-Aufgabe behandeln.

Mögliche spätere Optimierungen:

- nur aktive Wear-Regionen prüfen,
- zeitgestempelte Regionen verwenden,
- Decay mathematisch aus vergangener Simulationszeit berechnen,
- Batch-Verarbeitung.

Verbindlich ist:

> **Kein globaler Full-Map-Wear-Scan pro GameTick.**

## 12. Dirty Regions

Wenn sich Wear fachlich relevant verändert, markiert PathSystem nur den betroffenen Kartenbereich als `dirty`.

Dirty bedeutet:

- visuelle Repräsentation dieses Bereichs ist veraltet,
- nicht: Gameplay-State ist ungültig.

Dirty-Information ist transiente Runtime und kein persistenter Gameplay-State.

## 13. Dirty-Koaleszierung

Viele kleine Änderungen in kurzer Zeit sollen zusammengefasst werden.

Wenn mehrere Units denselben Bereich nutzen, entsteht nicht für jede Bewegung sofort ein eigener vollständiger Re-Bake.

Stattdessen können dirty Bereiche:

- in Tiles/Chunks zusammengefasst,
- überlappend verschmolzen,
- bis zum nächsten Render-Update gesammelt werden.

Damit wird aus vielen Movement-Events eine kleine Zahl begrenzter Renderupdates.

## 14. Render-Cache

PathRenderer bzw. ein Render-Cache hält die gebackene visuelle Darstellung pro Kartenbereich.

Geeignete spätere Techniken können sein:

- OffscreenCanvas pro Chunk,
- RenderTexture,
- gecachte Bitmap,
- Tile-/Chunk-Texture,
- äquivalente Browser-/Engine-Technik.

Die konkrete Technologie wird bei Implementierung gewählt.

Verbindlich ist:

- Cache ist Darstellung,
- Cache darf jederzeit aus Wear-State neu erzeugt werden,
- Cache besitzt keine Gameplay-Ownership.

## 15. Re-Bake nur für Dirty Regions

Der Renderer darf nicht in jedem Renderframe den gesamten Path/Wear-State neu zeichnen.

Ziel:

`Dirty Region -> Re-Bake dieser Region -> Cache aktualisiert -> Dirty gelöscht`

Unveränderte Regionen werden aus dem bestehenden Cache gerendert.

Damit bleiben Renderkosten weitgehend von der historischen Anzahl einzelner Bewegungen entkoppelt.

## 16. Render-FPS und Re-Bake-Frequenz

Render-FPS und Path-Re-Bake-Frequenz sind getrennt.

Ein sichtbarer Frame darf vorhandene Cache-Inhalte jederzeit zeichnen.

Re-Bake erfolgt nur:

- wenn Region dirty ist,
- und nach einer geeigneten zeitlichen/arbeitsbezogenen Begrenzung.

Dadurch können viele Wear-Änderungen zwischen zwei Bake-Zeitpunkten gesammelt werden.

Die finale Frequenz wird nicht in S2D-03F festgelegt.

## 17. Priorisierung sichtbarer Bereiche

Falls die Karte später größer wird, darf der Renderer dirty Regionen priorisieren.

Beispielsweise:

- sichtbarer Viewport zuerst,
- nahe sichtbare Chunks danach,
- weit entfernte Dirty-Chunks später.

Der zugrunde liegende Wear-State ist davon unabhängig bereits korrekt.

Damit darf eine verzögerte Darstellung nie die Simulation beeinflussen.

## 18. Kein permanenter Sprite-/DOM-/Object-Pool pro Spur

Die Zielarchitektur erlaubt ausdrücklich nicht, jede einzelne historische Fußspur dauerhaft als eigenes Objekt zu behalten.

Einzelne Detailstempel dürfen kurzfristig innerhalb eines Bake-Vorgangs verwendet werden, werden danach aber Teil der gecachten Darstellung.

Langfristiger Speicherverbrauch soll ungefähr von:

- Karten-/Chunkgröße,
- Wear-State-Auflösung,
- Render-Cache-Größe

abhängen und nicht linear von der Gesamtzahl aller jemals gelaufenen Schritte.

## 19. SaveGame

Persistiert wird der fachliche Wear-Zustand, soweit er sichtbarer dauerhafter Weltzustand ist.

Nicht persistiert werden:

- Dirty-Flags,
- OffscreenCanvas,
- RenderTextures,
- Bitmaps,
- temporäre Brush-Stempel,
- Render-Queue,
- Bake-Timer.

Restore-Ablauf:

`Wear Snapshot -> PathSystem Restore -> alle benötigten Regionen initial dirty/rebuildable -> Render-Cache neu erzeugen`

Damit bleiben Trampelpfade nach Continue erhalten, ohne alte Renderobjekte serialisieren zu müssen.

## 20. Persistenzauflösung

SaveGame muss nicht zwingend jedes visuelle Detail speichern.

Persistiert wird nur die fachlich ausreichende Wear-Repräsentation.

Visuelles Noise/Footprint-Detail darf nach Restore neu gebacken werden, solange:

- Stärke,
- Lage,
- grobe Form,
- wirtschaftlich sichtbare Nutzung

konsistent bleiben.

Wenn deterministische visuelle Wiederherstellung später gewünscht wird, kann ein stabiler Seed genutzt werden; dies ist noch keine V1-Pflichtentscheidung.

## 21. Pause

Bei globaler Spielpause:

- entsteht kein neuer Wear aus Bewegung, weil Simulation stillsteht,
- Decay auf Simulationszeitbasis steht ebenfalls still,
- Renderer darf bestehende Caches weiterhin darstellen,
- rein visuelle Re-Bakes bereits dirty markierter Regionen dürfen technisch abgeschlossen werden, sofern sie keinen Gameplay-State verändern.

## 22. New Game / Continue

### New Game

- PathSystem startet aus definiertem leerem oder kartenbezogenem Initial-Wear-State,
- Render-Caches werden daraus neu aufgebaut.

### Continue

- gespeicherter Wear-State wird restauriert,
- keine historischen Einzelstempel werden rekonstruiert,
- Cache wird neu erzeugt,
- der Scheduler startet erst gemäß S2D-03D nach gültigem Gesamt-Restore.

## 23. Built Roads bleiben getrennt

Automatische Trampelpfade und später bewusst gebaute/aufgewertete Straßen bleiben fachlich getrennte Systeme.

Trampelpfad-Wear bedeutet:

- emergente sichtbare Nutzung,
- langsames Zuwachsen,
- kein bewusst platzierter Infrastrukturzustand.

Spätere Straßen dürfen gegebenenfalls Navigation, Geschwindigkeit oder Wirtschaft beeinflussen, werden aber nicht dadurch modelliert, dass ein hoher Wear-Wert einfach zur Straße umetikettiert wird.

## 24. Navigation und Wear

PathSystem und NavigationService bleiben getrennt.

Für den ersten Kern gilt:

- Navigation erzeugt Wege,
- Units bewegen sich tatsächlich,
- tatsächliche Bewegung erzeugt Wear.

Wear darf nicht rückwirkend Navigation beeinflussen, solange eine solche Mechanik nicht ausdrücklich später beschlossen wird.

Damit entsteht keine versteckte zweite Wegkostenlogik.

## 25. Gebäude- und Terrainbereiche

PathSystem darf nur auf Bereichen Wear erzeugen, auf denen Trampelpfade fachlich sinnvoll sichtbar sein können.

Beispiele für Ausschluss-/Maskierungsregeln können später sein:

- Wasser,
- Gebäudeflächen,
- nicht begehbares Terrain,
- bestimmte dekorative Oberflächen.

Die genaue Terrainmaske wird später technisch festgelegt.

Wichtig ist:

> Wear darf nicht blind über Gebäude oder andere logisch ausgeschlossene Flächen gebacken werden.

## 26. Edge Cases bei Gebäudeänderungen

Wenn ein Gebäude platziert oder abgerissen wird, kann bestehender Wear darunter bzw. in dessen Nähe weiter fachlich existieren oder maskiert werden.

Für V1 gilt:

- Gebäudeplatzierung darf den PathSystem-State nicht durch Renderer-Hacks zerstören,
- Darstellung darf über Footprint maskieren,
- Abriss darf darunterliegenden Wear wieder sichtbar machen, sofern dieser noch nicht durch Decay verschwunden ist.

Ob Platzierung Wear fachlich sofort löscht, reduziert oder nur verdeckt, bleibt eine spätere Detailentscheidung.

## 27. Dirty-Invalidierung bei Terrainänderungen

Wenn Terrain-/Maskeninformationen wechseln, müssen nur betroffene Path-Render-Regionen invalidiert werden.

Eine kleine lokale Weltänderung darf nicht automatisch den vollständigen Karten-Cache neu erzeugen.

## 28. Performance-Ziel

Die Architektur muss folgende historische Kostenklasse vermeiden:

`Anzahl gelaufener Schritte über gesamte Spielzeit -> Anzahl persistenter Stempel -> vollständiges Redraw`

Zielkostenklasse:

`aktuelle Wear-State-Größe + Anzahl aktuell geänderter Dirty-Regionen`

Damit soll eine lange laufende Siedlung nicht allein aufgrund historischer Bewegung immer teurer werden.

## 29. Memory-Ziel

Wear-State und Cache müssen bounded bzw. kartengebunden bleiben.

Nicht erlaubt ist ein unbegrenzt wachsendes Bewegungsprotokoll als Grundlage der Darstellung.

Optional kann PathSystem Diagnosezähler besitzen, etwa Gesamtbewegungsmenge; solche Zähler sind jedoch keine notwendige Renderquelle.

## 30. Inspector

Inspector darf Path/Wear nur über definierte Queries/Snapshots beobachten.

Sinnvolle Diagnosewerte:

- Anzahl aktiver Wear-Zellen/-Chunks,
- Wear-Min/Max/Verteilung,
- Anzahl Dirty-Regionen,
- Re-Bakes pro Zeitraum,
- Re-Bake-Dauer,
- Cache-Speichergröße,
- Decay-Arbeitsmenge,
- Movement-Wear-Events,
- vollständig regenerierte Regionen.

Kontrollierte Debug-Commands dürfen beispielsweise Wear visualisieren oder testweise setzen, aber nur über PathSystem-Commands und nicht durch direkte interne Array-Mutation.

## 31. Events

Mögliche fachliche/technische Events können später sein:

- WearRegionChanged,
- PathRegionDirty,
- PathRegionRebuilt,
- WearRegionDecayed.

Die finalen Eventnamen bleiben offen.

Wichtig ist:

- Gameplay-relevante Wear-Mutation ist abgeschlossen, bevor ein Event gesendet wird,
- Renderer reagiert auf Dirty-/Change-Signale,
- Eventhistorie wird nicht zum zweiten Wear-State.

## 32. Scheduler-Integration

S2D-03C bleibt verbindlich.

Path/Wear nutzt den zentralen Scheduler für:

- Movement-Meldungen innerhalb der Movement-Phase,
- Low-Frequency Decay,
- gegebenenfalls Budgetierung von Maintenance-Arbeit.

Renderer/Re-Bake bleibt außerhalb der autoritativen Gameplay-Simulation und darf Render-/Idle-Zeit verwenden, solange kein Gameplay-State verändert wird.

## 33. Kein PathOverlay als Gameplay-Owner

Ein historisches `PathOverlay` oder vergleichbarer Renderer darf langfristig keine Wear-Listen, Gameplay-Timer oder persistente Pfadwahrheit besitzen.

Migration:

`historische Stempel-/Overlay-Daten -> soweit sinnvoll einmalig in aggregierten Wear-State überführen -> PathSystem wird Owner -> Overlay wird reiner Renderer/Cache oder entfällt`

Die konkrete Migration wird erst in der Implementierungsroadmap festgelegt.

## 34. Fehlerverhalten

Ein Fehler im Render-Cache darf Gameplay nicht beschädigen.

Wenn ein Cache verloren geht oder fehlerhaft ist:

- Wear-State bleibt intakt,
- Region wird erneut dirty gesetzt,
- Darstellung wird neu erzeugt.

Umgekehrt darf ein sichtbarer Cache nicht dazu verwendet werden, verlorenen Gameplay-Wear als Wahrheit zurückzuschreiben.

## 35. Invarianten

1. PathSystem ist alleiniger Owner des Wear-State.
2. Wear entsteht nur aus tatsächlicher Unit-Bewegung.
3. Wiederholte Nutzung verstärkt aggregierten lokalen Wear statt permanente Einzelobjekte zu erzeugen.
4. Wear-State wächst nicht unbegrenzt mit der Zahl historischer Schritte.
5. Wear besitzt kontrollierte Sättigung.
6. Decay basiert auf Simulationszeit und erzeugt kein eigenes Feature-Interval.
7. Kein Full-Map-Wear-Scan pro GameTick.
8. Wear-Mutation markiert nur betroffene Regionen dirty.
9. Dirty-Regionen dürfen koalesziert werden.
10. Render-Cache besitzt keine Gameplay-Ownership.
11. Unveränderte Regionen werden nicht ständig neu gebacken.
12. Render-FPS ist unabhängig von Wear-Re-Bake-Frequenz.
13. SaveGame persistiert Wear, nicht Render-Caches oder Einzelstempel.
14. Continue rekonstruiert Cache aus Wear-State.
15. PathSystem und NavigationService bleiben getrennt.
16. Trampelpfade und spätere gebaute Straßen bleiben getrennte Systeme.
17. Rendererfehler dürfen den Wear-State nicht verändern.
18. Historische Bewegung darf die Runtimekosten nicht unbegrenzt wachsen lassen.

## 36. Bewusst offen

S2D-03F legt noch nicht fest:

- genaue Wear-Rastergröße,
- Chunkgröße,
- Brush-Radius,
- Zuwachs pro Bewegung,
- unterschiedliche Unit-Gewichte,
- Decay-Rate,
- Re-Bake-Frequenz,
- maximale Bake-Arbeit pro Frame,
- konkrete Canvas-/GPU-Technik,
- finale Pfadtexturen,
- exakte Terrainmasken,
- Verhalten von Wear unter neu gebauten Gebäuden,
- spätere Interaktion mit ausgebauten Straßen.

Diese Punkte werden erst bei Implementierung und Content-/Balance-Arbeit konkretisiert.

## 37. S2D-03F Abschluss

S2D-03F ist fachlich abgeschlossen, wenn:

- Wear-Ownership eindeutig ist,
- reale Bewegung als einzige Wear-Quelle definiert ist,
- räumliche Aggregation statt Einzelstempel festgelegt ist,
- Decay zentral getaktet ist,
- Dirty-Regionen und Render-Cache getrennt sind,
- Save/Continue den Wear-State konsistent erhält,
- Navigation/Rendering keine zweite Pfadwahrheit besitzen,
- historische unbegrenzt wachsende Stempelarchitektur ausdrücklich ausgeschlossen ist.

Ergebnis:

**S2D-03F – COMPLETE / 0 BLOCKER**
