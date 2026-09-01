# S2D-02D – Specialist Lifecycle, Housing Binding & Workforce Availability

Status: **COMPLETE – Bestandteil von S2D-02 UNIT & WORKFORCE MODEL V0.1 DRAFT**  
Datum: 2026-09-01  
Repository: `DrHoschi/siedler-mini`  
Arbeitsbranch: `feature/s2d-02-unit-workforce`  
Verbindliche Basis: `S2D-00 PROJECT MASTER V0.1 FROZEN` + `S2D-01 GAME DESIGN V0.1 FROZEN` + `S2D-02A/B/C COMPLETE`

> Konsolidierungshinweis: Dieser geschlossene Teilblock wird spätestens beim S2D-02 Freeze-Gate in `S2D-02_UNIT_WORKFORCE_MODEL.md` konsolidiert. Er ist kein zusätzliches dauerhaftes Planungsdokument.

## 1. Zweck

S2D-02D definiert fachlich, wie Bewohner, Wohnraum, Spezialisten und verfügbare Workforce zusammenhängen.

Der Block legt fest:

- woher Personen und Spezialisten im V1-Kern fachlich kommen,
- wie Home-Bindung und Wohnraum dauerhaft wirken,
- wie Spezialisierung an einer Person erhalten bleibt,
- wann eine Person frei, gebunden oder nicht verfügbar ist,
- wie Wohnraum die maximale Bevölkerung und damit Workforce begrenzt,
- wie Hausabriss und fehlendes Zuhause behandelt werden,
- wie eine spätere Umsiedlung möglich bleibt, ohne die Identität oder Spezialisierung einer Person zu verlieren.

Nicht festgelegt werden konkrete Ausbildungsgebäude, Rekrutierungskosten, Umschulungszeiten, technische Datenstrukturen, exakte Startpopulation oder endgültige Balancewerte.

## 2. Grundregel: Workforce besteht aus realen Bewohnern

Die Workforce des V1-Kerns ist keine separate abstrakte Zahl und kein zusätzlicher Pool neben den sichtbaren Personen.

> **Jede verfügbare Arbeitskraft ist eine reale Person der Siedlung mit stabiler Identität, Home-Bindung und gegebenenfalls Spezialisierung.**

Damit gilt:

`Wohnraum -> reale Bewohner -> Capabilities/Spezialisierungen -> verfügbare Workforce`

Bevölkerung und Arbeitskräfte werden daraus abgeleitet und nicht als unabhängige Ressourcen erzeugt.

## 3. Wohnraum erzeugt Bevölkerungspotenzial

Ein Wohnhaus stellt eine definierte Zahl von Wohnplätzen bereit.

Verbindliche Ausgangsbasis:

- kleines Wohnhaus: 2 Bewohner,
- mittleres Wohnhaus: 3 Bewohner.

Für den V1-Kern gilt:

- Bewohner gehören real zu diesen Wohnplätzen,
- belegter Wohnplatz entspricht einer real existierenden Person,
- unbesetzter Wohnplatz ist nur potenzieller Platz und keine Workforce,
- Bevölkerung wird aus den tatsächlich vorhandenen Bewohnern abgeleitet.

Ein Wohnhaus darf daher nicht gleichzeitig 3 Bewohner anzeigen, während im Workforce-System 5 unabhängige Personen aus demselben Haus existieren.

## 4. Herkunft neuer Bewohner

S2D-02D legt noch kein komplexes Einwanderungs-, Geburten- oder Rekrutierungssystem fest.

Für den ersten Kern genügt fachlich:

- ein Wohnhaus kann entsprechend seiner definierten Kapazität reale Bewohner bereitstellen,
- diese Bewohner werden mit stabiler Identität und Home-Bindung erzeugt,
- ihre konkrete Entstehungszeit bzw. ob Bewohner sofort oder verzögert einziehen, bleibt spätere Balance-/Contententscheidung.

Wichtig ist nur:

> Neue Workforce darf nicht losgelöst von realem Wohnraum aus einem unsichtbaren globalen Pool erscheinen.

## 5. Spezialisierung gehört zur Person

Eine Spezialisierung ist eine dauerhafte bzw. kontrolliert veränderbare Eigenschaft einer realen Person.

Beispiele:

- Bewohner ohne Fachspezialisierung,
- Carrier,
- Builder,
- Lumberjack,
- Quarry Worker,
- Fisher,
- Hunter.

Die Spezialisierung gehört nicht dem Gebäude und nicht dem aktuellen Job.

Ein Jäger bleibt fachlich dieselbe spezialisierte Person, auch wenn:

- er zuhause ist,
- er gerade keinen Job hat,
- er auf dem Rückweg ist,
- seine Jägerhütte pausiert,
- aktuell kein Tier verfügbar ist.

## 6. Arbeitsplatz und Spezialisierung sind getrennt

Eine Person kann die Fähigkeit für eine Arbeit besitzen, ohne dauerhaft an genau ein Produktionsgebäude gebunden zu sein.

S2D-02D legt deshalb zunächst fest:

- Spezialisierung bestimmt fachliche Eignung,
- Job/Assignment bestimmt die aktuelle konkrete Tätigkeit,
- ein Gebäude kann Bedarf nach einer passenden Fachkraft erzeugen,
- die konkrete dauerhafte oder flexible Arbeitsplatzbindung wird nicht stillschweigend mit der Spezialisierung gleichgesetzt.

Ob ein Spezialist im finalen V1 dauerhaft einem bestimmten Gebäude zugeordnet wird oder innerhalb geeigneter Gebäude flexibel vermittelt werden kann, wird in einem späteren Detailblock entschieden, sofern dafür noch eine Produktentscheidung nötig ist.

## 7. Verfügbare Workforce

Die verfügbare Workforce ist die Menge realer Personen, die aktuell für neue Arbeit berücksichtigt werden dürfen.

Eine Person ist grundsätzlich **verfügbar**, wenn mindestens gilt:

- sie existiert gültig,
- sie besitzt eine gültige Home-/Siedlungszugehörigkeit,
- sie ist nicht bereits einem normalen Assignment zugewiesen,
- sie befindet sich nicht in einem fachlich ausschließenden Sonderzustand,
- sie besitzt die für den betrachteten Job notwendige Capability.

Verfügbarkeit ist damit immer jobspezifisch.

Beispiel:

Ein freier Fischer kann für einen Fischereijob verfügbar sein, aber nicht automatisch für einen Baujob.

## 8. Frei ist nicht gleich unbeschäftigt im wirtschaftlichen Sinn

`FREE` aus S2D-02B bedeutet, dass eine Person kein aktives Assignment besitzt.

Das bedeutet nicht automatisch, dass sie für jede Arbeit geeignet ist.

Beispiele:

- freier Bewohner -> einfacher Transport grundsätzlich möglich,
- freier Builder -> Baujob möglich,
- freier Hunter -> Jagdjob möglich,
- freier Hunter ohne CAN_BUILD -> Baujob nicht möglich.

Damit werden Availability und Capability bewusst getrennt.

## 9. Gebundene Workforce

Eine Person gilt für neue normale Arbeit als **gebunden**, sobald sie ein gültiges Assignment besitzt.

Das umfasst alle Phasen des Assignments:

- Weg zur Aufgabe,
- Warten am gültigen Ziel,
- aktive Arbeit,
- Pickup,
- Warentransport,
- Delivery,
- weitere zum Assignment gehörende Rückkehr-/Outputphasen.

Sie wird erst nach fachlich sauberem Assignment-Ende wieder frei.

Freizeit- oder Heimkehrbewegung nach abgeschlossenem Assignment ist dagegen kein Workforce-Bindungsgrund, soweit S2D-02B die Person bereits wieder als `FREE` definiert.

## 10. Spezialistenmangel als realer Engpass

Wenn zu wenige Personen mit einer benötigten Spezialisierung vorhanden oder frei sind, entsteht ein echter Workforce-Engpass.

Das System darf diesen Zustand nicht durch unsichtbare automatische Neuerzeugung oder Typmutation kaschieren.

Beispiele:

- Baustelle vollständig beliefert, aber kein freier Builder,
- Jägerhütte aktiv, aber kein geeigneter Hunter,
- Fischerhütte vorhanden, aber kein geeigneter Fisher.

Der Spieler soll erkennen können, ob:

- überhaupt kein passender Spezialist existiert,
- passende Spezialisten existieren, aber beschäftigt sind,
- passende Person bereits unterwegs ist.

## 11. Allgemeine Bewohner und Spezialisten konkurrieren nicht blind

Allgemeine Bewohner dürfen im V1 einfache Transporte unterstützen.

Dabei gilt:

- Carrier/Spezialist für Transport hat grundsätzlich Vorrang,
- allgemeiner Bewohner kann helfen, wenn geeignete Transportkapazität fehlt,
- ein allgemeiner Bewohner darf dadurch nicht seine Home-Bindung oder Identität verlieren,
- spezialisierte Tätigkeiten werden nicht mit allgemeinen Bewohnern aufgefüllt, wenn die Capability fehlt.

Damit bleibt Wohnraumausbau relevant, ohne Spezialistenmangel unsichtbar zu machen.

## 12. Wohnraummangel begrenzt Wachstum

Da reale Bewohner an Wohnraum gebunden sind, begrenzt fehlender Wohnraum die weitere Bevölkerung und damit das mögliche Workforce-Wachstum.

Der wirtschaftliche Zusammenhang lautet:

`mehr Wohnraum -> mehr mögliche Bewohner -> mehr potenzielle Workforce -> gleichzeitig mehr Bedarf und Wege`

Ein Wohnraummangel kann daher indirekt zu Arbeitskräfte- und Transportengpässen führen.

Die S2D-01-Regel bleibt bestehen: Wohnhäuser sind nicht nur Goldgeneratoren, sondern Teil der Workforce-Basis.

## 13. Spezialist ohne aktuellen Job

Ein Spezialist verliert seinen Beruf nicht, wenn aktuell kein passender Job vorhanden ist.

Beispiel:

`Hunter -> kein gültiges Tier/keine aktive Jägerhütte -> FREE -> Home/Freizeit`

Sobald wieder ein passender gültiger Job existiert, kann dieselbe Person erneut berücksichtigt werden.

Es wird kein neuer Hunter erzeugt und der alte nicht in einen allgemeinen Bewohner zurückverwandelt.

## 14. Hausbindung bleibt während Arbeit bestehen

Eine arbeitende Person bleibt weiterhin ihrem Wohnhaus zugeordnet.

Das gilt während:

- Arbeitsweg,
- Produktion,
- Transport,
- Bauarbeit,
- Jagd,
- Wartephasen,
- Rückkehr.

Die Home-Bindung ist kein Aktivitätszustand und darf nicht beim Start eines Jobs entfernt werden.

## 15. Hausabriss – Grundprinzip

Ein Wohnhaus darf nicht so abgerissen werden, dass seine Bewohner stillschweigend verschwinden oder dupliziert werden.

Der Abriss eines bewohnten Hauses erzeugt daher einen realen Wohnungszustand, der behandelt werden muss.

Verbindlich gilt:

1. Bewohneridentitäten bleiben bestehen.
2. Spezialisierungen/Capabilities bleiben bestehen.
3. bestehende Personen werden nicht neu erzeugt, um sie „umzusiedeln“.
4. Home-Bindung darf erst geändert werden, wenn eine gültige neue Wohnzuordnung feststeht oder ein definierter Übergangszustand existiert.
5. das Spiel darf Bewohner nicht gleichzeitig zwei Häusern zuordnen.

## 16. Abriss eines bewohnten Hauses

Für den ersten Kern wird fachlich festgelegt:

> **Ein normaler Wohnhausabriss darf erst endgültig abgeschlossen werden, wenn seine Bewohner nicht mehr ungültig an das zu entfernende Haus gebunden sind.**

Als zulässige spätere Ausgestaltung kommen insbesondere infrage:

- Abriss blockieren, solange Bewohner nicht umgesiedelt werden können,
- automatische Umsiedlung in freie Wohnplätze,
- definierter temporärer `HOMELESS/RELOCATION_PENDING`-Zustand.

Welche dieser Varianten für die konkrete V1-Bedienung gewählt wird, bleibt noch offen und wird nicht in S2D-02D erzwungen.

Nicht zulässig ist:

`Haus gelöscht -> Bewohnerobjekte kommentarlos gelöscht`.

## 17. Fehlendes Zuhause / Übergangszustand

Das Zielmodell soll einen kontrollierten Sonderfall für Personen ohne aktuell gültiges Zuhause ermöglichen, falls dieser durch Abriss, Migration oder spätere Systeme notwendig wird.

Fachlich kann dieser Zustand als `HOMELESS/RELOCATION_PENDING` gedacht werden.

Dabei gilt:

- Person bleibt dieselbe Unit,
- Spezialisierung bleibt erhalten,
- sie darf nicht mehrfach neu erzeugt werden,
- sie muss für Workforce-Zuordnung klar als normal verfügbar oder vorübergehend eingeschränkt definiert sein,
- der Zustand soll nicht ohne Spieler-/Systemreaktion dauerhaft unbemerkt bestehen bleiben.

Ob der V1-Kern diesen Zustand tatsächlich sichtbar benötigt, bleibt offen; die Architektur darf ihn jedoch nicht unmöglich machen.

## 18. Umsiedlung

Eine spätere Umsiedlung ändert die Home-Bindung, nicht die Identität.

Fachlicher Ablauf:

`Person mit Home A -> gültiger freier Wohnplatz B bestimmt -> Home-Bindung kontrolliert von A nach B wechseln -> zukünftige Home-/Freizeitwege beziehen sich auf B`

Dabei gilt:

- Spezialisierung bleibt erhalten,
- Unit-ID bleibt erhalten,
- laufendes Assignment darf nicht dupliziert oder verloren gehen,
- Person darf nie gleichzeitig in A und B als Bewohner gezählt werden.

Die konkrete UI und der genaue Zeitpunkt des physischen Umzugs gehören später in S2D-04/S2D-03.

## 19. Wohnplatzreservierung bei Umsiedlung

Damit eine Person beim Wechsel nicht zwischen zwei Systemzuständen verloren geht, benötigt die spätere Umsetzung eine eindeutige Wohnplatzzuordnung bzw. Reservierung.

Fachlich gilt:

- ein freier Wohnplatz darf nicht gleichzeitig mehreren Personen zugesagt werden,
- eine Umsiedlung zählt erst dann als abgeschlossen, wenn die neue Zuordnung eindeutig ist,
- bei Fehlschlag muss die bestehende gültige Bindung erhalten bleiben oder ein definierter Übergangszustand greifen.

Die technische Reservierungsstruktur gehört in S2D-03.

## 20. Produktionsgebäude-Abriss betrifft nicht die Identität

Wird ein Produktionsgebäude abgerissen oder deaktiviert, verliert ein dort eingesetzter Spezialist nicht automatisch seinen Beruf.

Beispiel:

`Jägerhütte entfernt -> Hunter-Assignment endet kontrolliert -> Person bleibt Hunter -> FREE/Home -> kann später an anderer geeigneter Jägerhütte arbeiten`

Dies verhindert, dass Gebäude zu versteckten Ownern der Personenidentität werden.

## 21. Pausiertes Gebäude und Workforce

Ein pausiertes Produktionsgebäude erzeugt keine neuen normalen Produktionsjobs.

Dadurch können betroffene Spezialisten grundsätzlich wieder frei werden, sobald ihr bereits laufendes Assignment gemäß S2D-02B kontrolliert abgeschlossen oder sicher beendet wurde.

Pause bedeutet nicht:

- Spezialist löschen,
- Spezialisierung entfernen,
- Person dauerhaft an einem inaktiven Gebäude festhalten.

## 22. Workforce-Übersicht aus realen Personen

Für Spielerfeedback und Inspector sollen Workforce-Zahlen aus dem tatsächlichen Personenbestand ableitbar sein.

Fachlich sinnvoll unterscheidbar sind mindestens:

- Gesamtbewohner,
- aktuell freie Personen,
- aktuell gebundene Personen,
- freie allgemeine Transporthelfer,
- vorhandene Spezialisten pro Fachgebiet,
- davon frei / gebunden,
- Personen ohne gültiges Zuhause, falls dieser Zustand existiert.

Diese Anzeigen sind abgeleitete Sichten und kein zweiter Workforce-Store.

## 23. Keine doppelte Zählung

Eine reale Person darf in Workforce-Statistiken nicht mehrfach als unterschiedliche Arbeitskräfte gezählt werden.

Beispiel:

Ein Builder mit zusätzlicher einfacher Transportfähigkeit ist weiterhin **eine Person**.

Er kann in Capability-Analysen mehreren Gruppen zugeordnet werden, aber nicht als zwei gleichzeitig verfügbare Workforce-Einheiten behandelt werden.

## 24. Save/Continue

Save/Continue muss Wohn- und Workforce-Zusammenhänge konsistent erhalten oder eindeutig rekonstruieren.

Mindestens fachlich relevant sind:

- stabile Unit-ID,
- aktuelles Home bzw. Wohnzuordnung,
- Spezialisierung/Capabilities,
- aktueller Assignment-/Availability-Zustand,
- gegebenenfalls laufende Umsiedlung bzw. Übergangszustand.

Nach Reload darf nicht entstehen:

- Person ohne Grund in anderem Haus,
- doppelt belegter Wohnplatz,
- verlorener Spezialist,
- zusätzliche Workforce ohne realen Bewohner,
- ein Bewohner gleichzeitig in zwei Häusern.

## 25. Spielerlesbarkeit

Der Spieler soll Wohn- und Workforce-Mangel nachvollziehen können.

Mindestens fachlich unterscheidbar:

- Wohnraum voll / kein freier Wohnplatz,
- freie Bewohner vorhanden,
- benötigter Spezialist fehlt,
- Spezialist vorhanden, aber beschäftigt,
- Person ohne gültiges Zuhause, falls relevant,
- Haus kann wegen Bewohnerzustand noch nicht endgültig entfernt werden, falls diese Abrissvariante gewählt wird.

Die konkrete Darstellung gehört in S2D-04.

## 26. S2D-02D Invarianten

1. Jede Workforce-Einheit ist eine reale Person der Siedlung.
2. Bevölkerung wird aus realen Bewohnern abgeleitet.
3. Wohnplatz und Person dürfen nicht doppelt belegt/gezählt werden.
4. Home-Bindung bleibt während Arbeit bestehen.
5. Spezialisierung gehört zur Person, nicht zum Gebäude oder aktuellen Job.
6. Spezialist ohne Job bleibt Spezialist.
7. Produktionsgebäude-Abriss entfernt keine Spezialisierung.
8. Wohnhausabriss darf Bewohner nicht stillschweigend löschen.
9. Umsiedlung ändert Home, nicht Unit-ID oder Beruf.
10. Arbeitskräftemangel darf nicht durch unsichtbare Neuerzeugung kaschiert werden.
11. Workforce-Anzeigen sind abgeleitete Sichten, kein zweiter Store.
12. Eine Person mit mehreren Capabilities bleibt eine einzige Arbeitskraft.
13. Save/Continue muss Home, Identität und Spezialisierung konsistent erhalten.
14. Fehlendes Zuhause benötigt, falls es auftritt, einen kontrollierten Zustand statt eines ungültigen Nullzustands.

## 27. Was S2D-02D bewusst offen lässt

Noch nicht festgelegt werden:

- genaue Startpopulation,
- genaue Startzahl je Spezialist,
- sofortiger vs. verzögerter Einzug neuer Bewohner,
- Herkunft neuer Spezialisten,
- Ausbildung/Umschulung,
- Ausbildungsgebäude,
- Rekrutierungskosten und -zeiten,
- dauerhafte vs. flexible Bindung eines Spezialisten an ein konkretes Produktionsgebäude,
- konkrete V1-Variante für Wohnhausabriss/Umsiedlung,
- genaue Home-/Relocation-State-Machine,
- technische Datenstrukturen für Wohnplätze,
- genaue UI für Workforce-/Wohnstatus,
- spätere Familien-, Alterungs- oder Geburtenmechaniken.

Diese Punkte werden nur dann in folgenden Blöcken konkretisiert, wenn sie für den ersten vollständigen Wirtschaftskern tatsächlich erforderlich sind.

## 28. Abschluss S2D-02D

Der Zusammenhang zwischen realen Bewohnern, Wohnraum, Spezialisten und verfügbarer Workforce ist damit fachlich geschlossen definiert, ohne ein unnötig komplexes Rekrutierungs- oder Ausbildungssystem vorwegzunehmen.

**S2D-02D – Specialist Lifecycle, Housing Binding & Workforce Availability: COMPLETE**  
**Implementation changes: 0**  
**Product scope conflict gegenüber S2D-00/S2D-01 FROZEN: 0**
