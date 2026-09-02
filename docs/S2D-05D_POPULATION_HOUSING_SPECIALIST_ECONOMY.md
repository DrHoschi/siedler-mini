# S2D-05D – Population, Housing, Specialist & Economy Content Definitions

Status: **COMPLETE – Bestandteil von S2D-05 CONTENT CATALOG V0.1 DRAFT**  
Datum: 2026-09-02  
Repository: `DrHoschi/siedler-mini`  
Arbeitsbranch: `feature/s2d-05-content-catalog`  
Verbindliche Basis: S2D-00/01/02/03/04 FROZEN + S2D-05A/B/C COMPLETE

> Konsolidierungshinweis: Dieser Teilblock wird spätestens beim S2D-05-Freeze in `docs/S2D-05_CONTENT_CATALOG.md` übernommen. Er ist kein dauerhaftes zweites Masterdokument.

## 1. Zweck

S2D-05D definiert die fachliche Contentbedeutung von Bevölkerung, Wohnraum, Bewohnern, Spezialisten, allgemeiner Transporthilfe und Gold/Steuern.

Es werden keine finalen Balancewerte, keine technische Datenstruktur und kein Gameplay-/UI-Code festgelegt.

## 2. Zentrale Bevölkerungsregel

> **Bevölkerung ist die Anzahl real existierender Bewohner-Personen der Siedlung und niemals ein unabhängiger Resource-Zähler.**

Damit gilt:

`Wohnraum -> reale Bewohner -> Spezialisierungen/Capabilities -> verfügbare Workforce`

Population wird daraus abgeleitet.

## 3. Bewohner als reale Personen

Jeder Bewohner besitzt fachlich mindestens:

- stabile Personen-/Unit-ID,
- Zugehörigkeit zur Siedlung,
- reale Weltposition bzw. Home-Inside-Zustand,
- Home-Bindung,
- Spezialisierung,
- Capabilities,
- Availability,
- Activity,
- aktuelles Assignment oder keines.

Ein Bewohner ist nicht gleichbedeutend mit „arbeitslos“.

## 4. Entstehung von Bewohnern

Für den V1-Kern gilt weiterhin:

- kleines Wohnhaus -> bestätigte Baseline 2 Bewohner,
- mittleres Wohnhaus -> bestätigte Baseline 3 Bewohner.

Sobald ein Wohnhaus fachlich fertiggestellt ist und seine Bewohner erzeugt werden dürfen, entstehen reale Personen mit stabilen IDs und Home-Bindung an dieses Haus.

Nicht zulässig:

- nur einen Population-Zähler hochzählen,
- Bewohner ohne Personinstanz erzeugen,
- dieselben Bewohner nach Continue nochmals zusätzlich spawnen.

Die exakte zeitliche Form des Einzugs – sofort, kurze Verzögerung, sichtbarer Zuzug – bleibt **BALANCE/UX DETAIL**.

## 5. Wohnkapazität vs. tatsächliche Belegung

Eine Wohnhausdefinition besitzt eine Kapazität.

V1:

- `b.house_small` -> 2 Plätze,
- `b.house_middle` -> 3 Plätze.

Die tatsächliche Belegung wird aus real gebundenen Bewohnern bestimmt.

Daher sind fachlich getrennt:

- Wohnkapazität,
- belegte Plätze,
- freie Plätze,
- tatsächliche Bevölkerung.

Die UI darf daraus Wohnraummangel ableiten, aber keinen zweiten Housing-State führen.

## 6. Home-Bindung

> **Home-Bindung ist dauerhaft von Beruf und Arbeitsort getrennt.**

Beispiel:

`Person #17 -> wohnt in Haus #4 -> Spezialisierung Jäger -> arbeitet zeitweise an Jägerhütte #2`

Die Arbeitsstätte überschreibt niemals die Home-Bindung.

Nach Arbeit bleibt dieselbe Person und kann zurückkehren.

## 7. Bewohner-Lebenszyklus

Fachliches Ziel:

`Home/Frei -> Idle/Freizeit -> ggf. Assignment -> Weg -> Arbeit -> Abschluss -> Frei -> Rückkehr/Home/Freizeit`

Freizeit darf sichtbare Bewegung erzeugen und damit Trampelpfade beeinflussen, besitzt aber keine wirtschaftliche Arbeitswirkung.

Die genaue Häufigkeit und Dauer von Freizeitverhalten bleibt **BALANCE**.

## 8. Spezialist ist kein zusätzlicher Bevölkerungstyp

> **Jeder Spezialist ist weiterhin ein Bewohner bzw. eine reale Person der Siedlung.**

V1-Spezialisierungen:

- Carrier/Träger,
- Builder/Bauarbeiter,
- Lumberjack/Holzfäller,
- Stonecutter/Steinmetz,
- Fisher/Fischer,
- Hunter/Jäger.

Ein Spezialist wird nicht zusätzlich zum Bewohner gezählt.

Beispiel:

`Population = 12`

enthält bereits die darin vorhandenen Carrier, Builder, Jäger usw.

## 9. Spezialisierung vs. Capability vs. Assignment

Diese Ebenen bleiben getrennt:

### Spezialisierung
Dauerhafte fachliche Rolle/Eignung, z. B. Jäger.

### Capability
Was die Person grundsätzlich ausführen darf, z. B. `CAN_HUNT`.

### Assignment
Was sie gerade konkret tut, z. B. Jagd an Tier X.

Ein Assignment verändert keine Spezialisierung und keine Identität.

## 10. Allgemeiner Bewohner

Ein allgemeiner Bewohner besitzt im V1 mindestens:

- Bewegungsfähigkeit,
- Home-Bindung,
- Fähigkeit zur einfachen Transporthilfe (`CAN_SIMPLE_TRANSPORT`).

Er besitzt nicht automatisch:

- `CAN_BUILD`,
- `CAN_LUMBERJACK`,
- `CAN_QUARRY`,
- `CAN_FISH`,
- `CAN_HUNT`.

Professionelle Arbeiten bleiben echte Spezialisierungs-/Capability-Engpässe.

## 11. Transporthilfe durch freie Bewohner

Zielablauf:

`freier Bewohner -> einfacher Transportbedarf -> Assignment -> Pickup -> sichtbarer Transport -> Delivery -> Assignment Ende -> Bewohner wieder frei`

Dabei bleibt die Person während des gesamten Ablaufs Bewohner.

Ausdrücklich OUT:

`u.type = carrier` für die Dauer des Jobs.

## 12. Spezialisten-Vorrang bei Transport

Für einfache Transportjobs gilt:

1. geeignete freie Carrier/Transportspezialisten bevorzugen,
2. wenn spezialisierte Transportkapazität nicht reicht, freie Bewohner mit einfacher Transportfähigkeit berücksichtigen.

Damit hat die Carrier-Rolle wirtschaftlichen Wert, ohne dass freie Bevölkerung nutzlos bleibt.

Die konkrete Gewichtung/Distanz-/Fairnessformel bleibt **IMPLEMENTATION/BALANCE**.

## 13. Professionelle Arbeitsjobs

Kein allgemeiner Bewohner-Fallback für:

- Bauen,
- Holzfällen,
- Steinabbau,
- Fischen,
- Jagen.

Fehlt eine passende Person, ist dies ein echter Personalengpass.

## 14. Anzahl Spezialisten

S2D-05D legt keine finale Startverteilung fest.

Offen/BALANCE bleiben:

- wie viele Carrier zu Spielbeginn existieren,
- wie viele Builder,
- wie Spezialisten entstehen,
- ob Häuser bereits gemischte Spezialisierungen erzeugen,
- ob spätere Ausbildung/Umschulung existiert,
- Kosten und Dauer davon.

Verbindlich ist nur: Spezialisten sind reale Bewohner, keine abstrakten Arbeitsobjekte.

## 15. Arbeitsstätte besitzt die Person nicht

Ein Produktionsgebäude benötigt eine passende Capability, besitzt aber die Person nicht.

Wird eine Arbeitsstätte pausiert oder abgerissen:

- Person bleibt bestehen,
- Home bleibt bestehen,
- Spezialisierung/Capabilities bleiben bestehen,
- laufendes Assignment wird kontrolliert beendet/recovered,
- Person kann später andere geeignete Arbeit annehmen.

## 16. Arbeitslosigkeit / freie Workforce

„Frei“ bedeutet nicht „ohne Beruf“.

Ein Jäger kann frei sein, wenn gerade kein Jagdjob besteht. Ein Carrier kann frei sein, wenn kein Transportjob besteht.

Spielerisch relevante Gruppen können daher sein:

- freie Personen,
- beschäftigte/assigned Personen,
- Spezialisten vorhanden aber derzeit frei,
- Spezialisten vollständig ausgelastet,
- passender Spezialist fehlt.

## 17. Wohnraummangel

Wenn keine freien Wohnplätze vorhanden sind, ist dies ein siedlungsweiter Engpass.

S2D-05D führt jedoch noch kein autonomes Bevölkerungswachstum über die bestätigten Wohnhausbewohner hinaus ein.

Ob später zusätzliche Zuwanderung, Geburten, Nachfrage oder Attraktivität existieren, bleibt **LATER**.

## 18. Hausabriss

Beim Abriss eines Wohnhauses dürfen Bewohner nicht gelöscht werden.

Verbindlich:

- Personen-ID bleibt,
- Spezialisierung bleibt,
- Capabilities bleiben,
- alte Home-Bindung wird kontrolliert ungültig/gelöst,
- laufende Assignments werden fachlich behandelt,
- Bewohner gehen in einen definierten Übergangszustand, bis neue Home-Bindung möglich ist.

Ein Konzept wie `HOMELESS` / `RELOCATION_PENDING` ist zulässig; exakte V1-Umsiedlungslogik bleibt offen.

## 19. Kein verstecktes automatisches Umschreiben

Nicht zulässig:

- Hausabriss löscht Bewohner,
- Spezialistenmangel konvertiert automatisch irgendeinen Bewohner,
- Produktionsgebäude erzeugt unsichtbar seinen eigenen Worker,
- Continue erzeugt fehlende Spezialisten neu, wenn sie eigentlich aus Save-State stammen müssten.

## 20. Gold – fachliche Art

> **Gold ist ein Wirtschaftswert und keine physische Transportware.**

Gold besitzt daher:

- keinen normalen BuildingStock,
- keinen Carriertransport,
- keinen sichtbaren physischen Warenort als V1-Pflicht,
- keine Reservation im normalen Goods-Transportmodell.

Gold wird vom Economy-/Gold-Owner geführt.

## 21. Goldquelle im V1

Wohnhäuser/Bewohner erzeugen im V1 Gold/Steuereinnahmen.

Fachliche Grundbeziehung:

`reale gültige Bewohner -> Wohn-/Steuersystem -> Goldzuwachs beim Economy-Owner`

Nicht:

`Haus produziert Goldware -> Carrier bringt Gold zum HQ`.

## 22. Steuerbasis

Für den V1-Kern wird als Basismodell festgelegt:

> **Der Goldbeitrag wird primär aus real vorhandenen gültigen Bewohnern abgeleitet.**

Damit ist der Wirtschaftsbeitrag an tatsächliche Bevölkerung gekoppelt und nicht nur an die Zahl platzierter Häuser.

Ein leeres oder ungültig belegtes Haus darf nicht blind volle Bewohnersteuern erzeugen.

## 23. Steuer-/Goldrate

Der historische Testwert `1 Gold pro Bewohner pro 10 Sekunden` bleibt ausdrücklich nur **TEST/BALANCE**.

Noch offen:

- Gold pro Bewohner,
- Zeitintervall bzw. kontinuierliche Rate,
- eventuelle Unterschiede nach Wohnhaustyp,
- eventuelle Unterhaltskosten,
- spätere Ausgabenquellen.

S2D-05D friert keine Zahl ein.

## 24. Steuer-Timing

Goldfortschritt nutzt autoritative Simulationszeit über den zentralen Scheduler.

Ausdrücklich kein dauerhaftes eigenes Housing-Tax-`setInterval` als Zielarchitektur.

Pause der Gesamtsimulation stoppt den wirtschaftlichen Zeitfortschritt.

## 25. Wohnhausgröße und Steuerbeitrag

Kleines und mittleres Wohnhaus unterscheiden sich im V1 sicher durch ihre Bewohnerkapazität 2 bzw. 3.

Damit kann sich ihr Gesamtbeitrag bereits allein aus der Bewohnerzahl unterscheiden.

S2D-05D führt noch keinen zusätzlichen Multiplikator nur wegen Hausgröße ein.

Ob später unterschiedliche Wohlstands-/Steuerklassen entstehen, bleibt **LATER**.

## 26. Goldverwendung

S2D-05D definiert Gold als wirtschaftlich relevanten Wert, friert aber noch keine vollständige Ausgabenseite ein.

Nicht automatisch in V1 vorziehen:

- Goldkosten für jedes Gebäude,
- Löhne,
- Unterhalt,
- Handel,
- Militärkosten,
- Ausbildungskosten.

Diese Mechaniken benötigen eigene spätere Entscheidung/Balance.

## 27. Bevölkerung und Gold nach Continue

Nach Continue gilt:

- Bewohner werden aus Save-State wiederhergestellt,
- Home-/Spezialisierungs-/Assignment-relevante Zustände werden gemäß S2D-03 rekonstruiert,
- Population wird danach aus realen Bewohnern abgeleitet,
- Gold wird aus dem Economy-Owner wiederhergestellt,
- es darf kein doppelter Bewohner-Spawn stattfinden,
- es darf keine zusätzliche Steuerzahlung allein wegen Restore-Events entstehen.

## 28. Spielerübersicht

S2D-04 bleibt bindend.

Der Spieler darf sehen:

- Gesamtbevölkerung,
- Wohnplätze/belegt/frei,
- freie/beschäftigte Workforce in verständlicher Zusammenfassung,
- Spezialistenmangel,
- Goldbestand,
- verständlichen Goldbeitrag der Bevölkerung.

Nicht anzeigen als Spielerstandard:

- interne Assignment-IDs,
- Retry-Daten,
- technische Schedulerwerte,
- rohe Owner-Maps.

## 29. Contentdefinitionen – Bewohner und Rollen

Für V1 benötigt der Content fachlich folgende Definitionsebene:

### Person/Bewohner
- stabile Contentrolle als Siedlungsperson,
- Home-Fähigkeit,
- allgemeine Bewegungsfähigkeit,
- ggf. einfache Transportfähigkeit.

### Spezialisierung
- Carrier,
- Builder,
- Lumberjack,
- Stonecutter,
- Fisher,
- Hunter.

### Capability-Zuordnung
- welche Spezialisierung welche Facharbeit erlaubt.

Die finalen JSON-Felder/Enums bleiben Implementierungsdetail.

## 30. Contentdefinitionen – Wohnhäuser

Wohnhausdefinitionen benötigen fachlich mindestens:

- Building-ID,
- Wohnkapazität,
- Bewohnererzeugungs-/Bindungsprofil,
- Baukostenprofil,
- Entrance/Home-Access,
- UI-Namen/Assetreferenz,
- ggf. Economy-Beitrag als Bewohnerbezug, nicht als Goldware.

## 31. Contentdefinitionen – Economy

Gold-/Economy-Definition benötigt fachlich:

- Gold als separaten nicht-physischen Wert,
- definierte Einnahmequellen,
- in V1 mindestens Bewohnersteuer,
- Balanceparameter für Rate,
- Scheduler-/Simulationszeitbezug,
- Save/Restore-Unterstützung über Economy-Owner.

## 32. Feste Regeln vs. Balance

### Fachlich fest

- Bevölkerung = reale Bewohneranzahl.
- 2 Bewohner kleines Haus.
- 3 Bewohner mittleres Haus.
- Bewohner besitzen Home-Bindung.
- Spezialisten sind dieselben realen Personen.
- Spezialisierung != Assignment.
- freie Bewohner dürfen einfache Transporte unterstützen.
- Carrier haben bei Transport Vorrang.
- professionelle Jobs brauchen passende Capability.
- Arbeitsstätten besitzen Personen nicht.
- Hausabriss löscht Bewohner nicht.
- Gold ist nicht physisch.
- Bewohner/Häuser erzeugen Gold über Economy-System.
- Steuerbasis orientiert sich an realen Bewohnern.
- Continue darf Bewohner/Gold nicht duplizieren.

### BALANCE / später

- Startzahl und Verteilung von Spezialisten,
- konkrete Steuer-/Goldrate,
- Freizeitfrequenz,
- Zeitpunkt/Animation des Einzugs,
- spätere Umschulung/Ausbildung,
- eventuelle Unterhaltskosten,
- spätere Wohlstands-/Steuerklassen,
- Zuwanderung/Bevölkerungswachstum,
- Umsiedlungsdetails.

## 33. S2D-05D-Invarianten

1. Population ist kein eigenständiger ResourceStore-Bestand.
2. Jeder gezählte Bewohner ist eine reale Person.
3. Kleine Häuser haben Baseline 2 Bewohner.
4. Mittlere Häuser haben Baseline 3 Bewohner.
5. Tatsächliche Belegung wird aus Home-Bindungen abgeleitet.
6. Spezialisten werden nicht zusätzlich zur Bevölkerung gezählt.
7. Spezialisierung ist dauerhaft von Assignment getrennt.
8. Jobs erzeugen keine neuen Capabilities.
9. Allgemeine Bewohner dürfen einfache Transporte unterstützen.
10. Bewohner werden dafür nicht zu Carrier umtypisiert.
11. Carrier/Transportspezialisten haben Vorrang bei Transportjobs.
12. Builder-Arbeit braucht `CAN_BUILD`.
13. Holzfällen braucht entsprechende Fachfähigkeit.
14. Steinabbau braucht entsprechende Fachfähigkeit.
15. Fischen braucht entsprechende Fachfähigkeit.
16. Jagen braucht entsprechende Fachfähigkeit.
17. Produktionsgebäude besitzen Worker nicht als Personenwahrheit.
18. Pause/Abriss einer Arbeitsstätte löscht keine Person.
19. Hausabriss löscht Bewohner nicht.
20. Home-Bindung und Arbeitsort bleiben getrennt.
21. Gold ist keine normale physische Ware.
22. Gold wird nicht per Carrier transportiert.
23. Bewohner sind die V1-Basis für Steuer-/Goldeinnahmen.
24. Der historische Steuerwert ist kein finaler Balancewert.
25. Goldfortschritt läuft über Simulationszeit/Scheduler.
26. Save/Continue erzeugt keine doppelten Bewohner.
27. Restore erzeugt keine doppelte Steuerzahlung.
28. UI zeigt abgeleitete Population und Economy-State, besitzt ihn nicht.
29. S2D-05D führt kein Bevölkerungswachstums-/Migrationssystem als neuen V1-Scope ein.
30. S2D-05D verändert keinen Gameplay-/Runtime-/UI-Code.

## 34. Abschlussstatus

- Populationmodell: **PASS**
- Housing 2/3 Baseline: **PASS**
- Home-Bindung: **PASS**
- Specialist/Capability-Modell: **PASS**
- Resident Transport Help: **PASS**
- Specialist Priority: **PASS**
- Housing Demolition Safety: **PASS**
- Gold als nicht-physischer Economy-Wert: **PASS**
- Tax-/Goldbasis aus realen Bewohnern: **PASS**
- Balancewerte offen gehalten: **PASS**
- Save/Continue-Konsistenz: **PASS**
- Widersprüche zu S2D-00/01/02/03/04/05A-C: **0**
- Gameplay-/Runtime-/UI-Codeänderungen: **0**
- offene S2D-05D-Blocker: **0**

**S2D-05D – Population, Housing, Specialist & Economy Content Definitions: COMPLETE / 0 BLOCKER**
