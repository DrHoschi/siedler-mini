# S2D-04D – Resource Overview, Economy Summary & Settlement Status UX

Status: **COMPLETE – Bestandteil von S2D-04 UI / MOBILE UX V0.1 DRAFT**  
Datum: 2026-09-02  
Repository: `DrHoschi/siedler-mini`  
Arbeitsbranch: `feature/s2d-04-ui-mobile-ux`  
Verbindliche Basis: `S2D-00 PROJECT MASTER V0.1 FROZEN` + `S2D-01 GAME DESIGN V0.1 FROZEN` + `S2D-02 UNIT & WORKFORCE MODEL V0.1 FROZEN` + `S2D-03 TECHNICAL ARCHITECTURE V0.1 FROZEN` + `S2D-04A/B/C COMPLETE`

> Konsolidierungshinweis: Dieser Teilblock wird beim S2D-04 Freeze-Gate in `S2D-04_UI_MOBILE_UX.md` konsolidiert. Er ist kein dauerhaftes zweites UI-Masterdokument.

## 1. Zweck

S2D-04D definiert die siedlungsweite Spielerübersicht für Ressourcen, Wirtschaft, Bevölkerung, Wohnraum, Produktion und zentrale Engpässe.

Ziel ist ausdrücklich **kein komplexes Management-Dashboard**.

Die Übersicht soll dem Spieler schnell beantworten:

- Was haben wir aktuell wirklich verfügbar?
- Was liegt noch lokal in Produktionsgebäuden?
- Was ist gerade unterwegs?
- Welche Waren fehlen oder stauen sich?
- Wie viele reale Bewohner hat die Siedlung?
- Wie steht es um Wohnraum und Arbeitskräfte?
- Welche Produktionsbereiche arbeiten oder warten?
- Wo liegt aktuell der wichtigste siedlungsweite Engpass?

## 2. Zentrale UX-Regel

> **Die Wirtschaftsübersicht verdichtet die reale Siedlung – sie ersetzt sie nicht.**

Die Welt bleibt primärer Ort des Verstehens. Die Übersicht fasst zusammen, was in der Welt und den Owner-Systemen bereits real existiert.

Sie darf:

- Zustände aggregieren,
- Mengen gruppieren,
- Engpässe zusammenfassen,
- zu relevanten Gebäuden oder Weltpositionen springen.

Sie darf nicht:

- Waren erzeugen oder verschieben,
- Jobs direkt umpriorisieren,
- Units manuell zuweisen,
- versteckte zweite Bestände führen,
- technische Runtime-Interna anzeigen.

## 3. Zugang

Die Übersicht ist aus dem normalen Spielscreen schnell erreichbar.

Der konkrete Button/Icon wird später festgelegt.

Auf Smartphone öffnet sie als eigenes Overlay bzw. großes Bottom Sheet/Full-Height-Panel mit klarer Rückkehr zur Welt.

Sie bleibt sekundäre Analyseebene und ist nicht dauerhaft offen.

## 4. Informationshierarchie

Die Übersicht besteht aus vier klaren Bereichen:

1. **Ressourcen & Waren**
2. **Bevölkerung & Wohnraum**
3. **Produktion & Logistik**
4. **Siedlungsstatus & Engpässe**

Diese vier Bereiche dürfen als Tabs, Segmente oder vertikale Abschnitte umgesetzt werden. Die exakte visuelle Navigation bleibt offen.

## 5. Ressourcen & Waren

Für jede physische Kernware wird mindestens angezeigt:

- Holz,
- Stein,
- Fisch,
- Fleisch,
- Fell.

Gold wird separat als nicht-physischer Wirtschaftswert geführt.

Bevölkerung ist ebenfalls keine Ware und erscheint nicht in dieser Warenliste.

## 6. Verbindliche Warenzustände

Die Übersicht verwendet dieselben Begriffe wie S2D-04B.

### Verfügbar

Ware liegt im HQ bzw. später in einem gültigen zentral nutzbaren Lager.

### Lokal

Ware liegt physisch in einem Produktionsgebäude oder ist bereits als Baustellenmaterial am Ziel angekommen.

### Reserviert

Ware ist einem Bedarf zugeordnet, bleibt aber an ihrem physischen Ort.

### Unterwegs

Ware wird von einer realen Unit getragen.

Zentrale Regel:

> **Keine dieser Kategorien darf dieselbe physische Einheit doppelt zählen.**

## 7. Warenzeile / Warenkarte

Eine Warenart zeigt mindestens:

- Name/Icon,
- verfügbar,
- lokal,
- unterwegs.

Reserviert kann zusätzlich angezeigt werden, wenn dies für das Verständnis hilft, muss aber visuell klar als Zuordnung und nicht als zusätzlicher Bestand gekennzeichnet sein.

Beispiel:

`Holz  | Verfügbar 12 | Lokal 4 | Unterwegs 2`

Optional erweiterbar:

`Davon reserviert: 3`

Die Übersicht darf daraus eine Gesamtsumme ableiten, wenn eindeutig erklärt ist, dass dies eine Verteilung derselben realen Warenwelt ist.

## 8. Keine falsche Gesamtverfügbarkeit

Eine Summe wie `Gesamt Holz = 18` darf nicht suggerieren, dass alle 18 sofort als Bauressource im HQ nutzbar sind.

Für Entscheidungen über sofort verfügbare Bau-/Lagerressourcen ist ausschließlich `Verfügbar` maßgeblich.

Lokal oder unterwegs sind wirtschaftlich vorhanden, aber noch nicht zentral verfügbar.

## 9. Detailansicht einer Ware

Bei Tap auf eine Ware darf eine kompakte Detailansicht erscheinen.

Sie kann zeigen:

- in welchen Gebäuden lokale Mengen liegen,
- wie viel aktuell transportiert wird,
- ob relevante Baustellen Bedarf haben,
- ob ein auffälliger Transportstau besteht.

Optional kann ein Eintrag `In Welt anzeigen` / `Gebäude anzeigen` anbieten.

Diese Navigation wählt/fokussiert nur bestehende Objekte und verändert keinen Gameplay-State.

## 10. Gold

Gold wird separat dargestellt.

NOW relevant:

- aktueller Goldbestand,
- verständlicher Hinweis, dass Wohnhäuser/Bewohner Gold erzeugen.

Der historische Testwert `1 Gold/Bewohner/10s` wird nicht als finales Balancing festgeschrieben.

Spätere Einnahmen-/Ausgabenaufschlüsselung bleibt offen.

## 11. Bevölkerung

Bevölkerung ist ein abgeleiteter Wert aus real existierenden Bewohner-Units.

Die Übersicht zeigt mindestens:

- Gesamtbevölkerung.

Optional und sinnvoll für den NOW-Kern:

- frei/verfügbar,
- aktuell in Arbeit,
- unterwegs/auf Aufgabe,
- ohne gültige Home-Bindung, falls dieser Zustand fachlich existiert und spielerisch relevant wird.

Keine Zahl darf aus einem unabhängigen Population-Resource-Counter stammen.

## 12. Wohnraum

Wohnraum wird aus realen Wohngebäuden und ihren gültigen Kapazitäten abgeleitet.

Mindestens:

- vorhandene Wohnplätze,
- belegte Wohnplätze,
- freie Wohnplätze.

Kleines Wohnhaus und mittleres Wohnhaus werden bei Bedarf getrennt zusammengefasst.

Die Anzeige soll dem Spieler helfen, Wohnraummangel zu erkennen, ohne einzelne Bewohner manuell verteilen zu müssen.

## 13. Workforce-Zusammenfassung

Die Übersicht darf eine einfache Workforce-Zusammenfassung zeigen:

- freie Personen,
- beschäftigte Personen,
- Personen mit aktiver Aufgabe,
- spezialisierte Arbeitskräfte nach Bedarf in grober Form.

Nicht vorgesehen:

- komplette interne Assignment-Listen,
- Job IDs,
- Retry-/Backoff-Zustände,
- manuelle Einzelzuweisung.

Spezialisierung und aktuelle Aufgabe bleiben getrennte Begriffe.

## 14. Produktion – Gesamtübersicht

Die Produktionsübersicht fasst die aktiven Produktionsgebäude zusammen.

Mindestens für:

- Holzfäller,
- Steinbruch,
- Fischer,
- Jäger.

Pro Gebäudetyp kann gezeigt werden:

- Anzahl insgesamt,
- Anzahl arbeitet,
- Anzahl pausiert,
- Anzahl wartet/blockiert,
- lokaler Output dieses Typs.

Beispiel:

`Holzfäller: 3 | 2 arbeiten | 1 wartet | 5 Holz lokal`

## 15. Produktionsstatus gruppieren statt Rohdaten

Die Übersicht soll keine Liste aller internen Zustände erzeugen.

Gruppierung bevorzugt:

- arbeitet,
- pausiert,
- wartet auf Arbeiter,
- kein geeignetes Ziel/Rohstoff,
- Ausgang voll/Transportstau.

Mehr Detail erhält der Spieler erst beim Öffnen/Fokussieren eines konkreten Gebäudes.

## 16. Logistik-Zusammenfassung

Die Logistikübersicht soll nur verständliche operative Lage zeigen.

Sinnvolle NOW-Kennzahlen:

- Waren unterwegs,
- Waren warten auf Abholung,
- Baustellenmaterial unterwegs,
- auffällige Transportstaus,
- optional Zahl freier/aktiver Transportkräfte, sofern spielerisch verständlich.

Nicht anzeigen:

- A*-Call-Zahlen,
- Cache-Hits,
- JobEngine-Queues,
- interne Reservation-IDs.

Diese technischen Daten gehören in Inspector/Diagnostics.

## 17. Baustellen – siedlungsweite Zusammenfassung

Die Übersicht zeigt eine kompakte Baustellenlage.

Mindestens:

- Anzahl aktiver Baustellen,
- Baustellen warten auf Material,
- Baustellen mit Material komplett und warten auf Bauarbeiter,
- Bauarbeiter unterwegs,
- Baustellen im Bau.

Materialmangel kann optional pro Ware zusammengefasst werden.

Beispiel:

`2 Baustellen warten auf Holz`

Dabei muss die Restbedarfsregel berücksichtigt werden:

`Soll - geliefert - gültig reserviert/unterwegs`

Bereits vollständig reservierte/unterwegs befindliche Mengen dürfen nicht nochmals als offener Bedarf zählen.

## 18. Siedlungsweiter Engpassbereich

Die Übersicht enthält einen kompakten Bereich `Aktuelle Engpässe` bzw. gleichwertig.

Ziel:

- maximal wenige, relevante Hinweise,
- nach spielerischer Bedeutung priorisiert,
- keine technische Warnungsflut.

Beispiele:

- `2 Baustellen warten auf Holz`
- `1 Produktionsgebäude wartet auf Arbeiter`
- `3 Warenstapel warten lange auf Abholung`
- `Kein freier Wohnraum`
- `Jäger findet aktuell kein geeignetes Tier im Arbeitsbereich`

## 19. Engpass-Priorisierung

Siedlungsweite Hinweise werden nach Wirkung priorisiert.

Konzeptionell:

1. blockiert Expansion/Bau,
2. blockiert mehrere Produktionsketten,
3. personeller Engpass,
4. logistischer Stau,
5. lokaler Einzelengpass,
6. neutrale Beobachtung.

Die exakte Gewichtung bleibt Implementierungs-/Balancingdetail.

Wichtig ist nur:

> **Die Übersicht zeigt nicht automatisch alles, was technisch nicht ideal ist, sondern das, was der Spieler sinnvoll verstehen und beeinflussen kann.**

## 20. Keine roten Warnungen für normales Verhalten

Normale Übergänge sind keine Fehler.

Nicht als Problem markieren:

- Ware ist kurzzeitig unterwegs,
- Arbeiter läuft zur Arbeit,
- Bauarbeiter ist unterwegs,
- Produktion wartet kurz auf Zyklusbeginn,
- Tier befindet sich gerade außerhalb eines Jägerbereichs, solange dies normaler Weltzustand ist.

Warnstatus entsteht erst bei einem echten spielerischen Engpass oder einer fachlich relevanten Blockierung.

## 21. Von Übersicht zur Welt

Ein Engpass- oder Gebäudegruppen-Eintrag darf `Anzeigen` / `In Welt zeigen` anbieten.

Verhalten:

- Übersicht schließt/reduziert sich,
- Kamera fokussiert relevanten Bereich oder das erste relevante Objekt,
- Objekt kann direkt selektiert werden,
- normales Context Panel aus S2D-04B übernimmt danach.

Die Wirtschaftsübersicht selbst braucht deshalb keine komplette Gebäude-Detailsteuerung.

## 22. Keine Management-Dashboard-Ausweitung

Für den NOW-Kern ausdrücklich nicht vorgesehen:

- frei konfigurierbare Diagramm-Dashboards,
- historische Produktionskurven,
- komplexe Sankey-/Flow-Diagramme,
- Tabellen mit allen Units,
- manuelle Job-Repriorisierung,
- globale Carrier-Routenplanung,
- Produktionsquoten pro Minute als Pflichtansicht,
- Excel-artige Filter-/Sortiermechanik,
- technische Performance-Metriken.

Spätere Analysefunktionen können bei echtem Bedarf ergänzt werden.

## 23. Smartphone-Darstellung

Auf Smartphone gilt:

- kompakte Zusammenfassung zuerst,
- Details progressiv aufklappbar,
- keine zu breite Tabelle,
- horizontales Scrollen für Kerninformationen möglichst vermeiden,
- Warenarten als Karten/Zeilen mit klarer vertikaler Struktur,
- Engpässe ganz oben oder direkt nach der Hauptzusammenfassung,
- Rückkehr zur Welt jederzeit klar erreichbar.

## 24. Tablet/Desktop

Tablet/Desktop dürfen mehr Informationen gleichzeitig zeigen.

Möglich:

- Ressourcen und Produktion nebeneinander,
- breitere Zusammenfassung,
- direkter Sprung zwischen Gruppen.

Die zugrunde liegenden Daten und Begriffe bleiben identisch.

## 25. Aktualisierung

Die Übersicht liest öffentliche Owner-Read-Models/Snapshots und reagiert auf relevante Events.

Sie darf ihre Darstellung aktualisieren, ohne Gameplay zu takten.

Ein geschlossenes Wirtschaftsfenster muss keine hochfrequente Aktualisierung erzwingen.

Die UI-Refresh-Frequenz ist kein Simulations-Timer.

## 26. Save/Continue

Die Wirtschaftsübersicht selbst besitzt keinen persistenzwürdigen Gameplay-State.

Nach Continue liest sie den wiederhergestellten Owner-State neu ein.

Optional persistierbare reine UI-Präferenzen wie zuletzt geöffneter Tab bleiben spätere UX-Entscheidung.

Sie darf keine eigenen Bestände aus dem vorherigen Lauf behalten.

## 27. Technische Fehler

Runtime-Inkonsistenzen aus S2D-03G erscheinen nicht als normale Wirtschaftsengpässe.

Im Spielerbetrieb kann ein neutraler Fehlerhinweis erscheinen.

Technische Details bleiben Inspector/Diagnostics vorbehalten.

Die Übersicht repariert keine Daten.

## 28. Verbindliche S2D-04D-Invarianten

1. Die Wirtschaftsübersicht aggregiert Owner-State, besitzt ihn nicht.
2. Sie bleibt sekundäre Analyseebene und ersetzt die Welt nicht.
3. Physische Waren werden in verfügbar/lokal/reserviert/unterwegs konsistent behandelt.
4. Keine physische Ware wird doppelt gezählt.
5. Verfügbar bedeutet tatsächlich im zentral nutzbaren Lager angekommen.
6. Lokal bedeutet physisch an einem lokalen Owner-Ort vorhanden.
7. Unterwegs bedeutet von einer realen Unit getragen.
8. Reserviert ist keine zusätzliche Ware.
9. Gold bleibt von physischen Waren getrennt.
10. Bevölkerung bleibt von Waren getrennt und wird aus realen Bewohnern abgeleitet.
11. Wohnraum wird aus realen Wohngebäuden/Kapazitäten abgeleitet.
12. Workforce-Zahlen basieren auf realen Units und Assignments.
13. Produktion wird fachlich gruppiert, nicht über technische Zustandslisten erklärt.
14. Logistik zeigt verständliche Lage, keine A*- oder JobEngine-Debugdaten.
15. Baustellenbedarfe berücksichtigen bereits geliefert sowie gültig reserviert/unterwegs.
16. Engpässe werden priorisiert statt ungeordnet gesammelt.
17. Normale Übergänge werden nicht als Fehler dargestellt.
18. Von der Übersicht kann auf relevante Weltobjekte fokussiert werden.
19. Die Übersicht darf keine Jobs, Waren oder Units direkt manipulieren.
20. Kein Einzel-Unit-Mikromanagement wird eingeführt.
21. Keine komplexe Dashboard-Pflichtarchitektur im NOW-Kern.
22. Smartphone erhält kompakte, vertikale und progressive Darstellung.
23. Tablet/Desktop dürfen Komfort erweitern, nicht die Gameplaylogik.
24. UI-Refresh beeinflusst nicht die Simulation.
25. Continue rekonstruiert die Anzeige aus Owner-State; keine zweite gespeicherte Wirtschaftswahrheit.

## 29. Bewusst noch offen

S2D-04D entscheidet noch nicht:

- finales Icon-/Farbsystem,
- exakte Position des Wirtschaftsbuttons,
- konkrete Tab-/Segmentstruktur,
- exakte Panelgrößen,
- historische Trenddiagramme,
- spätere Produktionsstatistiken,
- Lagerprioritäten,
- manuelle Wirtschaftsregeln,
- komplexe Warenflussvisualisierung,
- finales Balancing der Engpassprioritäten,
- Accessibility-Details,
- Inspector-Dashboard.

## 30. Abschluss

S2D-04D – Resource Overview, Economy Summary & Settlement Status UX ist **COMPLETE**.

Ergebnis:

- vollständige Ressourcenübersicht für alle NOW-Waren definiert,
- verfügbar/lokal/reserviert/unterwegs verbindlich getrennt,
- Gold separat eingeordnet,
- Bevölkerung und Wohnraum siedlungsweit definiert,
- Workforce-Zusammenfassung begrenzt,
- Produktions-/Logistik-/Baustellenübersicht festgelegt,
- siedlungsweite Engpasspriorisierung definiert,
- Weltfokus aus der Übersicht vorgesehen,
- Dashboard-/Mikromanagement-Ausweitung ausdrücklich ausgeschlossen,
- Smartphone als Referenz beibehalten,
- keine UI- oder Gameplay-Implementierung begonnen.

**Open Blockers: 0**