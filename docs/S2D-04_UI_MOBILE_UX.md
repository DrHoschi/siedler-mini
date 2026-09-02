# S2D-04 – UI / MOBILE UX

Status: **V0.1 DRAFT – S2D-04A/B COMPLETE**  
Datum: 2026-09-02  
Repository: `DrHoschi/siedler-mini`  
Arbeitsbranch: `feature/s2d-04-ui-mobile-ux`  
Verbindliche Basis: `S2D-00 PROJECT MASTER V0.1 FROZEN` + `S2D-01 GAME DESIGN V0.1 FROZEN` + `S2D-02 UNIT & WORKFORCE MODEL V0.1 FROZEN` + `S2D-03 TECHNICAL ARCHITECTURE V0.1 FROZEN`

## 1. Zweck

S2D-04 definiert die verbindliche Zielstruktur der Spieleroberfläche und der mobilen Bedienung.

Die bisher geschlossenen Teilblöcke sind:

- S2D-04A – Screen Structure, HUD & Primary Mobile Interaction Model,
- S2D-04B – Building Selection, Context Panels & Economy Feedback Model.

S2D-04A legt die primäre Screen-, HUD-, Kamera-, Auswahl- und Touch-Baulogik fest.

S2D-04B legt im Detail fest:

- welche Informationen ein ausgewähltes Gebäude oder eine Baustelle zeigt,
- wie Context Panels aufgebaut sind,
- wie Status und Engpässe priorisiert werden,
- welche direkten Spieleraktionen je Gebäudeklasse angeboten werden,
- wie Rathaus/HQ, Wohnhäuser, Produktionsgebäude und Baustellen voneinander unterschieden werden,
- wie lokale Waren, Transport, Workforce und Bauzustände spielerverständlich dargestellt werden.

Noch nicht Gegenstand sind finale Pixelmaße, Farben, Fonts, Icons, CSS/HTML, konkrete Animationen oder UI-Implementierung.

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

Sie enthält Gelände, Gebäude/Baustellen, Personen, Tiere, Rohstoffquellen, sichtbare Waren, Transporte, Trampelpfade, Auswahlmarkierungen, Platzierungsvorschau und relevante Statussymbole.

Die Welt ist keine bloße Hintergrundfläche. Ein wesentlicher Teil des Economy-Feedbacks muss dort direkt erkennbar sein.

### 3.2 Permanenter kompakter HUD-Bereich

NOW vorgesehen:

- Holz,
- Stein,
- Gold,
- Bevölkerung,
- Zugang zum Systemmenü,
- Zugang zum Bauen.

Fish, Meat und Pelt gehören zum Wirtschaftssystem, müssen aber nicht alle dauerhaft im knappen Smartphone-HUD stehen. Sie bleiben über Wirtschafts-/Lageransichten schnell erreichbar.

> **Dauerhaft sichtbar ist die Orientierungsebene; Detailbestände erscheinen bei Bedarf.**

### 3.3 Kontextbereich / Auswahlpanel

Ein ausgewähltes relevantes Weltobjekt öffnet einen kontextabhängigen Informations- und Aktionsbereich.

Auf Smartphone wird dieser bevorzugt als kompakte Bottom-Sheet-/Panel-Logik behandelt, nicht als frei schwebendes Desktopfenster.

Er ist minimierbar/schließbar und darf die Welt nicht unnötig dauerhaft verdecken.

### 3.4 Modus-/Werkzeugbereich

Bestimmte Aktionen erzeugen einen klar erkennbaren temporären Modus, z. B. Gebäudeplatzierung, Arbeitsbereich-Edit oder Abrissbestätigung.

Jeder aktive Modus besitzt einen eindeutigen Abbruchweg.

### 3.5 Temporäre Hinweise / Guidance

Tutorial-/Guidance-Hinweise und kurze Warnungen sind temporär und bilden keine zweite dauerhafte HUD-Schicht.

## 4. Hauptzustände des Spielscreens

Mindestens:

1. NORMAL / OBSERVE
2. OBJECT SELECTED
3. BUILD CATALOG
4. BUILD PLACEMENT
5. WORK AREA EDIT
6. CONFIRMATION
7. SYSTEM MENU
8. GUIDANCE FOCUS

Diese Zustände beschreiben UI-Interaktion und sind keine Gameplay-Owner.

## 5. Kamera und Auswahl auf Smartphone

- Ein-Finger-Drag auf der Welt: Kamera pannt.
- Zwei-Finger-Pinch: Kamera zoomt.
- kurzer Tap auf auswählbares Objekt: Auswahl.
- Tap und Drag werden durch Gesture-Schwelle getrennt.
- Tap auf freie Weltfläche kann Auswahl schließen, sofern kein Werkzeugmodus den Tap benötigt.
- Kamera- und Werkzeuggesten dürfen nicht unmarkiert dieselbe Aktion bedeuten.

## 6. Primärer Bauablauf auf Smartphone

`Bauen öffnen -> Gebäude wählen -> Katalog reduziert/schließt -> Platzierungsvorschau -> Position prüfen/verschieben -> gültig/ungültig sichtbar -> ausdrücklich bestätigen -> Baustelle entsteht`

Die Vorschau zeigt mindestens Position, Footprint, Gültigkeit und – soweit relevant – Zugang.

Die Karte bleibt während der Platzierung bewegbar.

> **Das bloße Berühren einer Kartenposition darf nicht unmittelbar eine irreversible Gebäudeplatzierung auslösen.**

Abbruch erzeugt keine Baustelle und verbraucht keine Ressourcen.

## 7. Objektwahl und Gebäudeinteraktion – Grundregeln

Ein Tap auf ein Gebäude wählt es aus, markiert es in der Welt und öffnet seinen Kontext.

Das Panel zeigt zuerst den Zustand, danach passende Aktionen.

Für den Kern müssen verständlich sichtbar sein:

- aktiv / pausiert,
- arbeitet / wartet,
- primärer Wartegrund,
- lokale Waren/relevante Bestände,
- Baufortschritt und Materialstatus bei Baustellen,
- Bewohner bei Häusern,
- Arbeitsbereich bei geeigneten Produktionsgebäuden.

Destruktive Aktionen benötigen Bestätigung.

## 8. HUD-Informationshierarchie

### Ebene 1 – permanent

Holz, Stein, Gold, Bevölkerung, Bauzugang, Menüzugang.

### Ebene 2 – Weltfeedback

Warenstapel, laufende Transporte, Baustellenzustand, Figuren-/Tierbewegung, Trampelpfade und sparsame Statussymbole.

### Ebene 3 – Auswahlkontext

Detaillierter Status, lokaler Stock, Produktion, Bedarf, Bewohner, Arbeitsbereich, Baufortschritt und passende Aktionen.

### Ebene 4 – Übersicht/Analyse

Vollständige Ressourcen-/Warenübersicht, Wirtschafts-/Lagerübersicht, detailliertere Engpassinformationen und spätere Managementansichten.

## 9. Wirtschaft muss ohne Inspector lesbar sein

Der Spieler muss im normalen Spiel erkennen können:

- ob Produktion arbeitet oder wartet,
- ob lokal fertige Waren liegen,
- ob Waren abgeholt werden,
- ob eine Baustelle Material braucht,
- ob Material bereits reserviert/unterwegs ist, soweit für das Verständnis nötig,
- ob ein Bauarbeiter fehlt oder unterwegs ist,
- ob ein Gebäude pausiert ist,
- ob ein Arbeitsbereich keine geeigneten Ziele bietet,
- ob ein logistischer oder personeller Engpass vorliegt.

Spielertexte verwenden Fachsprache des Spiels statt Debug-Sprache.

Beispiel: `Wartet auf Bauarbeiter` statt interner Assignment-/Retry-Daten.

## 10. Weltfeedback und Statussymbole

Geeignete NOW-Fälle:

- pausiert,
- fehlender Arbeiter,
- kein geeignetes Rohstoffziel,
- Ausgang voll / Transportstau,
- Baustelle wartet auf Material,
- Baustelle wartet auf Bauarbeiter,
- unerreichbar/blockiert, wenn spielerisch relevant.

Normal funktionierende Gebäude brauchen kein permanentes Statussymbol. Mehrere Ursachen werden im Panel priorisiert, nicht als Symbolwolke dargestellt.

## 11. Touch-Ziele und Fehlbedienung

Verbindlich:

- großzügige Touch-Ziele,
- Touchfläche darf größer als sichtbares Icon sein,
- wichtige Aktionen nicht nur über winzige Weltobjekte,
- häufige und destruktive Aktionen getrennt,
- geschlossene Panels hinterlassen keine unsichtbaren Touchflächen,
- UI blockiert darunterliegende Weltinteraktion,
- Smartphone-Safe-Areas werden berücksichtigt.

Die endgültige Portrait-/Landscape-Strategie bleibt offen.

## 12. Smartphone, Tablet und Desktop

Smartphone ist Referenz für minimale nutzbare Fläche: Welt maximal sichtbar, kompakter HUD, Bottom Sheets/Drawer, keine Fensterketten, Touch-first.

Tablet darf größere Panels und mehr gleichzeitig sichtbare Information verwenden.

Desktop darf Hover-Zusatzinfos, Hotkeys, breitere Panels und präzisere Cursor-Vorschau ergänzen.

> **Keine Kernaktion darf ausschließlich auf Hover, Rechtsklick oder Tastatur angewiesen sein.**

## 13. Systemmenü und Guidance

Vom Spielscreen existiert ein klarer Systemmenü-Zugang für Speichern, Zurück/Fortsetzen, Einstellungen, Hilfe, Tutorial-Neustart und gegebenenfalls Verlassen.

Guidance darf UI/Welt hervorheben und erklären, aber keine Gameplay-Bedingungen umgehen oder Domain-State direkt verändern.

## 14. UI und technische Ownership

S2D-03 bleibt bindend.

Die UI liest Owner-Zustände über öffentliche Read Models/Queries, sendet Commands und reagiert auf Events. Sie besitzt keinen zweiten Gameplay-State und startet keine Gameplay-Timer.

Beispiel:

`Pause Button -> PauseBuilding Command -> Owner validiert -> State Mutation -> Event -> UI aktualisiert`

Nicht:

`Pause Button -> UI setzt building.paused direkt`.

## 15. Primäre mobile Bedienmatrix

| Spielerabsicht | Primäre Smartphone-Interaktion | Ergebnis |
|---|---|---|
| Karte bewegen | Ein-Finger-Drag auf Welt | Kamera pannt |
| Zoomen | Zwei-Finger-Pinch | Kamera zoomt |
| Objekt ansehen | kurzer Tap | Objekt selektiert, Kontextpanel öffnet |
| Auswahl schließen | Tap freie Fläche / Schließen | NORMAL |
| Bauen beginnen | Bauen-Button | Baukatalog |
| Gebäude wählen | Tap im Katalog | Platzierungsvorschau |
| Position ändern | Vorschau ziehen/Position wählen | Vorschau bewegt sich |
| Karte beim Bauen bewegen | getrennte Drag-Geste | Kamera pannt, keine Platzierung |
| Gebäude setzen | explizite Bestätigung | Placement-Command |
| Bauen abbrechen | Abbruch | keine Änderung |
| Produktion pausieren | Gebäude -> Pause | Owner-Command |
| Arbeitsbereich ändern | Gebäude -> Arbeitsbereich | Editiermodus |
| Abreißen | Gebäude -> Abreißen -> Bestätigung | Demolition-Command |
| Detailbestände | Ressourcen-/Lagerübersicht | Ebene 4 |
| Hilfe | Systemmenü/Hilfe | Hilfe/Guidance |

# S2D-04B – Building Selection, Context Panels & Economy Feedback Model

## 16. Ziel des Context Panels

> **Ein ausgewähltes Gebäude soll dem Spieler innerhalb weniger Sekunden beantworten: Was ist das? Was macht es gerade? Wenn es nicht arbeitet: warum? Was kann ich hier sinnvoll tun?**

Das Context Panel ist keine Mini-Version des Inspectors und kein Rohdatenfenster.

Es zeigt spielerrelevante Informationen in klarer Priorität und blendet technische Details aus, solange sie nicht als verständliche Spielursache relevant sind.

## 17. Gemeinsame Panel-Struktur

Jedes Gebäude-/Baustellenpanel folgt derselben Grundreihenfolge.

### 17.1 Kopf

Immer sichtbar:

- Gebäudename,
- Gebäudeart/kurze Funktion, soweit nicht bereits eindeutig,
- kompakter Hauptstatus,
- Schließen/Minimieren.

Der Hauptstatus ist eine verständliche Aussage, z. B.:

- `Arbeitet`,
- `Pausiert`,
- `Wartet auf Arbeiter`,
- `Wartet auf Rohstoff`,
- `Ausgang voll`,
- `Wartet auf Material`,
- `Material vollständig – Bauarbeiter fehlt`,
- `Bauarbeiter unterwegs`,
- `Im Bau`.

### 17.2 Primäre Zustandskarte

Direkt nach dem Kopf steht genau der aktuell wichtigste spielerische Zustand.

Bei normalem Betrieb kann diese kompakt sein. Bei einem Engpass erhält sie mehr Raum und erklärt den Grund.

### 17.3 Fachlicher Kernbereich

Je Gebäudeklasse folgt der wichtigste Inhalt:

- HQ: zentrale Bestände,
- Haus: Bewohner,
- Produktion: Produktion + lokaler Ausgang,
- Baustelle: Material + Builder-/Fortschrittszustand.

### 17.4 Sekundäre Informationen

Nur soweit relevant:

- Arbeitsbereich,
- Transportstatus,
- zusätzliche Waren,
- Bewohner-/Worker-Zusammenhang,
- weitere Ursache nach dem Primärengpass.

### 17.5 Aktionen

Häufige und reversible Aktionen stehen vor seltenen/destruktiven Aktionen.

Abriss ist räumlich/visuell getrennt und bestätigt.

## 18. Panel-Größenlogik auf Smartphone

Das Context Panel besitzt konzeptionell drei Darstellungsstufen:

### PEEK

Kompakt sichtbar:

- Name,
- Hauptstatus,
- wichtigste Kennzahl bzw. wichtigste Aktion.

Die Welt bleibt fast vollständig sichtbar.

### STANDARD

Normale Auswahlansicht mit den für das Gebäude wichtigsten Informationen und Aktionen.

### EXPANDED

Für Detailinformationen wie vollständige Bestände oder Material-/Transportdetails.

EXPANDED ist kein permanenter Zustand und darf die Karte weitgehend überdecken, solange es leicht wieder reduziert werden kann.

Die konkrete Gesten-/Snap-Mechanik bleibt Implementierungsdetail.

## 19. Status-Prioritätsmodell

Ein Gebäude kann intern mehrere Zustände gleichzeitig haben. Der Spieler erhält dennoch einen klaren Hauptstatus.

Prioritätsprinzip:

1. **kritische/ungültige Spielzustände**, sofern spielerisch relevant,
2. **bewusste Spielerzustände** wie Pausiert,
3. **blockierende Voraussetzungen**,
4. **aktive Übergänge** wie Arbeiter/Transport unterwegs,
5. **normaler aktiver Betrieb**,
6. **neutrales Warten ohne Problem**.

Die konkrete Ursache wird fachlich priorisiert, nicht nach technischer Modulreihenfolge.

Beispiel Produktionsgebäude:

`Pausiert` hat Vorrang vor `kein Rohstoffziel`, weil die Produktion bewusst angehalten wurde und der zweite Zustand aktuell keine Handlungsursache ist.

Beispiel Baustelle:

`Wartet auf Material` hat Vorrang vor `kein Bauarbeiter`, solange die Materialien noch nicht vollständig sind, weil gemäß Game Design noch gar kein Builder benötigt wird.

## 20. Engpassdarstellung

Jeder Engpass besitzt nach Möglichkeit drei Ebenen:

1. **Was?** – verständlicher Status.
2. **Warum?** – kurze Ursache.
3. **Was kann der Spieler tun?** – nur wenn eine sinnvolle direkte Handlung existiert.

Beispiel:

- Status: `Ausgang voll`
- Ursache: `3 Holz warten auf Abholung.`
- Handlungshinweis: `Mehr Transportkapazität oder kürzere Wege können helfen.`

Der dritte Punkt ist Hilfe, keine automatische Reparatur und kein Zwang zu Mikromanagement.

## 21. HQ / Rathaus – Context Panel

Das Rathaus ist Startgebäude, Hauptlager und zentraler Lieferpunkt des ersten Wirtschaftskerns.

### 21.1 PEEK

- `Rathaus`
- Hauptstatus, normalerweise `Hauptlager`
- kompakte Gesamtbelegung bzw. zentrale Orientierung, sofern später Kapazität relevant wird.

### 21.2 STANDARD

Primär sichtbar:

- Holz,
- Stein,
- Fisch,
- Fleisch,
- Fell,
- Gold als separater Wirtschafts-/Wertbestand,
- Bevölkerung als abgeleitete Siedlungskennzahl, nicht als Lagerware.

Die Darstellung muss klar machen:

> **Physische Waren gelten im Rathaus erst als verfügbar, nachdem sie tatsächlich dorthin geliefert wurden.**

Unterwegs befindliche Waren werden nicht in den verfügbaren Bestand hineingerechnet.

### 21.3 Transportfeedback

Falls relevant kann das Rathaus zusätzlich zeigen:

- Waren unterwegs zum Rathaus,
- aktive Anlieferung,
- auffälligen Transportstau.

`Unterwegs` bleibt visuell getrennt von `Verfügbar`.

### 21.4 Aktionen

NOW keine unnötige Lager-Mikrosteuerung.

Mögliche direkte Aktionen beschränken sich auf allgemein sinnvolle Gebäudeaktionen, soweit fachlich erlaubt. Ein separates Lager-/Prioritätenmanagement wird nicht in S2D-04B vorweggenommen.

Abriss des Start-HQ wird nicht als normale Kernaktion vorausgesetzt; genaue HQ-Abrissregel gehört ins Content/Game-Rule-Detail, falls überhaupt zulässig.

## 22. Wohnhaus – Context Panel

Gilt für kleines und mittleres Wohnhaus mit jeweiliger realer Bewohnerzahl.

### 22.1 PEEK

- Hausname,
- `2 Bewohner` beim kleinen Haus bzw. tatsächlicher aktueller Wert,
- `3 Bewohner` beim mittleren Haus bzw. tatsächlicher aktueller Wert.

Die UI zeigt den tatsächlichen Runtime-Bestand, nicht blind den Sollwert der Definition.

### 22.2 STANDARD

Primär:

- Bewohnerzahl,
- Bewohner als reale Personen der Siedlung,
- kompakter Verfügbarkeitsüberblick, z. B. wie viele aktuell frei/unterwegs/bei Arbeit sind, sofern dies ohne unnötige Komplexität verständlich dargestellt werden kann,
- Gold-/Steuerbeitrag in spielerisch sinnvoller Form.

Der aktuelle historische Testwert `1 Gold/Bewohner/10s` darf nicht als finales Balancing in der UI-Spezifikation festgeschrieben werden.

### 22.3 Bewohnerdetails

Eine spätere erweiterte Ansicht darf einzelne Bewohner mit Name/Status/Arbeitsrolle zeigen, ist für S2D-04B aber keine Pflicht des Standardpanels.

Wichtig ist bereits jetzt:

- Bewohner bleiben Bewohner,
- temporäre Hilfsarbeit darf nicht als Identitätswechsel zu `Träger` dargestellt werden,
- Spezialisierung und aktuelle Aufgabe sind getrennte Begriffe.

### 22.4 Hauszustände

Spielerrelevante Zustände können sein:

- normal bewohnt,
- Bewohner unterwegs/bei Arbeit,
- Übergang nach Verlust einer Wohnbindung, falls dieser Zustand später sichtbar relevant wird.

Ein Haus erhält kein künstliches `arbeitet`/`wartet`-Produktionsschema.

### 22.5 Aktionen

NOW:

- Abriss mit Bestätigung, sofern fachlich zulässig.

Keine Bewohner-Mikrozuweisung im Kern. Der Spieler weist einzelne Bewohner nicht manuell jedem Transportjob zu.

## 23. Produktionsgebäude – gemeinsames Context Panel

Gilt für Holzfällerhütte, Steinbruch, Fischerhütte und Jägerhütte, mit gebäudespezifischen Inhalten.

### 23.1 PEEK

- Gebäudename,
- Hauptstatus,
- kompakter lokaler Ausgang, z. B. `Holz: 2`.

### 23.2 STANDARD – Produktionsstatus

Zeigt mindestens:

- aktiv oder pausiert,
- arbeitet / wartet / Worker unterwegs,
- primären Wartegrund,
- lokale fertige Waren,
- Transportstatus der fertigen Waren,
- Arbeitsbereich, wenn das Gebäude einen solchen besitzt.

### 23.3 Lokaler Ausgang

Lokaler Output wird als echter Bestand des Gebäudes dargestellt.

Beispiele:

- Holzfäller: Holz,
- Steinbruch: Stein,
- Fischer: Fisch,
- Jäger: Fleisch + Fell.

Die UI darf denselben physischen Bestand nicht gleichzeitig als lokal und im HQ verfügbar darstellen.

Mögliche Anzeige:

`Lokal: 3 Holz`

`Davon zur Abholung reserviert/unterwegs: 1`

Dabei muss klar bleiben: Reservation ist kein zweiter Warenort.

### 23.4 Transportzustände

Spielerrelevante Aussagen:

- `Wartet auf Abholung`,
- `Träger unterwegs`,
- `Wird zum Rathaus gebracht`,
- `Ausgang voll`, sofern Kapazität/Blockierung relevant ist.

Nicht anzeigen:

- interne Job IDs,
- Assignment IDs,
- Retry-Zeitstempel,
- A*-Failcodes.

### 23.5 Workerzustände

Spielerrelevante Aussagen:

- `Arbeiter vorhanden`,
- `Wartet auf Arbeiter`,
- `Arbeiter unterwegs`,
- `Arbeiter bei Arbeit`.

Die UI darf Spezialisierung anzeigen, z. B. `Jäger`, aber nicht durch historische Type-Mutation falsche Identität suggerieren.

### 23.6 Pause

Pause/Fortsetzen ist eine primäre direkte Aktion.

Bei Pause:

- Hauptstatus `Pausiert`,
- keine neue Produktions-/Rohstoffarbeit,
- bereits fertige lokale Waren bleiben sichtbar und dürfen weiterhin transportiert werden,
- der Pause-Button wird zu `Fortsetzen`.

Die UI darf fertige Ware nicht ausblenden, nur weil Produktion pausiert ist.

### 23.7 Arbeitsbereich

Für Gebäude mit Arbeitsbereich:

- aktuelle Arbeitszone ist in der Welt visualisierbar,
- Panel bietet `Arbeitsbereich ändern`,
- bei ungeeignetem/leeren Bereich verständlicher Status, z. B. `Kein geeignetes Ziel im Arbeitsbereich`.

Der Arbeitsbereich-Editor ist ein eigener klarer UI-Modus und wird in einem späteren S2D-04-Block detailliert.

### 23.8 Aktionen

Primär:

- Pause/Fortsetzen,
- Arbeitsbereich anzeigen/ändern, wenn unterstützt.

Sekundär/destruktiv:

- Abreißen mit Bestätigung.

Keine direkte `Ware ins HQ buchen`-Aktion und kein `Träger jetzt teleportieren`.

## 24. Gebäudespezifische Produktionsinformationen

### 24.1 Holzfällerhütte

Zeigt:

- Holz als lokalen Output,
- Arbeitsbereich,
- verständlich, wenn kein geeigneter Baum/Rohstoff erreichbar bzw. im Bereich vorhanden ist,
- Worker-/Transportstatus.

### 24.2 Steinbruch

Zeigt:

- Stein als lokalen Output,
- Arbeitsbereich,
- verständlich, wenn kein geeigneter Stein/Rohstoff verfügbar ist,
- Worker-/Transportstatus.

### 24.3 Fischerhütte

Zeigt:

- Fisch als lokalen Output,
- Arbeitsbereich,
- verständlich, wenn kein geeignetes Fisch-/Arbeitsziel vorhanden ist,
- Worker-/Transportstatus.

### 24.4 Jägerhütte

Zeigt:

- Fleisch und Fell getrennt als lokale Outputs,
- Arbeitsbereich,
- verständlich, wenn aktuell kein geeignetes Tierziel vorhanden ist,
- Jäger-/Transportstatus.

Die Anzeige respektiert, dass der Jäger reale Tiere der Welt nutzt; es wird kein abstrakter unsichtbarer Tierbestand suggeriert.

## 25. Baustelle – Context Panel

Baustellen erhalten ein eigenes Panelmodell und werden nicht wie fertige Produktionsgebäude behandelt.

### 25.1 PEEK

- Name des entstehenden Gebäudes,
- Hauptstatus,
- kompakter Gesamtfortschritt.

### 25.2 Materialdarstellung

Für jede benötigte physische Ware wird mindestens unterschieden:

- Soll,
- geliefert,
- gültig reserviert/unterwegs, soweit für den Spieler relevant,
- noch offen.

Die Darstellung muss die fachliche Regel respektieren:

`Restbedarf = Soll - geliefert - gültig reserviert/unterwegs`

Beispiel:

`Holz 2/3 geliefert · 1 unterwegs`

Dann ist der Restbedarf bereits 0 und die UI darf nicht suggerieren, dass noch ein weiteres Holz benötigt wird.

### 25.3 Material-Statuspriorität

Solange Restmaterial fehlt:

- Hauptstatus `Wartet auf Material`, oder
- `Material unterwegs`, wenn der komplette offene Rest bereits gültig unterwegs/reserviert ist.

Ein fehlender Builder ist in dieser Phase kein primärer Engpass, weil der Builder gemäß Game Design erst nach vollständiger Materialversorgung benötigt wird.

### 25.4 Übergang zu Builder

Wenn alle benötigten Materialien physisch geliefert wurden:

1. `Material vollständig – wartet auf Bauarbeiter`,
2. `Bauarbeiter unterwegs`,
3. nach realer Ankunft `Im Bau`.

> **Die UI darf Baufortschritt erst anzeigen, wenn der Builder tatsächlich angekommen ist und ConstructionSystem den BUILDING-Zustand bestätigt.**

### 25.5 Baufortschritt

Während `Im Bau`:

- klarer Fortschrittsindikator,
- Bauarbeiterstatus,
- keine weitere Materialanforderung, sofern alle Sollmengen erfüllt sind.

Der Fortschrittsindikator liest Construction-State und berechnet keinen eigenen Bauzustand.

### 25.6 Baustellen-Transport

Falls Material unterwegs ist, kann die Baustelle dies pro Ware oder zusammengefasst zeigen.

Wichtig:

- `unterwegs` ist nicht `geliefert`,
- überlieferte Mengen werden nicht als normaler Zustand geplant,
- bei bereits erfülltem Restbedarf darf die UI keine zusätzliche Nachfrage suggerieren.

### 25.7 Aktionen

NOW primär keine manuelle Builder-/Carrier-Zuweisung.

Mögliche Aktion:

- Baustelle abbrechen/abreißen mit Bestätigung.

Eine spätere Materialpriorisierung wird nicht in S2D-04B vorweggenommen.

## 26. Primärer und sekundärer Engpass

Das Panel zeigt grundsätzlich **einen primären Engpass prominent**.

Ein sekundärer Hinweis darf ergänzt werden, wenn er für die Planung relevant ist und nicht irreführt.

Beispiele:

Produktionsgebäude:

- Primär: `Ausgang voll`
- Sekundär: `3 Holz warten auf Abholung`

Baustelle:

- Primär: `Material unterwegs`
- Sekundär: `Bauarbeiter wird erst danach benötigt`

Nicht zulässig ist eine ungeordnete Liste aller intern denkbaren Zustände.

## 27. Economy-Feedback: verfügbar, lokal, reserviert, unterwegs

Diese Begriffe müssen in der Spieleroberfläche konsistent verwendet werden.

### Verfügbar

Ware befindet sich im zentral nutzbaren HQ-/Lagerbestand.

### Lokal

Ware liegt physisch im lokalen Bestand eines Produktionsgebäudes oder – bei Baustellenmaterial – bereits an der Baustelle.

### Reserviert

Ware besitzt eine gültige Zuordnung zu einem Bedarf, befindet sich aber weiterhin an ihrem aktuellen physischen Ort.

### Unterwegs

Ware wird physisch von einer Unit getragen.

Zentrale Regel:

> **Die UI darf Reservation oder Transport niemals als zusätzliche Warenmenge zählen.**

## 28. Economy-Feedback durch Welt + Panel

Panel und Welt ergänzen sich.

Beispiel Holzfäller:

- Welt: sichtbarer Holzstapel am Gebäude,
- Panel: `Lokal 3 Holz · 1 zur Abholung reserviert`,
- Welt: Träger läuft zum Pickup,
- nach Pickup: lokaler Stapel sinkt fachlich entsprechend; Unit trägt Ware,
- Panel: `1 Holz unterwegs zum Rathaus`,
- nach realer Lieferung: HQ-Bestand steigt.

Die sichtbare Welt darf keine zweite wirtschaftliche Wahrheit besitzen. Warenstapel sind Darstellung des Owner-State.

## 29. Gebäudezustände in der Welt

Die Welt zeigt nur Zustände, die aus der Entfernung nützlich sind.

Vorgesehen:

- Pause,
- wesentlicher Blocker,
- Baustellenphase,
- sichtbare Warenstapel,
- reale Worker-/Transportbewegung.

Detailursachen erscheinen erst nach Auswahl.

Bei Zoomstufen mit wenig Platz dürfen Statussymbole weiter reduziert/aggregiert werden. Exakte LOD-Regeln bleiben offen.

## 30. Auswahlwechsel und Panel-Aktualisierung

- Tap auf anderes Gebäude wechselt den Panelkontext direkt.
- Panel liest den neuen Owner-State und übernimmt keine Daten des vorherigen Gebäudes.
- Wird das ausgewählte Gebäude entfernt, schließt oder wechselt das Panel kontrolliert in einen nicht mehr verfügbaren Zustand; es hält keinen Zombie-Verweis.
- Live-Änderungen wie Lieferung, Pause oder Builder-Ankunft aktualisieren das Panel über öffentliche Runtime-Verträge/Events/Read Models.
- UI-Refresh erzeugt keine Gameplay-Mutation.

## 31. Keine unnötige Mikromanagement-UI

Für den ersten Kern ausdrücklich nicht vorgesehen:

- einzelne Träger per Tap einer Ware zuweisen,
- einzelne freie Bewohner manuell als Hilfsträger umschalten,
- Bauarbeiter per Drag auf Baustelle ziehen,
- Produktionswaren manuell ins HQ buchen,
- interne Jobprioritäten pro Einzeljob editieren,
- Navigation/A*-Parameter im Spielerpanel ändern.

Die Siedlung führt operative Arbeit autonom aus. Der Spieler löst wirtschaftliche und räumliche Probleme.

## 32. Fehler, Warten und technische Störung

Das Spielerpanel unterscheidet:

### Normales Warten

Beispiele:

- Ware unterwegs,
- Worker unterwegs,
- Bauarbeiter unterwegs,
- aktuell kein Tier im Arbeitsbereich.

### Spielerischer Engpass

Beispiele:

- dauerhaft kein Arbeiter,
- Ausgang voll,
- keine geeignete Rohstoffquelle,
- Baustoff fehlt,
- unerreichbarer Zugang, soweit dies eine spielerisch lösbare Situation ist.

### Technische Inkonsistenz

Eine Runtime-Invariant-Verletzung aus S2D-03G wird nicht als gewöhnlicher Economy-Status schöngeredet.

Im normalen Spielerbetrieb kann eine neutrale Fehlermeldung nötig sein; die technischen Details gehören in Diagnostics/Inspector.

Die UI repariert den Zustand nicht selbst.

## 33. Actions-Matrix nach Gebäudeklasse

| Gebäudeklasse | Primäre Information | Primäre Aktion | Weitere Aktion | Destruktiv |
|---|---|---|---|---|
| Rathaus/HQ | zentrale Bestände | Bestände ansehen | spätere Übersicht | nur falls Game Rules erlauben |
| Kleines Wohnhaus | Bewohner | Bewohnerstatus ansehen | Steuer-/Beitragsinfo | Abriss + Bestätigung |
| Mittleres Wohnhaus | Bewohner | Bewohnerstatus ansehen | Steuer-/Beitragsinfo | Abriss + Bestätigung |
| Holzfäller | Produktion + Holz lokal | Pause/Fortsetzen | Arbeitsbereich | Abriss + Bestätigung |
| Steinbruch | Produktion + Stein lokal | Pause/Fortsetzen | Arbeitsbereich | Abriss + Bestätigung |
| Fischer | Produktion + Fisch lokal | Pause/Fortsetzen | Arbeitsbereich | Abriss + Bestätigung |
| Jäger | Produktion + Fleisch/Fell lokal | Pause/Fortsetzen | Arbeitsbereich | Abriss + Bestätigung |
| Baustelle | Material + Builder + Fortschritt | Status ansehen | ggf. Weltfokus auf Lieferung/Builder später | Abbruch/Abriss + Bestätigung |

## 34. Verbindliche S2D-04B-Invarianten

1. Jedes Gebäude zeigt einen klaren Hauptstatus.
2. Der Hauptstatus ist spielerisch priorisiert, nicht technisch zufällig.
3. Informationen stehen vor Aktionen.
4. Normales Warten wird nicht automatisch als Fehler dargestellt.
5. Ein Panel zeigt keine Debug-IDs oder Retry-/A*-Interna.
6. HQ-Bestand enthält nur tatsächlich gelieferte physische Waren.
7. Unterwegs befindliche Waren werden getrennt von verfügbarem HQ-Bestand gezeigt.
8. Lokaler Produktionsoutput bleibt bis Pickup lokaler Bestand.
9. Reservation ist kein zweiter Warenort.
10. Transportierte Ware gehört während des Transports zur Unit und wird nicht doppelt gezählt.
11. Häuser zeigen reale Bewohner, nicht einen unabhängigen Population-Pool.
12. Temporäre Hilfsarbeit ändert in der UI nicht die Resident-Identität.
13. Produktionsgebäude zeigen lokale Outputs.
14. Jäger zeigt Fleisch und Fell getrennt.
15. Pause ist ein primärer sichtbarer Zustand.
16. Fertige lokale Waren bleiben bei pausierter Produktion sichtbar/transportierbar.
17. Arbeitsbereich ist bei unterstützten Gebäuden sichtbar und editierbar.
18. Baustellen unterscheiden Soll, geliefert, unterwegs/reserviert und Restbedarf fachlich korrekt.
19. Ein Builder wird erst nach vollständiger Materiallieferung als notwendiger nächster Engpass behandelt.
20. Baufortschritt wird erst nach real bestätigter Builder-Ankunft dargestellt.
21. Überlieferung wird nicht als normaler UI-Workflow vorausgesetzt.
22. Weltfeedback und Panel lesen dieselbe wirtschaftliche Wahrheit.
23. Ein Gebäudeabriss benötigt Bestätigung.
24. Spielerpanels bieten keine operative Einzel-Unit-Mikrosteuerung.
25. Panel-State besitzt keine zweite Gameplay-Wahrheit.
26. Entfernte Objekte hinterlassen keinen Zombie-Panelzustand.
27. Technische Inkonsistenzen werden nicht durch UI-Patches repariert.
28. Das Standardpanel bleibt auf Smartphone kompakt; Details sind progressiv erweiterbar.

## 35. Bewusst nach S2D-04B noch offen

Noch nicht festgelegt:

- finale Portrait-/Landscape-Strategie,
- exakte Panelhöhen und Snap-Positionen,
- konkrete visuelle Gestaltung,
- finale Icons und Statussymbolsprache,
- Baukategorien und Katalogdetailstruktur,
- vollständige Ressourcen-/Wirtschaftsübersicht,
- Arbeitsbereich-Editor im Detail,
- Tutorial-/Guidance-Sequenzen,
- Start-/New-/Continue-Menüs,
- Einstellungen/Hilfe im Detail,
- Desktop-Hotkeys,
- Accessibility-Details,
- Inspector-UI.

## 36. S2D-04A/B Abschlussstatus

### S2D-04A – Screen Structure, HUD & Primary Mobile Interaction Model

**COMPLETE / 0 BLOCKER**

### S2D-04B – Building Selection, Context Panels & Economy Feedback Model

**COMPLETE / 0 BLOCKER**

S2D-04 bleibt **V0.1 DRAFT** bis die vorgesehenen UI-/Mobile-UX-Teilblöcke geschlossen und gemeinsam eingefroren sind.

Es wurde keine Gameplay- oder UI-Implementierung begonnen.