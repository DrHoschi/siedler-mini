# S2D-04C – Build Catalog, Placement & Work-Area Editing UX

Status: **COMPLETE – Bestandteil von S2D-04 UI / MOBILE UX V0.1 DRAFT**  
Datum: 2026-09-02  
Repository: `DrHoschi/siedler-mini`  
Arbeitsbranch: `feature/s2d-04-ui-mobile-ux`  
Verbindliche Basis: `S2D-00 PROJECT MASTER V0.1 FROZEN` + `S2D-01 GAME DESIGN V0.1 FROZEN` + `S2D-02 UNIT & WORKFORCE MODEL V0.1 FROZEN` + `S2D-03 TECHNICAL ARCHITECTURE V0.1 FROZEN` + `S2D-04A/B COMPLETE`

> Konsolidierungshinweis: Dieser geschlossene Teilblock wird spätestens beim S2D-04 Freeze-Gate in `S2D-04_UI_MOBILE_UX.md` konsolidiert. Er ist kein zusätzliches dauerhaftes UI-Masterdokument.

## 1. Zweck

S2D-04C definiert die mobile Bedienlogik für:

- Baukatalog,
- Gebäudekarten,
- Baukosten und Voraussetzungen,
- Übergang vom Katalog in die Platzierung,
- Platzierungsvorschau,
- gültig/ungültig Feedback,
- Kamerabewegung während der Platzierung,
- explizite Bestätigung oder Abbruch,
- wiederholtes Bauen,
- Arbeitsbereich anzeigen,
- Arbeitsbereich ändern,
- Bestätigung/Abbruch des Arbeitsbereich-Editierens.

Dieser Block definiert weiterhin **keinen UI-Code** und keine finalen Pixel-, Farb-, Icon- oder Layoutwerte.

## 2. Zentrale Bedienregel

> **Bauen und Arbeitsbereich-Editieren sind explizite, sichtbare Werkzeugmodi mit klarer Vorschau, klarer Gültigkeit und klarer Bestätigung.**

Der Spieler muss jederzeit erkennen können:

- welches Werkzeug aktiv ist,
- welches Gebäude bzw. welcher Arbeitsbereich bearbeitet wird,
- was eine Berührung der Welt gerade bewirkt,
- ob die aktuelle Position gültig ist,
- wie bestätigt wird,
- wie ohne Änderung abgebrochen wird.

Nicht zulässig ist ein verdeckter Modus, in dem ein normaler Tap plötzlich eine irreversible Aktion ausführt.

## 3. Baukatalog – Zielbild

Der Baukatalog ist auf Smartphone ein temporärer Auswahlbereich, bevorzugt als Bottom Sheet oder vergleichbares kompaktes Panel.

Er soll:

- die Welt weiterhin teilweise sichtbar lassen,
- nicht dauerhaft offen bleiben,
- schnell geöffnet und geschlossen werden können,
- mit wenigen Taps zum gewünschten Gebäude führen,
- Gebäudename, Funktion und Baukosten verständlich darstellen,
- gesperrte oder aktuell nicht baubare Gebäude klar unterscheiden.

Er ist kein vollständiges Wirtschaftshandbuch und kein technischer Definition-Browser.

## 4. Baukatalog – Informationshierarchie

### 4.1 Katalogkopf

Der Kopf enthält mindestens:

- Titel `Bauen`,
- Schließen/Zurück,
- gegebenenfalls aktive Kategorie.

### 4.2 Gebäudekarte

Jedes Gebäude wird über eine kompakte Karte dargestellt.

Mindestens sichtbar:

- Gebäude-Icon/Sprite-Vorschau,
- verständlicher Name,
- kurze Funktion,
- relevante Baukosten,
- Verfügbarkeit/Gesperrt-Zustand.

Beispiele:

- `Kleines Wohnhaus – schafft Wohnraum`
- `Holzfällerhütte – produziert Holz`
- `Steinbruch – produziert Stein`
- `Fischerhütte – produziert Fisch`
- `Jägerhütte – produziert Fleisch und Fell`

Die Texte sind Spielerinformation und dürfen später sprachlich verfeinert werden.

## 5. Kategorien

Der erste Wirtschaftskern ist klein. Deshalb darf der Katalog zunächst sehr wenige Kategorien verwenden.

Zielregel:

> **Nur so viele Kategorien wie nötig; keine künstliche Menüverschachtelung für sieben aktive Gebäude.**

Sinnvolle fachliche Gruppierung für NOW:

- **Wohnen** – kleines und mittleres Wohnhaus,
- **Produktion** – Holzfäller, Steinbruch, Fischer, Jäger.

Das Rathaus/HQ ist Startgebäude und wird im normalen Baukatalog des ersten Kerns nicht als regulär erneut platzierbares Gebäude vorausgesetzt.

Ob später zusätzliche Kategorien wie Lager, Wege, Militär oder Spezialgebäude entstehen, gehört in spätere Content-/UI-Ausbaustufen.

## 6. Verfügbarkeit im Katalog

Ein Gebäude kann konzeptionell folgende UI-Zustände haben:

### AVAILABLE

Gebäude darf grundsätzlich gebaut werden.

### INSUFFICIENT_RESOURCES

Gebäude ist grundsätzlich verfügbar, aber aktuell fehlen Bauressourcen.

Die Karte bleibt verständlich sichtbar und zeigt fehlende Kosten, statt vollständig zu verschwinden.

### LOCKED

Gebäude ist durch spätere Progression/Regel noch nicht freigeschaltet.

Im aktuellen Sandbox-Kern wird keine unnötige komplexe Unlock-Kette vorausgesetzt.

### NOT_APPLICABLE / HIDDEN

Nur für Inhalte, die in diesem Spielmodus nicht existieren sollen.

Nicht jedes zukünftige Gebäude muss schon als graues Platzhalterobjekt sichtbar sein.

## 7. Baukostenanzeige

Baukosten werden direkt auf der Gebäudekarte oder in einer unmittelbar erreichbaren Detailzeile gezeigt.

NOW mindestens physische Bauwaren wie:

- Holz,
- Stein.

Regeln:

- vorhandene und benötigte Menge müssen unterscheidbar sein,
- fehlende Ware wird klar markiert,
- Baukosten sind keine bereits gelieferte Baustellenmenge,
- Kataloganzeige darf keine Waren reservieren oder verbrauchen,
- tatsächliche wirtschaftliche Mutation erfolgt erst über den fachlichen Placement-/Construction-Vertrag.

## 8. Auswahl eines Gebäudes

Tap auf eine verfügbare Gebäudekarte:

1. wählt genau dieses Gebäude,
2. reduziert/schließt den Katalog,
3. aktiviert `BUILD PLACEMENT`,
4. erzeugt eine reine Vorschau in der Welt,
5. verbraucht noch keine Ressourcen,
6. erzeugt noch keine Baustelle.

Ein zweiter Tap auf dieselbe Karte ist für die Grundlogik nicht erforderlich.

## 9. Platzierungsvorschau – Darstellung

Die Vorschau zeigt mindestens:

- Gebäude-Silhouette/Sprite oder vereinfachte Form,
- exakten Footprint,
- Position auf dem Kartenraster/Weltbereich,
- gültig/ungültig Zustand,
- relevante Zugangsseite bzw. Entrance/Interaktionspunkt, sofern für Platzierung und spätere Erreichbarkeit wichtig.

Die Vorschau ist rein visuell und besitzt keinen produktiven Building-State.

## 10. Gültig / Ungültig Feedback

Die Platzierung muss ohne Textstudium unmittelbar grob erkennbar sein.

Mindestens zwei klar unterscheidbare Zustände:

### VALID

Die Position erfüllt die aktuell bekannten Platzierungsregeln.

### INVALID

Die Position kann nicht bestätigt werden.

Zusätzlich zeigt die UI bei INVALID nach Möglichkeit einen kurzen spielerischen Grund.

Geeignete Gründe können sein:

- `Platz belegt`,
- `Außerhalb der Karte`,
- `Gelände ungeeignet`,
- `Zugang blockiert`,
- `Nicht erreichbar`, sofern dies bereits beim Placement fachlich geprüft wird,
- `Nicht genug Ressourcen`, falls die Kostenbedingung beim finalen Placement erforderlich ist.

Keine technischen Meldungen wie Kollisionsmasken-, Grid- oder Navigation-Interna.

## 11. Gültigkeitsprüfung und Architektur

Die UI berechnet die endgültige fachliche Gültigkeit nicht als zweite Wahrheit.

Zielablauf:

`UI Preview Position -> Placement Query/Validation -> fachlicher Owner antwortet VALID/INVALID + Reason -> UI stellt Ergebnis dar`

Bei finaler Bestätigung wird erneut validiert.

Damit gilt:

> **Eine vorher grüne Vorschau ist keine Garantie, wenn sich die Welt zwischen Vorschau und Bestätigung geändert hat.**

Der bestätigende Owner darf die Platzierung ablehnen und die UI zeigt dann den aktuellen Grund.

## 12. Positionieren auf Smartphone

Die Gebäudeposition kann verändert werden, ohne sofort zu bauen.

Zulässiges Zielmodell:

- Tap auf Welt setzt/verschiebt die Vorschauposition,
- oder Drag der Vorschau verschiebt sie,
- oder eine Kombination aus beiden, sofern eindeutig.

Verbindlich ist nicht die konkrete Gestenvariante, sondern:

- Position ändern != bestätigen,
- Kamera bewegen != Position bestätigen,
- Vorschau bleibt sichtbar,
- aktuelle Gültigkeit aktualisiert sich nach Positionsänderung.

## 13. Kamera während der Platzierung

Der Spieler muss weiterhin:

- pannen,
- zoomen,
- einen anderen Kartenausschnitt erreichen

können.

Zwei-Finger-Pinch bleibt Zoom.

Kamerapan und Vorschauverschiebung müssen so getrennt sein, dass ein Karten-Drag nicht versehentlich das Gebäude setzt.

Eine mögliche spätere konkrete Lösung ist:

- Drag auf freie Welt -> Kamera,
- Drag direkt an Vorschau -> Vorschau bewegen.

Diese konkrete Zuordnung bleibt bis zur Implementierungs-/Interaction-Detailrunde anpassbar; die Eindeutigkeit ist verbindlich.

## 14. Bestätigungsleiste im Placement-Modus

Während `BUILD PLACEMENT` existiert ein dauerhaft erkennbarer Werkzeugbereich mit mindestens:

- aktuellem Gebäudenamen,
- `Bestätigen`,
- `Abbrechen`.

`Bestätigen` ist nur möglich, wenn die aktuelle fachliche Validierung dies zulässt.

Bei ungültiger Position bleibt die Aktion deaktiviert oder führt zu einer klaren Ablehnung ohne State-Mutation.

## 15. Finale Bestätigung

Bestätigen löst einen fachlichen Placement-Command aus.

Nur nach erfolgreicher Owner-Antwort:

- entsteht die Baustelle,
- werden erforderliche fachliche Startzustände erzeugt,
- wechselt die Welt in den bestätigten Zustand.

Die UI darf nicht optimistisch dauerhaft eine Baustelle zeichnen, bevor der Owner die Platzierung akzeptiert hat.

## 16. Abbruch

`Abbrechen`:

- beendet den Placement-Modus,
- entfernt die Vorschau,
- erzeugt keine Baustelle,
- verbraucht/reserviert keine Bauwaren,
- kehrt zu NORMAL oder zum Baukatalog zurück, abhängig vom später festgelegten Navigationsdetail.

Die Rückkehrlogik darf komfortabel sein, aber der wirtschaftliche Zustand bleibt unverändert.

## 17. Wiederholtes Bauen

Für häufiges Setzen desselben Gebäudes kann später ein `Mehrfach bauen`-/`Weiter platzieren`-Komfort vorgesehen werden.

Für den NOW-Kern gilt:

- Standardmäßig endet ein erfolgreicher Placement-Vorgang nach einer Platzierung,
- erneutes Bauen wird bewusst erneut gestartet,
- keine unbeabsichtigte Serienplatzierung durch weitere Taps.

Eine spätere Mehrfachplatzierung muss explizit als aktiver Zustand erkennbar sein.

## 18. Ressourcenmangel zwischen Vorschau und Bestätigung

Da andere Abläufe Ressourcen verändern können, wird beim finalen Command erneut geprüft.

Wenn Ressourcen zwischenzeitlich nicht mehr ausreichen:

- keine Baustelle entsteht,
- UI meldet verständlich `Nicht genug Holz/Stein`,
- Vorschau kann bestehen bleiben oder der Spieler kann abbrechen,
- kein negativer Bestand und kein halbfertiger Placement-State entsteht.

## 19. Platzierung und Zugang

Gebäude, die reale Units benötigen, müssen einen gültigen Interaktions-/Zugangspunkt besitzen.

Die Vorschau soll diesen, sofern für den Spieler hilfreich, sichtbar machen.

Ziel ist, problematische Platzierungen früh verständlich zu machen.

Die UI darf aber Navigation nicht selbst besitzen oder A* berechnen.

Sie verwendet die Placement-/Navigation-Validierung der Zielarchitektur aus S2D-03.

## 20. Platzierung und Baustellenlogik

Nach erfolgreicher Platzierung entsteht fachlich eine Baustelle.

Danach greift S2D-04B:

- Materialbedarf wird im Baustellenpanel sichtbar,
- Transport liefert reale Waren,
- vollständiges Material führt noch nicht automatisch zu Baufortschritt,
- erst real angekommener Builder erlaubt BUILDING.

S2D-04C darf diesen Ablauf nicht durch Placement-Komfort abkürzen.

## 21. Arbeitsbereich – Zielmodell

Produktionsgebäude mit Arbeitsbereich benötigen eine einfache mobile Möglichkeit, den Bereich anzusehen und zu ändern.

Betroffen im aktuellen Kern:

- Holzfällerhütte,
- Steinbruch,
- Fischerhütte,
- Jägerhütte.

Der Arbeitsbereich bestimmt, in welchem räumlichen Bereich das Produktionssystem geeignete Ziele suchen darf.

Der UI-Editor besitzt den Bereich nicht als zweite Wahrheit.

## 22. Arbeitsbereich anzeigen

Im Gebäude-Context Panel existiert `Arbeitsbereich anzeigen/ändern`.

Beim Öffnen:

- das Gebäude bleibt eindeutig markiert,
- der aktuell autoritative Arbeitsbereich wird als Overlay in der Welt dargestellt,
- ungefähre Reichweite/Fläche ist klar erkennbar,
- relevante Weltobjekte bleiben sichtbar.

Die normale Welt wird nicht vollständig von einem Editorbildschirm ersetzt.

## 23. WORK AREA EDIT – Modus

Beim Ändern wird `WORK AREA EDIT` aktiviert.

Der Modus zeigt mindestens:

- welches Gebäude bearbeitet wird,
- aktuellen bzw. vorgeschlagenen Arbeitsbereich,
- `Bestätigen`,
- `Abbrechen`.

Die bisherige autoritative WorkArea bleibt bis zur bestätigten Änderung unverändert.

## 24. Bearbeitungsprinzip

Für den ersten Kern soll der Editor möglichst einfach bleiben.

Bevorzugtes Modell:

- Arbeitsbereich als klar sichtbare Zone/Radius/Fläche,
- Mittelpunkt oder Bereich kann per Touch in der Welt verschoben werden,
- Größe bleibt zunächst durch Gebäude/Definition vorgegeben, sofern das bestehende Gameplay dies so vorsieht.

S2D-04C führt ausdrücklich **keinen komplexen Polygon-/Pinsel-Editor** ein.

Falls die bestehende Fachlogik bereits eine andere einfache Form benutzt, kann sie beibehalten werden, solange die UX-Regeln erfüllt werden.

## 25. WorkArea-Vorschau

Während des Editierens zeigt die Welt:

- bisherige bzw. neue Zone klar unterscheidbar,
- Gebäude als Bezugspunkt,
- relevante Ziele im Bereich,
- optional eine einfache Rückmeldung, ob geeignete Ziele vorhanden sind.

Beispiele:

- Holzfäller: geeignete Bäume/Ressourcen,
- Steinbruch: geeignete Steine,
- Fischer: geeignete Fisch-/Arbeitsziele,
- Jäger: aktuell relevante Tiere/Zielraum.

Die UI muss keine zukünftige Produktion garantieren, nur den aktuellen räumlichen Bezug verständlich machen.

## 26. Gültigkeit des Arbeitsbereichs

Ein vorgeschlagener Bereich kann mindestens sein:

### VALID

Fachlich zulässige WorkArea-Konfiguration.

### VALID_BUT_EMPTY

Zulässig, aber aktuell kein geeignetes Ziel im Bereich.

Dies ist **kein technischer Fehler** und darf bestätigt werden, sofern die Game Rules es zulassen.

Die UI warnt verständlich, z. B.:

`Aktuell keine geeigneten Ziele in diesem Bereich.`

### INVALID

Bereich kann fachlich nicht verwendet werden.

Der genaue Satz möglicher Invalid-Gründe hängt von der WorkArea-Domain ab und wird nicht von der UI erfunden.

## 27. Bestätigen des Arbeitsbereichs

Bestätigen sendet einen WorkArea-Command an den autoritativen Owner.

Nur nach erfolgreicher Antwort:

- wird der neue Bereich produktiv,
- Overlay wechselt auf den bestätigten Zustand,
- Production/Jobs reagieren über normale Runtime-Verträge.

Die UI darf keine laufenden Jobs direkt löschen oder neu erzeugen.

Wie bestehende Jobs bei einer WorkArea-Änderung fachlich behandelt werden, gehört zur Runtime-Implementierung gemäß S2D-03/S2D-02 und nicht in die UI-Patchlogik.

## 28. Abbruch des Arbeitsbereich-Edits

Abbrechen:

- verwirft nur die UI-Vorschau,
- lässt die bisherige WorkArea unverändert,
- beendet WORK AREA EDIT,
- kehrt zum Gebäude-Context zurück.

Keine halbe WorkArea-Änderung darf im Runtime-State verbleiben.

## 29. Kamera im WorkArea-Modus

Pan und Zoom bleiben verfügbar.

Das Bearbeiten des Bereichs und das Pannen der Kamera müssen eindeutig getrennt sein.

Der Spieler darf nicht gezwungen sein, den Editor zu verlassen, nur um den relevanten Zielbereich in den sichtbaren Ausschnitt zu bringen.

## 30. Pause und WorkArea-Edit

Ein pausiertes Produktionsgebäude darf seinen Arbeitsbereich weiterhin anzeigen und – sofern fachlich erlaubt – ändern.

Das Ändern des Arbeitsbereichs startet die Produktion nicht automatisch wieder.

Pause bleibt eigener Owner-State und wird nicht durch UI-Edit überschrieben.

## 31. Keine automatische Problemlösung

Wenn ein Gebäude `Kein geeignetes Ziel im Arbeitsbereich` meldet, darf der Spieler den Bereich ändern.

Die UI darf aber nicht selbst:

- automatisch den besten Bereich suchen und ohne Bestätigung setzen,
- Ressourcen/Tiere verschieben,
- Navigation manipulieren,
- Worker teleportieren,
- Jobs direkt patchen.

Ein späterer optionaler Vorschlagsmechanismus wäre eine eigene Produktentscheidung und nicht Teil von S2D-04C.

## 32. Baukatalog und Guidance

Guidance darf beim ersten Bauvorgang beispielsweise:

- den Bauen-Button hervorheben,
- eine Gebäudekarte erklären,
- auf gültig/ungültig Vorschau hinweisen,
- Bestätigen/Abbrechen erklären.

Guidance darf keine Platzierung durchführen oder Kosten umgehen.

## 33. Mobile Fehlbedienungsschutz

Verbindlich:

- Baukarte wählen erzeugt nur Vorschau, noch keine Baustelle,
- Kartentap setzt nicht unmittelbar irreversibel,
- Pinch bestätigt nichts,
- Pan bestätigt nichts,
- Abbruch ist jederzeit erreichbar,
- destruktive/irreversible Aktion benötigt explizite Bestätigung,
- deaktivierte Bestätigung hat klaren Grund,
- Wechsel in Systemmenü oder App-Hintergrund darf keinen halb bestätigten Placement-Command erzeugen.

Wie ein offener reiner UI-Vorschauzustand bei App-Unterbrechung behandelt wird, kann technisch später als UI-State entschieden werden; er wird nicht in SaveGame als Baustelle gespeichert.

## 34. Desktop-/Tablet-Erweiterung

Tablet/Desktop dürfen:

- breiteren Katalog,
- mehr Gebäudekarten gleichzeitig,
- Hover-Zusatzinfo auf Desktop,
- Mausposition als direkte Preview-Position,
- Hotkey für Bestätigen/Abbrechen

anbieten.

Aber dieselben fachlichen Schritte bleiben erhalten:

`Auswählen -> Vorschau -> Validieren -> Bestätigen -> Owner akzeptiert -> Baustelle`

und:

`WorkArea anzeigen -> Vorschau ändern -> Validieren -> Bestätigen -> Owner übernimmt`.

## 35. Verbindliche S2D-04C-Invarianten

1. Baukatalog ist temporär und smartphone-tauglich.
2. Der aktuelle Kern benötigt keine unnötig tiefe Kategoriehierarchie.
3. Gebäudekarten zeigen Name, Funktion, Kosten und Verfügbarkeit.
4. Kostenanzeige reserviert oder verbraucht keine Ware.
5. Gebäudewahl erzeugt nur eine Vorschau.
6. Vorschau ist kein Building-/Construction-State.
7. Platzierung besitzt klaren VALID/INVALID-Zustand.
8. Invalid-Gründe werden spielerverständlich dargestellt.
9. UI ist nicht autoritativer Placement-Validator.
10. Finale Bestätigung validiert erneut beim Owner.
11. Positionieren und Bestätigen sind getrennte Aktionen.
12. Kamera kann während Placement weiter bewegt/gezoomt werden.
13. Kameraaktionen dürfen Placement nicht bestätigen.
14. Placement besitzt sichtbares Bestätigen und Abbrechen.
15. Abbruch erzeugt keine Baustelle und verbraucht keine Ressourcen.
16. Ressourcenmangel bei finaler Bestätigung darf keinen negativen/halbfertigen State erzeugen.
17. Standardmäßig endet Placement nach einem erfolgreichen Bauvorgang.
18. Mehrfachbauen wäre später ein expliziter Modus.
19. Gebäudezugang darf in der Vorschau sichtbar gemacht werden.
20. UI besitzt Navigation/Reachability nicht selbst.
21. Erfolgreiches Placement endet in normaler Construction-Logik, nicht in Sofortbau.
22. Arbeitsbereiche werden über einen eigenen sichtbaren Editiermodus geändert.
23. WorkArea-Overlay liest autoritativen Owner-State.
24. UI-Vorschau verändert die produktive WorkArea noch nicht.
25. WORK AREA EDIT besitzt Bestätigen und Abbrechen.
26. Ein zulässiger, aber aktuell leerer Arbeitsbereich ist von INVALID zu unterscheiden.
27. WorkArea-Bestätigung erfolgt über den Owner-Vertrag.
28. UI löscht/erzeugt bei WorkArea-Änderung keine Jobs direkt.
29. Abbruch lässt die bisherige WorkArea unverändert.
30. Kamera bleibt auch im WorkArea-Modus bedienbar.
31. WorkArea-Änderung hebt Pause nicht automatisch auf.
32. UI löst Engpässe nicht automatisch durch versteckte Gameplay-Mutation.
33. Reine Placement-/WorkArea-Vorschauen sind kein SaveGame-Gameplay-State.
34. Tablet/Desktop ändern Komfort, nicht fachlichen Ablauf.

## 36. Bewusst noch offen

S2D-04C legt noch nicht fest:

- finale Portrait-/Landscape-Strategie,
- exakte Kataloghöhe/-breite,
- genaue Zahl sichtbarer Karten pro Reihe,
- finale Icons,
- konkrete Farben für VALID/INVALID,
- konkrete Touch-Schwellen,
- finale Geste zum Verschieben der Placement-Vorschau,
- finale WorkArea-Form/Radiuswerte,
- eventuelle spätere Größenänderung eines WorkAreas,
- UI-Sound/Haptik,
- vollständige Wirtschaftsübersicht,
- Tutorialtexte,
- Accessibility-Details.

## 37. Abschluss

S2D-04C – Build Catalog, Placement & Work-Area Editing UX ist **COMPLETE**.

Ergebnis:

- Baukatalog-Grundmodell definiert,
- NOW-Kategorien begrenzt,
- Gebäudekarten und Kostenanzeige definiert,
- Placement-Vorschau von produktivem State getrennt,
- VALID/INVALID-Feedback definiert,
- mobile Kamera-/Placement-Trennung festgelegt,
- explizites Bestätigen/Abbrechen festgelegt,
- Ressourcenänderungen ausschließlich beim fachlichen Owner belassen,
- WorkArea-Anzeige und -Editiermodus definiert,
- VALID_BUT_EMPTY vom echten INVALID getrennt,
- WorkArea-Bestätigung/Abbruch owner-konform festgelegt,
- keine UI- oder Gameplay-Implementierung begonnen.

**Open Blockers: 0**