# S2D-05F – V1 Specialist Availability & Start Roster

Status: **COMPLETE – Bestandteil von S2D-05 CONTENT CATALOG V0.1 DRAFT**  
Datum: 2026-09-02  
Repository: `DrHoschi/siedler-mini`  
Arbeitsbranch: `feature/s2d-05-content-catalog`  
Verbindliche Basis: S2D-00/01/02/03/04 FROZEN + S2D-05A/B/C/D/E COMPLETE

> Konsolidierungshinweis: Dieser Teilblock wird beim S2D-05-Freeze in `docs/S2D-05_CONTENT_CATALOG.md` übernommen. Er ist kein dauerhaftes zweites Masterdokument.

## 1. Zweck

S2D-05F schließt die bisher offene Bootstrap-Frage des V1-Wirtschaftskerns:

- Welche spezialisierte Workforce steht bei einem neuen Spiel überhaupt zur Verfügung?
- Wie kann der Spieler das erste Wohnhaus bauen, obwohl dafür bereits ein Builder benötigt wird?
- Wie können die vier Produktionsgebäude funktionieren, solange V1 noch kein Ausbildungs-/Umschulungssystem besitzt?
- Welche Rolle spielen neu aus Wohnhäusern entstehende Bewohner?
- Wie bleiben dabei die eingefrorenen Regeln „jede Arbeitskraft ist eine reale Person“ und „jede Person besitzt eine Home-Bindung“ erhalten?

Es werden keine finalen Mengen balanciert und kein Runtime-Code implementiert.

## 2. Gefundener Freeze-Blocker

S2D-05D hatte bewusst offengelassen:

- Anzahl der Start-Carrier,
- Anzahl der Start-Builder,
- Herkunft von Spezialisten,
- mögliche gemischte Spezialisierung neu erzeugter Hausbewohner,
- Ausbildung/Umschulung.

Für einen implementierbaren V1-Kern ist mindestens ein Bootstrap-Vertrag notwendig. Ohne ihn entsteht ein Zirkelschluss:

`kein Wohnhaus -> keine Bewohner -> kein Builder -> kein Wohnhaus kann fertig gebaut werden`

Zusätzlich könnten Produktionsgebäude ohne Fachkräfte dauerhaft unbenutzbar sein.

## 3. Zentrale V1-Bootstrap-Regel

> **Ein neues V1-Spiel startet mit einer kleinen realen Gründergruppe am Rathaus/HQ, die die für den ersten Wirtschaftskern zwingend benötigten Spezialfähigkeiten bereits mitbringt.**

Diese Gründer sind echte Personen der Siedlung:

- stabile Unit-ID,
- reale Position,
- Spezialisierung/Capabilities,
- Availability/Activity,
- keine abstrakten Workforce-Slots.

Sie sind kein separates System neben der Bevölkerung.

## 4. Temporäre Home-Bindung am HQ

Da zu Spielbeginn noch kein Wohnhaus errichtet sein muss, erhält die Gründergruppe eine ausdrücklich begrenzte Bootstrap-Home-Bindung am HQ.

Das HQ dient damit im V1-Startzustand als **temporäre Gründerunterkunft**, nicht als reguläres Wohnhaus.

Verbindlich:

- Gründer zählen zur realen Bevölkerung.
- Ihre Home-Bindung ist gültig und nicht `null`/Zombie-State.
- Das HQ erhält dadurch keine normale Housing-Kapazität für beliebigen späteren Bevölkerungszuwachs.
- Neue Wohnhausbewohner entstehen weiterhin nur aus echten Wohnhäusern.
- Sobald geeigneter regulärer Wohnraum vorhanden ist, dürfen Gründer kontrolliert in Wohnhäuser umgebunden werden.

Die exakte Umsiedlungsreihenfolge bleibt Implementierungs-/UX-Detail; die Personidentität bleibt dabei unverändert.

## 5. Erforderliche Start-Capabilities

Der V1-New-Game-Start muss mindestens gewährleisten, dass folgende Facharbeiten prinzipiell ausführbar sind:

- einfacher spezialisierter Transport,
- Bauen,
- Holzfällen,
- Steinabbau,
- Fischen,
- Jagen.

Daraus folgt eine garantierte Mindestabdeckung der Spezialisierungen/Capabilities:

- mindestens eine reale Person mit Carrier-/Transport-Spezialisierung,
- mindestens eine reale Person mit Builder-Capability,
- mindestens eine reale Person mit Lumberjack-Capability,
- mindestens eine reale Person mit Stonecutter-/Quarry-Capability,
- mindestens eine reale Person mit Fisher-Capability,
- mindestens eine reale Person mit Hunter-Capability.

Die exakten Personenzahlen bleiben **BALANCE**. Mehrere Capabilities auf derselben Person sind grundsätzlich möglich, aber die V1-Baseline soll verständliche sichtbare Spezialisten bevorzugen und keine versteckte „eine Person kann alles“-Abkürzung voraussetzen.

## 6. Carrier-Baseline

Transport ist der verbindende Engpass praktisch aller Warenflüsse.

Darum gilt:

- mindestens ein echter Carrier muss zum Start verfügbar sein,
- zusätzliche Carrieranzahl bleibt Balanceparameter,
- allgemeine Bewohner dürfen später einfache Transporte unterstützen,
- echter Carrier behält gemäß S2D-02 Priorität vor Bewohnerhilfe.

Die heutige historische Beobachtung von mehreren klassischen Trägern ist keine finale Zahlenfreigabe.

## 7. Builder-Bootstrap

Mindestens ein Builder muss von Anfang an real existieren.

Damit ist der erste Baupfad ohne Zirkelschluss möglich:

`HQ + Startressourcen + Gründer-Builder -> Baustelle -> Materiallieferung -> Builder-Ankunft -> erstes Wohnhaus`

Verbindlich bleibt:

- Builder ist reale Person,
- Construction startet erst nach echter Ankunft,
- Builder wird nicht aus einem allgemeinen Bewohner spontan erzeugt,
- ein fehlender/gebundener Builder bleibt sichtbarer wirtschaftlicher Engpass.

## 8. Produktionsspezialisten-Bootstrap

Solange V1 kein Ausbildungs-/Umschulungssystem besitzt, muss jede der vier Kernproduktionen prinzipiell betreibbar sein.

Daher ist im Startroster Capability-Abdeckung erforderlich für:

- Holzfäller,
- Steinmetz/Steinbrucharbeiter,
- Fischer,
- Jäger.

Das bedeutet nicht, dass alle vier Produktionsgebäude sofort gleichzeitig optimal betrieben werden müssen. Ob Startroster exakt je einen Spezialisten oder teilweise Mehrfachfähigkeiten enthält, ist Balanceentscheidung.

Für das klare Settlers-artige Personenbild wird als bevorzugte Baseline festgehalten:

> **Spezialisierungen sollen als unterschiedliche reale Personen sichtbar sein, sofern Balance und Startpopulation dies zulassen.**

## 9. Neue Bewohner aus Wohnhäusern

Neu durch kleine/mittlere Wohnhäuser entstehende Bewohner sind im V1 standardmäßig **allgemeine Bewohner**.

Sie besitzen mindestens:

- Home-Bindung an das erzeugende/zugewiesene Wohnhaus,
- `CAN_MOVE`,
- `CAN_SIMPLE_TRANSPORT`.

Sie erhalten nicht zufällig automatisch professionelle Capabilities wie Builder, Holzfäller, Steinmetz, Fischer oder Jäger.

Damit bleibt Spezialistenknappheit real und nachvollziehbar.

## 10. Keine zufällige Spezialistenproduktion durch Häuser

Ausdrücklich OUT für V1:

`Haus fertig -> zufällig Jäger/Builder/Fischer erzeugen`

Denn dies würde:

- Workforce-Bedarf schwer planbar machen,
- fehlende Fachkräfte zufällig lösen,
- Content- und Balanceverhalten unnötig verstecken.

Wohnhäuser erzeugen allgemeine Bevölkerung; Fachausbildung ist eine getrennte spätere Mechanik.

## 11. Ausbildung und Umschulung

Ein echtes System für:

- Ausbildung,
- Umschulung,
- Rekrutierung bestimmter Berufe,
- Ausbildungsdauer,
- Ausbildungskosten,
- Werkzeuge/Ausbildungsgebäude

bleibt **LATER**.

V1 benötigt es nicht, weil das Startroster die sechs zwingenden Capability-Bereiche abdeckt.

Damit wird keine spätere Lösung vorweggenommen.

## 12. Spezialistenwachstum im V1

Ohne Ausbildung wächst die Zahl der professionellen Spezialisten im ersten Kern nicht automatisch mit jedem neuen Haus.

Das ist für V1 zulässig und sogar nützlich:

- zusätzliche allgemeine Bewohner erhöhen Transporthilfe,
- Wohnraum erhöht Bevölkerung und Goldbasis,
- spezialisierte Produktionskapazität bleibt durch vorhandene Fachkräfte begrenzt,
- der Spieler muss Gebäudezahl und Workforce sinnvoll zueinander planen.

Falls Tests zeigen, dass dies den V1-Sandboxkern zu stark begrenzt, ist eine spätere explizite Content-/Balance-Revision erforderlich; keine heimliche Runtime-Konvertierung.

## 13. Mehrere Arbeitsstätten derselben Spezialisierung

Hat der Spieler mehr Produktionsgebäude eines Typs als passende Spezialisten, gilt:

- nicht jedes Gebäude erhält automatisch einen unsichtbaren Worker,
- freie passende Spezialisten werden nach Workforce-Regeln zugeordnet,
- übrige Gebäude warten verständlich auf Fachkraft.

Beispiel:

`2 Jägerhütten + 1 Jäger -> maximal eine Hütte gleichzeitig regulär besetzt, sofern keine weitere Hunter-Capability existiert.`

Die genaue Zuordnungsfairness folgt S2D-02/03.

## 14. Gründer und regulärer Wohnraum

Sobald reguläre Wohnhäuser existieren, dürfen Gründer dorthin umziehen.

V1-Zielbild:

`Founder at HQ -> freier Wohnplatz -> kontrollierte Re-Home-Bindung -> Founder bleibt dieselbe Person/Spezialist`

Dabei darf kein neuer Bewohner erzeugt und kein alter Gründer gelöscht werden.

Die belegte Wohnkapazität muss danach korrekt aus realen Home-Bindungen abgeleitet werden.

## 15. Hausbewohnerzahl und Gründer-Umsiedlung

Die bestätigten Hauskapazitäten 2/3 bleiben Kapazitäten, nicht zwingend zusätzliche Bevölkerung unabhängig von bereits vorhandenen Gründern.

Für V1 wird deshalb folgende fachliche Reihenfolge festgelegt:

1. Haus wird fertig.
2. Freier regulärer Wohnraum entsteht.
3. Noch am HQ wohnende Gründer dürfen bevorzugt regulär untergebracht werden.
4. Verbleibende freie Plätze dürfen gemäß Bewohnererzeugungsregel mit neuen allgemeinen Bewohnern besetzt werden.
5. Gesamtpopulation ergibt sich aus realen Personen, nicht aus `alte Population + pauschal 2/3` ohne Bindungsprüfung.

Damit verhindert S2D-05F eine Doppelzählung von Gründerbevölkerung und Haus-Spawn.

Die genaue UX des Einzugs bleibt offen.

## 16. New-Game-Startzustand

Ein gültiger V1-New-Game-Start enthält fachlich mindestens:

- feste Karte,
- Rathaus/HQ,
- definierte Startressourcen gemäß späterer Balance,
- reale Gründerpersonen mit vollständiger Mindest-Capability-Abdeckung,
- gültige temporäre HQ-Home-Bindungen,
- keine laufenden Jobs/Assignments außer ausdrücklich durch Startablauf erzeugten,
- keine bereits fertig produzierten Phantomwaren.

Tutorial/Guidance kann diesen Zustand erklären, verändert ihn aber nicht.

## 17. Continue

Continue erzeugt **keine neue Gründergruppe**.

Verbindlicher Restore:

- Gründer/reguläre Bewohner aus Save-State wiederherstellen,
- Spezialisierungen/Capabilities wiederherstellen,
- Home-Bindungen wiederherstellen,
- Population daraus ableiten,
- keine Startroster-Initialisierung über restaurierten Zustand legen.

`Continue -> apply New Game starter roster` ist ausdrücklich verboten.

## 18. SaveGame

Für Personen des Startrosters gelten dieselben Save-/Restore-Regeln wie für spätere Bewohner.

Es gibt keine „systemischen“ unsichtbaren Startarbeiter, die nach Reload neu erzeugt werden.

Persistiert/reconstructable gemäß S2D-03:

- stabile Person-ID,
- Spezialisierung/Capabilities,
- Home-Bindung,
- relevante Assignment-/Recovery-Zustände.

## 19. Gold und Gründer

Da Gründer reale Bewohner sind, gehören sie grundsätzlich zur Bevölkerung.

Ob temporär am HQ untergebrachte Gründer bereits denselben Gold-/Steuerbeitrag wie regulär wohnende Bewohner leisten, bleibt **BALANCE/ECONOMY DETAIL**.

Die sichere V1-Regel lautet:

- keine doppelte Steuerzählung,
- Steuerbasis nur aus realen gültigen Personen,
- HQ-Unterkunft darf keinen zusätzlichen fiktiven Populationseintrag erzeugen.

## 20. UI-/Spielerfeedback

Der Spieler muss keinen technischen „Bootstrap“-Begriff sehen.

Spielerisch genügt:

- sichtbare Startbewohner/Fachkräfte,
- verständlicher Hinweis, wenn ein Spezialist fehlt oder beschäftigt ist,
- normale Bewohner in Wohnhäusern,
- später reguläre Home-Bindung der Gründer.

Inspector darf Startroster/Capability-Abdeckung diagnostisch anzeigen, aber nicht als zweite Workforce-Wahrheit besitzen.

## 21. Balanceparameter

Noch offen bleiben:

- exakte Gründerzahl,
- exakte Carrieranzahl,
- ob einzelne Gründer mehrere professionelle Capabilities besitzen,
- Reihenfolge/Priorität bei Umzug aus HQ,
- Zeitverzögerung regulären Einzugs,
- Goldbeitrag temporär im HQ wohnender Gründer,
- Startressourcen,
- maximale gleichzeitig betreibbare Produktionsgebäude über Workforce-Balance.

Nicht offen ist die **Mindest-Capability-Abdeckung** des V1-Startrosters.

## 22. Spätere Erweiterungen

LATER:

- Ausbildungsgebäude,
- Berufswechsel,
- Werkzeugbedarf pro Beruf,
- Zuwanderung bestimmter Spezialisten,
- Geburten/Generationen,
- Skill-Level/Erfahrung,
- Löhne,
- Arbeitsmarkt,
- automatische Fachkräfteentwicklung.

Diese Punkte sind nicht erforderlich, um den ersten Wirtschaftskern konsistent zu implementieren.

## 23. S2D-05F-Invarianten

1. V1 startet mit realen Gründerpersonen.
2. Gründer zählen zur realen Bevölkerung.
3. Gründer besitzen gültige Home-Bindung.
4. HQ ist nur temporäre Gründerunterkunft, kein allgemeines Wohnhaus.
5. Startroster deckt Transport, Bau, Holzfällen, Steinabbau, Fischen und Jagen ab.
6. Mindestens ein echter Carrier ist startseitig prinzipiell vorhanden.
7. Mindestens ein Builder ist startseitig prinzipiell vorhanden.
8. Jede V1-Produktionsspezialisierung ist startseitig prinzipiell verfügbar.
9. Exakte Personenzahlen bleiben Balance.
10. Neue Hausbewohner sind standardmäßig allgemeine Bewohner.
11. Neue Hausbewohner besitzen einfache Transportfähigkeit.
12. Häuser erzeugen keine zufälligen Spezialisten.
13. Fehlende Fachkraft wird nicht durch Type-Mutation repariert.
14. Ausbildung/Umschulung bleibt LATER.
15. Mehr Gebäude als Spezialisten erzeugen reale Personalengpässe.
16. Gründer können in regulären Wohnraum umgebunden werden.
17. Re-Home erzeugt/löscht keine Person.
18. Hauskapazität 2/3 darf Gründer nicht zusätzlich doppelt zählen.
19. Continue erzeugt keine neue Gründergruppe.
20. Startroster ist New-Game-Initialisierung, nicht Restore-Patch.
21. Spezialisierungen/Capabilities sind persistente Personeneigenschaften gemäß Save-Modell.
22. Population bleibt aus realen Personen abgeleitet.
23. S2D-05F führt keine finale Balancezahl ein.
24. S2D-05F verändert keinen Gameplay-/Runtime-/UI-Code.

## 24. Abschlussstatus S2D-05F

- Bootstrap-Zirkelschluss geschlossen: **PASS**
- Start-Workforce fachlich definiert: **PASS**
- Mindest-Capability-Abdeckung definiert: **PASS**
- Housing-/Founder-Bindung konsistent: **PASS**
- neue Bewohner vs. Spezialisten getrennt: **PASS**
- Ausbildung/Umschulung kontrolliert LATER: **PASS**
- Continue/SaveGame konsistent: **PASS**
- finale Balancezahlen eingefroren: **0**
- Gameplay-/Runtime-/UI-Codeänderungen: **0**
- offene S2D-05F-Blocker: **0**

**S2D-05F – V1 Specialist Availability & Start Roster: COMPLETE / 0 BLOCKER**

Der gemeinsame S2D-05-Freeze erfolgt damit erst in **S2D-05G – Internal Consistency & Content Freeze Gate**.
