# S2D-04 – UI / MOBILE UX

Status: **V0.1 DRAFT – S2D-04A COMPLETE**  
Datum: 2026-09-02  
Repository: `DrHoschi/siedler-mini`  
Arbeitsbranch: `feature/s2d-04-ui-mobile-ux`  
Verbindliche Basis: `S2D-00 PROJECT MASTER V0.1 FROZEN` + `S2D-01 GAME DESIGN V0.1 FROZEN` + `S2D-02 UNIT & WORKFORCE MODEL V0.1 FROZEN` + `S2D-03 TECHNICAL ARCHITECTURE V0.1 FROZEN`

## 1. Zweck

S2D-04 definiert die verbindliche Zielstruktur der Spieleroberfläche und der mobilen Bedienung.

S2D-04A legt ausschließlich fest:

- welche primären Ansichten und Oberflächenbereiche das Spiel besitzt,
- welche Informationen dauerhaft oder kontextabhängig sichtbar sind,
- wie Kamera, Auswahl und Bauen auf Smartphone grundsätzlich bedient werden,
- wie Touch-Konflikte vermieden werden,
- welche wirtschaftlichen Zustände ohne Entwickler-Inspector verständlich sein müssen,
- wie dieselbe Gameplay-Logik auf Smartphone, Tablet und Desktop bedient wird.

Nicht festgelegt werden in S2D-04A:

- finale Pixelmaße,
- konkrete Farben, Fonts oder Grafiken,
- endgültige Icons,
- Animationstiming,
- konkrete CSS-/HTML-Struktur,
- Desktop-Hotkeys,
- Detailaufbau aller Untermenüs,
- Tutorialtexte,
- Inspector-UI,
- Implementierung.

## 2. Zentrale UX-Regel

> **Smartphone ist eine vollwertige Zielplattform und bestimmt die Mindestanforderungen an Lesbarkeit, Touch-Bedienbarkeit und Informationsdichte.**

Tablet und Desktop dürfen mehr Fläche nutzen und zusätzliche Komfortdarstellung anbieten, aber keine andere Gameplay-Logik voraussetzen.

Die Oberfläche soll das Spiel unterstützen, nicht die Siedlung verdecken.

Daraus folgt:

- wenige dauerhaft sichtbare Elemente,
- große und eindeutige Touch-Ziele,
- kontextabhängige Detailflächen statt vieler permanenter Fenster,
- direkte Rückmeldung in der Welt,
- progressive Informationsdichte,
- keine Entwicklerdaten im normalen Spieler-HUD.

## 3. Primäre Screen-Struktur

Der normale Spielscreen besteht aus fünf logischen Ebenen.

### 3.1 Welt / Spielfeld

Die Welt ist die dominante Fläche und bleibt möglichst groß sichtbar.

Sie enthält unter anderem:

- Gelände,
- Gebäude und Baustellen,
- Personen/Units,
- Tiere,
- Rohstoffquellen,
- sichtbare lokale Waren,
- Transportbewegungen,
- Trampelpfade/Wear,
- Auswahlmarkierungen,
- Platzierungsvorschau,
- relevante Statussymbole direkt an Objekten.

Die Welt ist keine bloße Hintergrundfläche. Ein wesentlicher Teil des Economy-Feedbacks muss dort direkt erkennbar sein.

### 3.2 Permanenter kompakter HUD-Bereich

Der permanente HUD zeigt nur Informationen, die der Spieler häufig zur Orientierung benötigt.

NOW vorgesehen:

- zentrale verfügbare Bau-/Lagerwaren des aktuellen Wirtschaftskerns: Holz und Stein,
- Gold,
- Bevölkerung,
- Zugang zum Hauptmenü/Systemmenü,
- Zugang zum Bauen.

Fish, Meat und Pelt gehören zum Wirtschaftssystem, müssen aber nicht zwingend alle dauerhaft im knappen Smartphone-HUD stehen. Sie müssen über Wirtschafts-/Lageransichten schnell erreichbar sein.

Grundregel:

> **Dauerhaft sichtbar ist die Orientierungsebene; Detailbestände erscheinen bei Bedarf.**

Der HUD darf nicht so breit oder hoch werden, dass auf kleinen Displays die eigentliche Siedlung zur Restfläche wird.

### 3.3 Kontextbereich / Auswahlpanel

Wählt der Spieler ein Gebäude, eine Baustelle oder ein anderes relevantes Objekt, erscheint ein kontextabhängiger Informations- und Aktionsbereich.

Er zeigt nur Informationen und Aktionen für das ausgewählte Objekt.

Beispiele:

- Gebäudename/Typ,
- aktueller Status,
- Produktion aktiv/pausiert,
- lokale Waren,
- fehlende Eingangsbedingungen,
- Baustellenbedarf und bereits gelieferte Waren,
- Warten auf Bauarbeiter / Bauarbeiter unterwegs / Baufortschritt,
- Bewohnerzahl bei Häusern,
- Arbeitsbereich bei entsprechenden Produktionsgebäuden,
- einfache Aktionen wie Pause/Fortsetzen, Arbeitsbereich ändern oder Abreißen.

Auf Smartphone soll dieser Bereich bevorzugt als kompakte Bottom-Sheet-/Panel-Logik funktionieren und nicht als frei schwebendes Desktopfenster.

Er muss minimierbar/schließbar sein und darf die Welt nicht unnötig dauerhaft verdecken.

### 3.4 Modus-/Werkzeugbereich

Bestimmte Aktionen versetzen die Oberfläche vorübergehend in einen klar erkennbaren Modus, beispielsweise:

- Gebäude platzieren,
- Arbeitsbereich festlegen,
- später gegebenenfalls Straßenbau,
- Abreißen bestätigen.

Ein aktiver Modus muss sichtbar sein und einen eindeutigen Abbruchweg besitzen.

### 3.5 Temporäre Hinweise / Guidance

Kontextuelle Hinweise, Tutorial-Hinweise, kurze Warnungen und Bestätigungen liegen über der normalen Oberfläche, ohne eine zweite dauerhafte HUD-Schicht zu bilden.

Sie werden nur bei Bedarf eingeblendet und verschwinden wieder.

Guidance bleibt gemäß S2D-00/S2D-03 ein eigenes System und mutiert keinen Gameplay-State direkt.

## 4. Hauptzustände des Spielscreens

Die Oberfläche unterscheidet mindestens folgende primäre Interaktionszustände:

1. **NORMAL / OBSERVE** – Siedlung ansehen und Kamera bewegen.
2. **OBJECT SELECTED** – ein Weltobjekt ist ausgewählt und sein Kontext sichtbar.
3. **BUILD CATALOG** – Gebäudeauswahl geöffnet.
4. **BUILD PLACEMENT** – gewähltes Gebäude wird positioniert.
5. **WORK AREA EDIT** – Arbeitsbereich eines geeigneten Gebäudes wird festgelegt/geändert.
6. **CONFIRMATION** – destruktive oder relevante Aktion benötigt Bestätigung.
7. **SYSTEM MENU** – Speichern, Einstellungen, Hilfe usw.
8. **GUIDANCE FOCUS** – ein Tutorial-/Hinweiszustand lenkt auf eine Aktion, ohne die normale Runtime-Ownership zu umgehen.

Diese Zustände dürfen technisch nicht als neue Gameplay-Owner verstanden werden. Sie beschreiben UI-Interaktion.

## 5. Kamera auf Smartphone

### 5.1 Pan

Die Karte wird durch Ziehen auf einer freien Weltfläche verschoben.

Ein Drag ist Kamerabewegung und darf nicht versehentlich ein Gebäude platzieren oder eine Objektaktion auslösen.

### 5.2 Zoom

Pinch mit zwei Fingern steuert den Zoom.

Zoom ist unabhängig von der Simulation und darf keine Gameplay-Auswirkung besitzen.

### 5.3 Auswahl

Ein kurzer Tap auf ein auswählbares Weltobjekt selektiert dieses.

Tap und Drag müssen durch eine kleine Bewegungs-/Gesture-Schwelle voneinander unterschieden werden, damit Kamerabewegung nicht ständig Objekte auswählt.

### 5.4 Leere Weltfläche

Ein Tap auf eine freie Weltfläche kann eine bestehende Auswahl schließen, sofern kein aktiver Werkzeugmodus diesen Tap benötigt.

### 5.5 Kein permanentes Ein-Finger-Kamera-/Werkzeug-Doppelverhalten

Während eines aktiven Platzierungs- oder Editiermodus muss eindeutig sein, welche Geste Kamera und welche Geste Werkzeug bedeutet.

Die UI darf nicht verlangen, dass derselbe unmarkierte Tap gleichzeitig als Auswahl, Platzierung und Kamerabedienung interpretiert wird.

## 6. Primärer Bauablauf auf Smartphone

Der verbindliche Interaktionsfluss lautet konzeptionell:

`Bauen öffnen -> Kategorie/Gebäude wählen -> Katalog reduziert/schließt -> Platzierungsvorschau erscheint -> Position prüfen/verschieben -> gültig/ungültig sichtbar -> Platzierung ausdrücklich bestätigen -> Baustelle entsteht -> Platzierungsmodus endet oder bewusst erneut aktiviert`

### 6.1 Gebäudeauswahl

Der Baukatalog soll keine dauerhaft offene große Seitenleiste benötigen.

Auf Smartphone ist eine kompakte, scrollbare Bottom-Sheet-/Drawer-Lösung bevorzugt.

Gebäude müssen mindestens über Icon + verständlichen Namen identifizierbar sein.

Baukosten und wesentliche Voraussetzung müssen vor der Bestätigung erkennbar sein.

### 6.2 Platzierungsvorschau

Nach Gebäudeauswahl erscheint eine Vorschau in der Welt.

Die Vorschau zeigt mindestens:

- geplante Position,
- Footprint,
- gültige/ungültige Platzierung,
- soweit für die Entscheidung relevant den vorgesehenen Zugang/Entrance.

### 6.3 Positionieren

Der Spieler kann die Vorschau verschieben, ohne sofort zu bauen.

Kamerabewegung muss während der Platzierung weiterhin möglich sein.

### 6.4 Explizite Bestätigung

Auf Touch gilt:

> **Das bloße Berühren einer Kartenposition darf nicht unmittelbar eine irreversible Gebäudeplatzierung auslösen.**

Die finale Platzierung benötigt eine erkennbare Bestätigung.

Damit werden Fehlplatzierungen durch Scrollen, Zoomen oder Fingerabweichung reduziert.

### 6.5 Abbruch

Jeder Platzierungsmodus besitzt einen jederzeit sichtbaren oder eindeutig erreichbaren Abbruch.

Abbruch erzeugt keine Baustelle und verbraucht keine Ressourcen.

## 7. Objektwahl und Gebäudeinteraktion

### 7.1 Ein Tap – ein Fokus

Ein normaler Tap auf ein Gebäude wählt es aus.

Die Auswahl wird in der Welt sichtbar markiert und öffnet den Kontextbereich.

### 7.2 Informationen vor Aktionen

Das Panel zeigt zuerst den Zustand des Gebäudes und erst danach passende Aktionen.

Der Spieler soll verstehen können, warum etwas nicht funktioniert, bevor er versucht, es durch Bedienung zu korrigieren.

### 7.3 Keine versteckten Kernzustände

Für den Kern müssen bei Auswahl verständlich sichtbar sein:

- aktiv / pausiert,
- arbeitet / wartet,
- wesentlicher Grund für Warten,
- lokale Waren bzw. relevante Bestände,
- Baufortschritt und Materialstatus bei Baustellen,
- Bewohner bei Häusern,
- Arbeitsbereich bei entsprechenden Gebäuden.

### 7.4 Destruktive Aktionen

Abreißen und vergleichbar destruktive Aktionen benötigen eine Bestätigung und dürfen nicht unmittelbar neben häufig genutzten harmlosen Aktionen zu leicht versehentlich ausgelöst werden.

## 8. HUD-Informationshierarchie

Informationen werden in vier Ebenen eingeteilt.

### Ebene 1 – permanent

Nur sehr häufig benötigte globale Orientierung:

- Holz,
- Stein,
- Gold,
- Bevölkerung,
- Bauzugang,
- Menüzugang.

### Ebene 2 – Weltfeedback

Ohne Menü direkt sichtbar:

- Warenstapel,
- laufende Transporte,
- Baustellenzustand,
- Figurenbewegung,
- Tierbewegung,
- Trampelpfade,
- kompakte Statussymbole an problematischen/pausierten Gebäuden.

### Ebene 3 – Auswahlkontext

Nach Tap auf ein Objekt:

- detaillierter Status,
- lokaler Stock,
- Produktion,
- Bedarf,
- Bewohner,
- Arbeitsbereich,
- Baufortschritt,
- passende Aktionen.

### Ebene 4 – Übersicht/Analyse

Seltener benötigte Gesamtdaten:

- vollständige Ressourcen-/Warenübersicht,
- Wirtschafts-/Lagerübersicht,
- detailliertere Engpassinformationen,
- später weitere Managementansichten.

Diese Ebene darf ein eigenes Panel/Overlay verwenden, muss aber für den normalen Spielablauf nicht permanent geöffnet sein.

## 9. Wirtschaft muss ohne Inspector lesbar sein

Der Entwickler-Inspector ist kein Spielerwerkzeug.

Ein Spieler muss im normalen Spiel erkennen können:

- dass ein Produktionsgebäude arbeitet oder wartet,
- ob lokal fertige Waren liegen,
- ob Waren abgeholt werden,
- ob eine Baustelle noch Material braucht,
- ob Material bereits reserviert/unterwegs ist, soweit für das Verständnis nötig,
- ob der Bau auf einen Bauarbeiter wartet,
- ob ein Arbeiter/Bauarbeiter unterwegs ist,
- ob ein Gebäude pausiert ist,
- ob ein Arbeitsbereich keine geeigneten Ziele bietet,
- ob ein logistischer oder personeller Engpass vorliegt.

Nicht jede interne technische Ursache muss gezeigt werden. Die Spielerinformation soll fachlich verständlich sein, nicht Debug-Sprache verwenden.

Beispiel:

Spielertext: `Wartet auf Bauarbeiter`

statt interner Diagnose wie: `assignment=null / builderJob pending / retryNotBefore=...`.

## 10. Weltfeedback und Statussymbole

Statussymbole sollen sparsam eingesetzt werden.

Geeignete NOW-Fälle:

- pausiert,
- fehlender Arbeiter,
- kein geeignetes Rohstoffziel,
- Ausgang voll / Transportstau,
- Baustelle wartet auf Material,
- Baustelle wartet auf Bauarbeiter,
- unerreichbar/blockiert, wenn dies spielerisch relevant ist.

Regeln:

- Normal funktionierende Gebäude brauchen kein dauerhaftes Statussymbol.
- Ein Symbol soll einen Zustand zusammenfassen, nicht technische Details darstellen.
- Tap auf Gebäude liefert die Erklärung.
- Mehrere gleichzeitige Ursachen werden im Panel priorisiert, nicht als Symbolwolke über dem Gebäude dargestellt.

## 11. Touch-Ziele und Fehlbedienung

Die genaue Pixelgröße wird später festgelegt. Bereits verbindlich ist:

- Kernaktionen besitzen großzügige Touch-Ziele,
- Icon und Touchfläche sind nicht identisch; die berührbare Fläche darf größer sein,
- wichtige Aktionen dürfen nicht nur über winzige Weltobjekte erreichbar sein,
- häufige Aktionen und destruktive Aktionen werden räumlich/visuell getrennt,
- ein geschlossenes Panel darf keine unsichtbare Touchfläche zurücklassen,
- UI-Flächen blockieren darunterliegende Weltinteraktion zuverlässig,
- Safe Areas moderner Smartphones werden berücksichtigt,
- Landscape und Portrait werden nicht automatisch beide als gleichwertige Spiellayouts vorausgesetzt; die endgültige Orientierungsentscheidung folgt innerhalb S2D-04.

## 12. Smartphone, Tablet und Desktop

### Smartphone

Smartphone ist Referenz für minimale nutzbare Fläche.

Prinzip:

- Welt maximal sichtbar,
- kompakter HUD,
- Bottom Sheets/Drawer für Details,
- keine gleichzeitig offenen Fensterketten,
- Touch-first.

### Tablet

Tablet darf:

- größere Panels,
- mehr gleichzeitig sichtbare Informationen,
- breiteren Baukatalog

verwenden, ohne Gameplayregeln zu ändern.

### Desktop

Desktop darf:

- Maus-Hover als Zusatzinformation,
- Tastaturkürzel,
- dauerhaft breitere Seiten-/Detailbereiche,
- präzisere Cursor-Vorschau

anbieten.

Aber:

> **Keine Kernaktion darf ausschließlich auf Hover, Rechtsklick oder Tastatur angewiesen sein.**

## 13. Systemmenü und sekundäre Zugänge

Vom normalen Spielscreen muss ein klarer Systemmenü-Zugang existieren.

Dort gehören konzeptionell hin:

- Speichern,
- Spiel fortsetzen/zurück,
- Einstellungen,
- Hilfe,
- Einführung/Tutorial neu starten,
- gegebenenfalls Spiel verlassen/zum Startbildschirm.

Die exakte Menüstruktur wird in einem späteren S2D-04-Teilblock festgelegt.

## 14. Guidance-Verankerung

S2D-04A reserviert UI-Flächen und Interaktionsregeln für Guidance, ohne Tutorialinhalte vollständig zu spezifizieren.

Guidance darf:

- ein relevantes UI-Element hervorheben,
- eine kurze Erklärung anzeigen,
- auf ein Weltobjekt hinweisen,
- bei Bedarf eine Aktion erklären.

Guidance darf nicht:

- fachliche Bedingungen umgehen,
- Gebäude/Ressourcen direkt erzeugen,
- Runtime-State außerhalb der Owner verändern,
- den Spieler dauerhaft mit denselben Hinweisen blockieren.

Gesehene/abgeschlossene Hinweise werden gemäß S2D-00/S2D-03 persistiert.

## 15. UI und technische Ownership

S2D-03 bleibt vollständig bindend.

Die UI:

- liest Owner-Zustände über Queries/Read Models/Snapshots,
- sendet fachliche Commands für Spieleraktionen,
- reagiert auf Events,
- besitzt keinen zweiten Gameplay-State,
- korrigiert keine Runtime-Inkonsistenzen,
- startet keine eigenen Gameplay-Timer,
- darf lokale rein visuelle UI-Zustände besitzen, z. B. welches Panel geöffnet ist oder welches Katalogelement markiert ist.

Beispiel:

`Pause Button -> PauseBuilding Command -> Production/Owner validiert -> State Mutation -> Event -> UI aktualisiert Anzeige`

Nicht:

`Pause Button -> UI setzt building.paused direkt`.

## 16. Primäre mobile Bedienmatrix

| Spielerabsicht | Primäre Smartphone-Interaktion | Ergebnis |
|---|---|---|
| Karte bewegen | Ein-Finger-Drag auf Welt | Kamera pannt |
| Zoomen | Zwei-Finger-Pinch | Kamera zoomt |
| Objekt ansehen | kurzer Tap | Objekt selektiert, Kontextpanel öffnet |
| Auswahl schließen | Tap auf freie Fläche / Schließen | zurück zu NORMAL |
| Bauen beginnen | Bauen-Button | Baukatalog öffnet |
| Gebäude wählen | Tap im Katalog | Platzierungsvorschau |
| Position ändern | Vorschau ziehen/Position wählen | Vorschau bewegt sich |
| Karte beim Bauen bewegen | klar getrennte Drag-Geste auf Welt | Kamera pannt, keine Platzierung |
| Gebäude setzen | explizite Bestätigung | Placement-Command |
| Bauen abbrechen | Abbruch | keine Änderung |
| Produktion pausieren | Gebäude wählen -> Pause | Command an Owner |
| Arbeitsbereich ändern | Gebäude wählen -> Arbeitsbereich | Editiermodus |
| Abreißen | Gebäude wählen -> Abreißen -> Bestätigung | Demolition-Command |
| Detailbestände ansehen | Ressourcen-/Lagerübersicht | Ebene-4-Ansicht |
| Hilfe | Systemmenü/Hilfe | Hilfe/Guidance |

## 17. Verbindliche S2D-04A-Invarianten

1. Smartphone ist vollwertige Zielplattform.
2. Die Welt bleibt die dominante Bildschirmfläche.
3. Der permanente HUD zeigt nur häufig benötigte globale Orientierung.
4. Holz, Stein, Gold und Bevölkerung gehören zum NOW-Kern des permanenten HUD.
5. Weitere Waren bleiben schnell erreichbar, müssen aber nicht permanent Platz belegen.
6. Objektinformationen erscheinen kontextabhängig.
7. Ein Tap auf ein Objekt selektiert; ein Drag bewegt die Kamera.
8. Pinch zoomt die Kamera.
9. Kameraaktionen dürfen keine unbeabsichtigten Gameplay-Aktionen auslösen.
10. Gebäudeplatzierung benötigt auf Touch eine explizite Bestätigung.
11. Jeder Werkzeugmodus besitzt einen klaren Abbruch.
12. Ein aktiver Modus ist sichtbar erkennbar.
13. Kernwirtschaft und Engpässe sind ohne Entwickler-Inspector verständlich.
14. Normale funktionierende Gebäude benötigen keine permanente Symbolflut.
15. Destruktive Aktionen benötigen Bestätigung.
16. UI besitzt keinen Gameplay-State als zweite Wahrheit.
17. UI mutiert Domain-State ausschließlich über öffentliche Owner-Verträge.
18. Render-/UI-Refresh-Timing beeinflusst keine Simulation.
19. Tablet/Desktop erweitern Komfort, nicht Gameplayregeln.
20. Keine Kernaktion ist ausschließlich von Hover, Rechtsklick oder Tastatur abhängig.
21. Guidance und Spieler-UI bleiben von Entwickler-Inspector getrennt.
22. Safe Areas und kleine Displays werden als reale Zielbedingungen behandelt.
23. Weltfeedback ist Teil der Economy-Lesbarkeit, nicht bloße Dekoration.
24. Platzierung, Auswahl und Kamera besitzen eindeutig unterscheidbare Touch-Interaktionen.

## 18. Bewusst noch offen

S2D-04A entscheidet ausdrücklich noch nicht:

- finale Bildschirmorientierung bzw. verbindliche Portrait-/Landscape-Strategie,
- exakte HUD-Anordnung,
- finale Position jedes Buttons,
- konkrete Touch-Zielgrößen in px/dp,
- Farben und UI-Designsprache,
- finale Icon-Bibliothek,
- genaue Baukategorien,
- vollständige Struktur aller Gebäude-Panels,
- vollständige Wirtschaftsübersicht,
- konkrete Tutorialsequenz,
- Startmenü-/New-/Continue-Detaildesign,
- Einstellungen,
- Desktop-Hotkeys,
- Inspector-Oberfläche,
- Accessibility-Detailregeln.

Diese Punkte werden kontrolliert in den folgenden S2D-04-Teilblöcken geschlossen.

## 19. S2D-04A Abschluss

S2D-04A – Screen Structure, HUD & Primary Mobile Interaction Model ist **COMPLETE**.

Ergebnis:

- primäre Screen-Ebenen definiert,
- permanenter HUD fachlich begrenzt,
- Informationshierarchie festgelegt,
- Smartphone-Kamera und Auswahlmodell festgelegt,
- Touch-Bauablauf einschließlich expliziter Bestätigung festgelegt,
- Objekt-/Kontextinteraktion definiert,
- Economy-Lesbarkeit ohne Inspector verbindlich gemacht,
- Plattformabstufung Smartphone/Tablet/Desktop festgelegt,
- technische UI-Ownership an S2D-03 gebunden,
- keine Gameplay- oder UI-Implementierung begonnen.

**Open Blockers: 0**
