# S2D-04 – UI / MOBILE UX

Status: **V0.1 FROZEN – PASS / 0 BLOCKER**  
Datum: 2026-09-02  
Repository: `DrHoschi/siedler-mini`  
Arbeitsbranch: `feature/s2d-04-ui-mobile-ux`  
Verbindliche Basis: `S2D-00 PROJECT MASTER V0.1 FROZEN` + `S2D-01 GAME DESIGN V0.1 FROZEN` + `S2D-02 UNIT & WORKFORCE MODEL V0.1 FROZEN` + `S2D-03 TECHNICAL ARCHITECTURE V0.1 FROZEN`  
Freeze-Gate: `S2D-04F – Internal Consistency & UI/UX Freeze Gate – PASS / 0 BLOCKER`

## 1. Zweck

Dieses Dokument ist die verbindliche UI-/Mobile-UX-Spezifikation für den ersten vollständigen Wirtschaftskern.

Es konsolidiert:

- S2D-04A – Screen Structure, HUD & Primary Mobile Interaction Model,
- S2D-04B – Building Selection, Context Panels & Economy Feedback Model,
- S2D-04C – Build Catalog, Placement & Work-Area Editing UX,
- S2D-04D – Resource Overview, Economy Summary & Settlement Status UX,
- S2D-04E – Main Menu, New/Continue, Save, Help & Guidance Entry UX,
- S2D-04F – Internal Consistency & UI/UX Freeze Gate.

Finale Pixelmaße, Farben, Fonts, konkrete Icons, CSS/HTML, Animationen und Implementierungsdetails sind bewusst nicht eingefroren.

## 2. Zentrale UX-Regeln

> **Smartphone ist eine vollwertige Zielplattform und bestimmt die Mindestanforderungen an Lesbarkeit, Touch-Bedienbarkeit und Informationsdichte.**

> **Die Welt bleibt der primäre Ort des Spielens und Verstehens; UI verdichtet und erklärt die reale Simulation, ersetzt sie aber nicht.**

> **Die UI besitzt keine zweite Gameplay-Wahrheit.**

Daraus folgen:

- Touch-first statt Desktop-UI auf kleinem Bildschirm,
- kompakter permanenter HUD,
- progressive Details über Context Panels und Übersichten,
- direkte sichtbare Rückmeldung in der Welt,
- eindeutige Werkzeugmodi,
- keine versteckten irreversiblen Touch-Aktionen,
- keine Entwickler-/Debugdaten in der Spieleroberfläche,
- keine operative Einzel-Unit-Mikrosteuerung als Kernbedienung.

## 3. Screen-Struktur

Der normale Spielscreen besteht aus fünf logischen Ebenen:

1. Welt / Spielfeld,
2. permanenter kompakter HUD,
3. Kontext-/Auswahlpanel,
4. temporärer Modus-/Werkzeugbereich,
5. Guidance-/Hinweisebene.

Die Welt zeigt Gelände, Gebäude/Baustellen, Personen, Tiere, Rohstoffquellen, sichtbare Waren, reale Transporte, Trampelpfade, Auswahlmarkierungen, Platzierungsvorschauen und sparsame relevante Statussymbole.

## 4. Permanenter HUD

NOW dauerhaft sichtbar:

- Holz,
- Stein,
- Gold,
- Bevölkerung,
- Bauen,
- Systemmenü.

Fisch, Fleisch und Fell bleiben schnell erreichbar, müssen auf Smartphone aber nicht dauerhaft Platz belegen.

Gold ist Wirtschaftswert, keine physische Ware. Bevölkerung ist aus realen Bewohnern abgeleitet und kein Resource-Pool.

## 5. Informationshierarchie

### Ebene 1 – permanent

Orientierung: Holz, Stein, Gold, Bevölkerung, Bauen, Menü.

### Ebene 2 – Weltfeedback

Sichtbare Waren, Transporte, Personen/Tiere, Baustellenzustand, Pfade und wenige wichtige Statussymbole.

### Ebene 3 – Auswahlkontext

Gebäudestatus, lokale Ware, Produktion, Bedarf, Bewohner, Arbeitsbereich, Baufortschritt und direkte passende Aktionen.

### Ebene 4 – Wirtschafts-/Siedlungsübersicht

Vollständige Warenverteilung, Bevölkerung/Wohnraum, Produktions-/Logistiklage und priorisierte siedlungsweite Engpässe.

## 6. Primäre UI-Zustände

Mindestens:

- NORMAL / OBSERVE,
- OBJECT SELECTED,
- BUILD CATALOG,
- BUILD PLACEMENT,
- WORK AREA EDIT,
- CONFIRMATION,
- ECONOMY OVERVIEW,
- SYSTEM MENU,
- GUIDANCE FOCUS.

Diese Zustände sind UI-Zustände und keine Gameplay-Owner.

## 7. Kamera und Auswahl

Smartphone:

- Ein-Finger-Drag auf freier Welt: Kamera pannt,
- Zwei-Finger-Pinch: Zoom,
- kurzer Tap: Objekt auswählen,
- Tap und Drag werden durch Gesture-Schwelle getrennt,
- Tap auf freie Welt kann Auswahl schließen,
- aktive Werkzeugmodi müssen klar anzeigen, wie ein Touch interpretiert wird.

Keine Kernaktion darf ausschließlich Hover, Rechtsklick oder Tastatur benötigen.

## 8. Context Panel – Grundmodell

Ein ausgewähltes Gebäude beantwortet schnell:

1. Was ist das?
2. Was macht es gerade?
3. Wenn es nicht arbeitet: warum?
4. Was kann der Spieler sinnvoll tun?

Smartphone-Panel konzeptionell:

- PEEK – Name, Hauptstatus, wichtigste Kennzahl/Aktion,
- STANDARD – normale relevante Informationen/Aktionen,
- EXPANDED – Details.

Das Panel ist minimierbar/schließbar und darf keine unsichtbare Touchfläche zurücklassen.

## 9. Status- und Engpasspriorität

Ein Objekt zeigt einen klaren Hauptstatus statt einer ungeordneten Liste.

Priorität:

1. kritischer/ungültiger spielerisch relevanter Zustand,
2. bewusster Spielerzustand wie `Pausiert`,
3. blockierende Voraussetzung,
4. aktiver Übergang wie `Arbeiter unterwegs`,
5. normaler aktiver Betrieb,
6. neutrales Warten.

Engpassdarstellung nach Möglichkeit:

- Was ist los?
- Warum?
- Was kann der Spieler sinnvoll beeinflussen?

Normales Warten ist kein Fehler.

## 10. Rathaus / HQ

Das Rathaus zeigt als Hauptlager mindestens:

- Holz,
- Stein,
- Fisch,
- Fleisch,
- Fell,
- Gold separat,
- Bevölkerung separat/abgeleitet.

Physische Waren gelten erst als zentral verfügbar, nachdem sie real geliefert wurden.

`Unterwegs` bleibt getrennt von `Verfügbar`.

Das HQ erhält im ersten Kern keine unnötige Lager-Mikrosteuerung.

## 11. Wohnhäuser

Kleines und mittleres Wohnhaus zeigen reale Bewohner und tatsächliche Belegung.

Baseline:

- kleines Wohnhaus: 2 Bewohner,
- mittleres Wohnhaus: 3 Bewohner.

Das Panel kann kompakt freie/arbeitende/unterwegs befindliche Bewohner und den Gold-/Steuerbeitrag zeigen.

Temporäre Hilfsarbeit verändert die dargestellte Bewohneridentität nicht. Spezialisierung und aktuelle Aufgabe bleiben getrennt.

Keine manuelle Einzelzuweisung von Bewohnern zu Transportjobs.

## 12. Produktionsgebäude

Holzfäller, Steinbruch, Fischer und Jäger zeigen:

- aktiv/pausiert,
- arbeitet/wartet/Worker unterwegs,
- primären Wartegrund,
- lokale fertige Ware,
- Transportstatus,
- Arbeitsbereich.

Lokale Outputs:

- Holzfäller -> Holz,
- Steinbruch -> Stein,
- Fischer -> Fisch,
- Jäger -> Fleisch + Fell getrennt.

Pause verhindert neue Produktionsarbeit. Bereits fertige lokale Ware bleibt sichtbar und transportierbar.

Primäre Aktionen:

- Pause/Fortsetzen,
- Arbeitsbereich anzeigen/ändern.

Abriss ist sekundär/destruktiv und benötigt Bestätigung.

## 13. Baustellen

Baustellen zeigen:

- entstehendes Gebäude,
- Materialstatus,
- Builderstatus,
- Baufortschritt erst in der tatsächlichen Bauphase.

Verbindlich:

`Restbedarf = Soll - geliefert - gültig reserviert/unterwegs`

Solange Material fehlt, ist `Wartet auf Material` bzw. `Material unterwegs` der relevante Zustand.

Erst nach vollständiger physischer Lieferung:

`Material vollständig -> wartet auf Bauarbeiter -> Bauarbeiter unterwegs -> reale Ankunft -> Im Bau`

Baufortschritt darf erst angezeigt werden, wenn ConstructionSystem die Builder-Ankunft und BUILDING-Phase bestätigt.

Keine manuelle Carrier-/Builder-Zuweisung im Kern.

## 14. Warenbegriffe in der UI

### Verfügbar

Physische Ware liegt im zentral nutzbaren HQ-/Lagerbestand.

### Lokal

Ware liegt physisch im Produktionsbestand oder bereits an einer Baustelle.

### Reserviert

Ware ist einem Bedarf zugeordnet, bleibt aber an ihrem aktuellen physischen Ort.

### Unterwegs

Ware wird physisch von einer Unit getragen.

> **Reservation oder Transport dürfen niemals als zusätzliche Warenmenge gezählt werden.**

Weltstapel und UI lesen dieselbe Owner-Wahrheit.

## 15. Baukatalog

Der Baukatalog ist auf Smartphone ein temporäres kompaktes Panel/Bottom Sheet.

Er zeigt pro Gebäudekarte:

- Sprite/Icon,
- Name,
- kurze Funktion,
- Baukosten,
- Verfügbarkeit.

NOW sinnvolle Kategorien:

- Wohnen – kleines/mittleres Wohnhaus,
- Produktion – Holzfäller, Steinbruch, Fischer, Jäger.

Das Rathaus ist Startgebäude und wird nicht als regulär erneut baubares Kerngebäude vorausgesetzt.

Gebäudezustände im Katalog können sein:

- AVAILABLE,
- INSUFFICIENT_RESOURCES,
- LOCKED,
- nicht anwendbar/ausgeblendet.

Ressourcenmangel lässt das Gebäude verständlich sichtbar; fehlende Kosten werden markiert.

## 16. Gebäudeplatzierung

Verbindlicher Ablauf:

`Bauen -> Gebäude wählen -> reine Vorschau -> Positionieren -> fachlich validieren -> ausdrücklich bestätigen -> Owner akzeptiert -> Baustelle`

Vor Bestätigung:

- keine Baustelle,
- kein Ressourcenverbrauch,
- keine Reservation,
- kein produktiver Building-State.

Vorschau zeigt Footprint, Position, VALID/INVALID und soweit relevant Zugang/Entrance.

Spielerische Ablehnungsgründe können sein:

- Platz belegt,
- außerhalb Karte,
- Gelände ungeeignet,
- Zugang blockiert,
- nicht erreichbar,
- Ressourcen fehlen.

Die UI ist nicht Owner der Platzierungsvalidierung. Finale Bestätigung validiert erneut.

Kamerapan/Zoom bleiben im Placement-Modus möglich und bestätigen niemals versehentlich die Platzierung.

Standardmäßig endet der Modus nach einer erfolgreichen Platzierung; Serienbau müsste später explizit aktiviert werden.

## 17. Arbeitsbereich-Editor

Betroffen:

- Holzfäller,
- Steinbruch,
- Fischer,
- Jäger.

Ablauf:

`Gebäude -> Arbeitsbereich anzeigen/ändern -> WORK AREA EDIT -> Vorschau -> validieren -> bestätigen oder abbrechen`

Bis zur Bestätigung bleibt die autoritative WorkArea unverändert.

Der erste Kern verwendet eine einfache Zone/Radius-/Flächenlogik statt komplexem Polygoneditor.

Konzeptionelle Validierungszustände:

- VALID,
- VALID_BUT_EMPTY – Bereich ist erlaubt, enthält aktuell aber kein geeignetes Ziel,
- INVALID.

`VALID_BUT_EMPTY` ist kein technischer Fehler.

Abbrechen verändert nichts. Änderung eines Arbeitsbereichs hebt eine Gebäude-Pause nicht automatisch auf.

## 18. Wirtschafts-/Ressourcenübersicht

Die Übersicht beantwortet schnell:

- was zentral verfügbar ist,
- was lokal liegt,
- was unterwegs ist,
- wo Ware fehlt/staut,
- wie viele Bewohner/Wohnplätze existieren,
- wie Produktion/Logistik stehen,
- welcher Engpass aktuell wichtig ist.

Vier Bereiche:

1. Ressourcen & Waren,
2. Bevölkerung & Wohnraum,
3. Produktion & Logistik,
4. Siedlungsstatus & Engpässe.

Sie ist kein komplexes Management-Dashboard.

## 19. Ressourcenübersicht

Physische Kernwaren:

- Holz,
- Stein,
- Fisch,
- Fleisch,
- Fell.

Pro Ware mindestens:

- verfügbar,
- lokal,
- unterwegs.

Reserviert kann ergänzend gezeigt werden, bleibt aber eine Zuordnung und keine zusätzliche Menge.

Eine Gesamtsumme darf nicht suggerieren, dass lokale/unterwegs befindliche Ware sofort im HQ nutzbar ist.

Tap auf eine Ware darf Quellen/Ziele/auffällige Staus zeigen und zur Welt navigieren.

## 20. Bevölkerung und Wohnraum

Bevölkerung wird aus realen Bewohnern abgeleitet.

Übersicht mindestens:

- Gesamtbevölkerung,
- vorhandene Wohnplätze,
- belegte Wohnplätze,
- freie Wohnplätze.

Optional kompakt:

- freie Personen,
- beschäftigte Personen,
- Personen mit aktiver Aufgabe,
- grobe Spezialistenlage.

Keine internen Assignment- oder Joblisten.

## 21. Produktion und Logistik – Übersicht

Pro Produktionsgebäudetyp sinnvoll:

- Anzahl insgesamt,
- arbeitet,
- pausiert,
- wartet/blockiert,
- lokaler Output.

Logistik kompakt:

- Waren unterwegs,
- Waren warten auf Abholung,
- Baustellenmaterial unterwegs,
- auffällige Transportstaus.

Keine A*-Calls, Cache-Hits, JobEngine-Queues oder Reservation-IDs.

## 22. Baustellen- und Siedlungsstatus

Siedlungsweite Baustellenlage kann zeigen:

- aktive Baustellen,
- wartet auf Material,
- Material komplett / wartet auf Builder,
- Builder unterwegs,
- im Bau.

Engpässe werden nach Wirkung priorisiert, z. B.:

1. blockiert Expansion/Bau,
2. blockiert mehrere Produktionsketten,
3. personeller Engpass,
4. logistischer Stau,
5. lokaler Einzelengpass.

Normale Übergänge werden nicht rot/problematisch dargestellt.

Ein Engpass kann `In Welt anzeigen` anbieten; danach übernimmt das normale Context Panel.

## 23. Kein Management-Dashboard

NOW ausdrücklich nicht vorgesehen:

- frei konfigurierbare Diagramme,
- historische Produktionskurven,
- Sankey-/Flow-Diagramme,
- Tabellen aller Units,
- manuelle Job-Repriorisierung,
- globale Carrier-Routenplanung,
- technische Performance-Metriken.

## 24. Startbildschirm

Minimale Hauptstruktur:

1. Weiterspielen,
2. Neues Spiel,
3. Hilfe,
4. Einstellungen.

Bei gültigem Save ist `Weiterspielen` bevorzugte Hauptaktion. Ohne gültigen Save ist `Neues Spiel` primär.

Ein ungültiger Save wird verständlich gemeldet und startet niemals stillschweigend ein neues Spiel.

## 25. New Game und Continue

> **Neues Spiel und Weiterspielen sind fachlich und visuell getrennte Lifecycle-Pfade.**

New Game:

`Neues Spiel -> ggf. Kartenauswahl -> bestätigen -> New-Game-Initialisierung -> Spielwelt`

Ein vorhandener Save darf nicht ohne ausdrückliche Bestätigung überschrieben werden.

Continue:

`Weiterspielen -> Save validieren/migrieren -> Owner restore -> Runtime rekonstruieren -> Gesamtvalidation -> Scheduler starten -> Spielwelt`

Nicht zulässig:

`New Game Defaults -> Save darüberlegen`.

Während Restore gibt es keine Gameplay-Eingabe. Die Welt gilt erst nach erfolgreichem Restore-Gate als spielbereit.

## 26. Speichern

Systemmenü bietet `Speichern`.

Spielerfeedback:

- `Speichern…`,
- `Spiel gespeichert`,
- `Speichern fehlgeschlagen`.

Autosave darf zusätzlich existieren, ersetzt aber nicht zwingend manuelles Speichern.

Die UI behauptet keinen Erfolg ohne Bestätigung des SaveGameService und baut keine eigenen Gameplay-Zustände in den Save ein.

## 27. Ingame-Systemmenü

NOW:

- Zurück zum Spiel,
- Speichern,
- Hilfe,
- Einstellungen,
- Einführung neu starten,
- Zum Hauptmenü.

> **Das Öffnen des Systemmenüs pausiert im ersten Kern die autoritative Simulation.**

Pause erfolgt über den zentralen Simulationsmechanismus, nicht über einen UI-eigenen Timer.

Destruktive/Session-Aktionen sind von häufigen harmlosen Aktionen getrennt.

## 28. Hilfe und Guidance

Hilfe ist jederzeit frei aufrufbare Spielerinformation.

Sie erklärt mindestens:

- Kamera/Zoom,
- Auswahl,
- Bauen,
- Produktion/Pause,
- lokale Waren/Transport,
- Baustellenmaterial/Builder,
- Bewohner/Wohnhäuser,
- Arbeitsbereiche,
- Wirtschaftsübersicht,
- Save/Continue.

Guidance ist kontextbezogen und besitzt Fortschritt.

Zentrale Regel:

> **Kontext zeigen, kurz erklären, Spieler die echte Handlung selbst ausführen lassen.**

## 29. Guidance-State und Trigger

Guidance besitzt stabile IDs und mindestens:

- UNSEEN,
- SHOWN,
- COMPLETED.

Optional später DISMISSED.

Trigger basieren auf öffentlichen Gameplay-Fakten/Events, z. B. Gebäude platziert, Ware produziert/geliefert, Materialien vollständig, Builder angekommen, Gebäude pausiert.

Guidance darf UI/Welt hervorheben und erklären, aber niemals:

- Waren teleportieren,
- Ressourcen erzeugen,
- Worker/Builder direkt zuweisen,
- Baustellen künstlich fertigstellen,
- Produktionsregeln umgehen.

## 30. Guidance-Themen

Für den Kern mindestens sinnvoll:

1. Kamera/Zoom,
2. Rathaus/HUD,
3. erstes Wohnhaus,
4. Bewohner,
5. erstes Produktionsgebäude,
6. Arbeitsbereich,
7. lokale Produktion,
8. physischer Transport zum Rathaus,
9. Baustellenmaterial,
10. Builder muss real ankommen,
11. Pause/Fortsetzen,
12. Wirtschaftsübersicht,
13. Speichern/Weiterspielen.

Abgeschlossene Hinweise sollen ruhig bleiben.

`Einführung neu starten` setzt nur Guidance-Fortschritt zurück, nicht Gameplay-State.

Ein neues Spiel muss den Guidance-Fortschritt nicht automatisch löschen. Continue stellt persistierten Guidance-State konsistent wieder her und darf Restore-Events nicht als doppelte Tutorialausführung behandeln.

## 31. Smartphone, Tablet und Desktop

Smartphone bleibt Referenz:

- Welt maximal sichtbar,
- kompakter HUD,
- Bottom Sheets/Drawer,
- keine Fensterketten,
- großzügige Touchziele,
- Safe Areas berücksichtigen,
- horizontales Scrollen für Kerninformation möglichst vermeiden.

Tablet/Desktop dürfen mehr Information gleichzeitig zeigen, aber keine andere Gameplay-Logik verwenden.

Desktop darf Hover-Zusatzinfos und Hotkeys ergänzen.

## 32. UI-Ownership und Runtime-Verträge

S2D-03 bleibt bindend.

Ziel:

`UI -> Query/Read Model -> Anzeige`

`UI -> Command -> Owner validiert/mutiert -> Event -> UI aktualisiert`

Nicht zulässig:

- UI mutiert Building-/Unit-/Stock-/Construction-State direkt,
- UI führt zweite Waren-/Population-/Assignment-Wahrheit,
- UI startet eigene Gameplay-Timer,
- UI repariert Runtime-Inkonsistenzen,
- UI simuliert fachliche Gültigkeit als alleinige Wahrheit.

UI-Refresh ist keine Simulationszeit.

## 33. Save/Continue und UI-State

Persistiert werden fachliche Owner-Zustände und Guidance-State gemäß ihrer Ownership.

Reine Vorschauen und temporäre UI-Modi wie BUILD PLACEMENT oder WORK AREA EDIT sind kein Gameplay-Save-State.

Nach Continue liest UI die wiederhergestellten Owner neu ein. Alte View-Caches dürfen keine zweite Wahrheit behalten.

## 34. Fehlerprävention

Verbindlich:

- Touch auf Karte platziert nicht irreversibel ohne Bestätigung,
- Abbruch verbraucht nichts,
- Abriss benötigt Bestätigung,
- Neues Spiel überschreibt Save nicht ohne Bestätigung,
- ungültiger Save wird nicht zu New Game umgedeutet,
- Hilfe verändert Gameplay nicht,
- Tutorial-Neustart ist nicht Neues Spiel,
- technische Fehler werden nicht als normale Economy-Engpässe schöngeredet,
- UI repariert technische Inkonsistenzen nicht selbst.

## 35. Bewusst nicht im S2D-04-Freeze festgelegt

Kein zusätzlicher S2D-04-Teilblock ist erforderlich für:

- exakte Pixel-/dp-Maße,
- konkrete Farben/Fonts,
- finale Icon-Bibliothek,
- konkrete Bottom-Sheet-Snapwerte,
- endgültige Portrait-/Landscape-Detailentscheidung,
- Desktop-Hotkeys,
- konkrete Animationen,
- Accessibility-Feindetails,
- Inspector-UI,
- spätere komplexe Managementansichten.

Diese Punkte ändern die eingefrorene Bedien- und Informationsarchitektur nicht und können in Implementierungs-/Design-System-Blöcken konkretisiert werden.

Unit-, Tier- und Weltressourcen-Auswahl bleibt im ersten Wirtschaftskern primär beobachtend. Es ist kein zusätzlicher UI-Systemblock nötig, solange daraus keine neue Spieler-Mikrosteuerung entsteht; konkrete kleine Beobachtungs-Panels können aus dem gemeinsamen Selection-/Context-Pattern abgeleitet werden.

## 36. S2D-04F – Internal Consistency & UI/UX Freeze Gate

Geprüft gegen S2D-00/01/02/03:

| Prüfung | Ergebnis |
|---|---|
| Smartphone als Vollziel | PASS |
| Welt als primärer Spiel-/Feedbackraum | PASS |
| Wirtschaft ohne Inspector lesbar | PASS |
| physische Warenorte / keine Doppelzählung | PASS |
| Gold getrennt von physischen Waren | PASS |
| Population aus realen Bewohnern | PASS |
| Resident-Identität bleibt bei Hilfsarbeit erhalten | PASS |
| keine operative Unit-Mikrosteuerung | PASS |
| Production -> local stock -> real transport -> HQ | PASS |
| Pause lässt fertige lokale Ware transportierbar | PASS |
| Construction Material -> Builder arrival -> Build | PASS |
| keine Überlieferung als normaler UI-Workflow | PASS |
| WorkArea bleibt Owner-State, UI nur Editor/Preview | PASS |
| New Game / Continue strikt getrennt | PASS |
| Restore-Gate vor spielbarer Welt | PASS |
| Guidance getrennt von Gameplay-Ownership | PASS |
| UI mutiert nur über Commands/Owner-Verträge | PASS |
| UI-Refresh getrennt von Simulation | PASS |
| technische Fehler nicht durch UI repariert | PASS |
| Inspector/Diagnostics getrennt von Spieler-UI | PASS |
| offene Punkte nur Implementierungs-/Design-Details | PASS |
| fehlender vorgesehener UI/Mobile-UX-Kernblock | 0 |
| offene Freeze-Blocker | 0 |
| Gameplay-/Runtime-Codeänderungen in S2D-04 | 0 |

Ergebnis:

- S2D-04A – COMPLETE
- S2D-04B – COMPLETE
- S2D-04C – COMPLETE
- S2D-04D – COMPLETE
- S2D-04E – COMPLETE
- S2D-04F – **PASS / 0 BLOCKER**

## 37. Freeze

**S2D-04 – UI / MOBILE UX V0.1 ist FROZEN – PASS / 0 BLOCKER.**

Ab diesem Stand werden Änderungen an den eingefrorenen UI-/UX-Grundregeln nur über `S2D-07 – Decision & Change Log` bzw. eine ausdrücklich freigegebene spätere Revision vorgenommen.

Die temporären Teilblockdokumente S2D-04C/D/E werden nach dieser Konsolidierung entfernt. `docs/S2D-04_UI_MOBILE_UX.md` bleibt die dauerhafte S2D-04-Referenz.

Es wurde keine UI- oder Gameplay-Implementierung begonnen.