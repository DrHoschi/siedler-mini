# S2D-02 – UNIT & WORKFORCE MODEL

Status: **V0.1 DRAFT – S2D-02A COMPLETE**  
Datum: 2026-09-01  
Repository: `DrHoschi/siedler-mini`  
Arbeitsbranch: `feature/s2d-02-unit-workforce`  
Verbindliche Basis: `S2D-00 PROJECT MASTER V0.1 FROZEN` + `S2D-01 GAME DESIGN V0.1 FROZEN`

## 1. Zweck

S2D-02 definiert das fachliche Modell für Personen, Arbeiter, Rollen, Fähigkeiten, Aufgaben und deren sichtbares Verhalten.

S2D-02A legt zunächst nur das Fundament fest:

- dauerhafte Unit-Identität,
- Unit-Arten,
- Fähigkeiten/Capabilities,
- Spezialisierungen,
- temporäre Assignments,
- klare Trennung zwischen Bewohner, Beruf und aktueller Aufgabe.

Noch nicht Teil von S2D-02A sind die vollständige State-Machine, konkrete Jobprioritäten, Scheduler-Algorithmen, technische Klassen/APIs oder Balancewerte.

## 2. Zentrale Grundregel: Identität wird nicht für einen Job umgeschrieben

Eine Unit besitzt eine dauerhafte fachliche Identität.

> **Eine temporäre Aufgabe darf den Unit-Typ bzw. die Identität der Person nicht verändern.**

Insbesondere ist das historische Verhalten

`resident -> type=carrier -> Transport -> type=resident`

keine Zielarchitektur.

Stattdessen gilt:

`Unit-Identität + Fähigkeiten + aktuelles Assignment`

Beispiel:

`Bewohner + CAN_SIMPLE_TRANSPORT + Assignment Transport`

Die Person bleibt während des gesamten Vorgangs Bewohner.

## 3. Drei getrennte Ebenen

### 3.1 Identität

Die Identität beschreibt, **was die Unit dauerhaft ist**.

Für Personen des V1-Kerns ist die grundlegende Identität `Person/Bewohner der Siedlung`.

Eine Person besitzt eine stabile Unit-ID und kann zusätzlich dauerhaft an ein Zuhause gebunden sein.

### 3.2 Spezialisierung / Beruf

Die Spezialisierung beschreibt, **für welche fachlichen Arbeiten eine Person vorgesehen bzw. ausgebildet ist**.

Beispiele:

- allgemeiner Bewohner,
- Träger,
- Bauarbeiter,
- Holzfäller,
- Steinmetz/Steinbrucharbeiter,
- Fischer,
- Jäger.

Die konkrete technische Repräsentation als Beruf, Rolle, Definition oder Capability-Set wird erst in S2D-03 festgelegt.

### 3.3 Assignment

Das Assignment beschreibt, **was die Unit gerade konkret tut bzw. tun soll**.

Beispiele:

- keine Aufgabe / Freizeit,
- einfacher Warentransport,
- Bauauftrag,
- Baum bearbeiten,
- Stein abbauen,
- fischen,
- jagen,
- zum Arbeitsplatz laufen,
- zum Zuhause zurückkehren.

Ein Assignment ist temporär und verändert weder Identität noch dauerhaft die Spezialisierung.

## 4. Unit-Kategorien des V1-Kerns

### 4.1 Personen

Alle menschlichen Bewohner/Arbeiter sind Personen der Siedlung.

Gemeinsame fachliche Eigenschaften:

- stabile Identität,
- Position in der Welt,
- Bewegungsfähigkeit,
- gegebenenfalls Home-Bindung,
- Capability-Set,
- aktuelles Assignment,
- aktueller sichtbarer Aktivitätszustand.

### 4.2 Tiere

Tiere sind ebenfalls sichtbare bewegliche Units, gehören aber **nicht** zum Workforce-Modell.

Sie besitzen keine Bewohnerrolle, kein Arbeitsassignment und keine berufliche Spezialisierung.

Jagd kann Tiere als reale Ziele verwenden. Die konkrete Tierarten-/Verhaltensdefinition gehört in S2D-05 bzw. technische Details in S2D-03.

## 5. Bewohner / Resident

Ein Bewohner ist eine Person mit dauerhafter Zugehörigkeit zur Siedlung und grundsätzlich einer Home-Bindung.

Für den V1-Kern gilt:

- Bewohner entstehen durch Wohnraum nach den festgelegten Wohnregeln.
- Sie bleiben Bewohner, auch wenn sie arbeiten.
- Ihr Zuhause bleibt erhalten, solange kein später definierter Umzug/Abrissfall dies ändert.
- Ohne Assignment dürfen sie zuhause bleiben oder Freizeitverhalten zeigen.
- Freie geeignete Bewohner dürfen einfache allgemeine Aufgaben unterstützen.

`Resident` ist damit keine Bezeichnung für „arbeitslos“, sondern beschreibt die Person als Einwohner der Siedlung.

## 6. Spezialisten

Spezialisten sind Personen mit fachlicher Eignung für bestimmte Arbeiten.

Im aktuellen Kern werden mindestens folgende Spezialisierungen berücksichtigt:

- Carrier/Träger,
- Builder/Bauarbeiter,
- Lumberjack/Holzfäller,
- Quarry Worker/Steinbrucharbeiter,
- Fisher/Fischer,
- Hunter/Jäger.

Ein Spezialist bleibt ebenfalls Bewohner/Person der Siedlung. Seine Spezialisierung ergänzt die Identität, ersetzt sie nicht.

Damit ist fachlich möglich:

`Person -> wohnt in Haus X -> Spezialisierung Jäger -> aktuelles Assignment Jagd`

und später wieder:

`Person -> wohnt in Haus X -> Spezialisierung Jäger -> aktuell frei / Rückkehr nach Hause`

## 7. Capability-Modell

Capabilities beschreiben, **welche Arten von Aufgaben eine Unit grundsätzlich übernehmen darf**.

Für den V1-Kern werden fachlich mindestens folgende Fähigkeiten benötigt:

- `CAN_MOVE` – kann sich selbstständig bewegen,
- `CAN_SIMPLE_TRANSPORT` – kann einfache physische Waren transportieren,
- `CAN_BUILD` – darf Bauarbeit ausführen,
- `CAN_LUMBERJACK` – darf Holzfällerarbeit ausführen,
- `CAN_QUARRY` – darf Steinbrucharbeit ausführen,
- `CAN_FISH` – darf Fischereiarbeit ausführen,
- `CAN_HUNT` – darf Jagdarbeit ausführen.

Die Namen sind fachliche Arbeitsbegriffe, keine festgelegten technischen Enum-Namen.

## 8. Capability-Regeln

1. Ein Assignment darf nur an eine Unit vergeben werden, die die notwendige Capability besitzt.
2. Capabilities dürfen nicht spontan nur deshalb hinzugefügt werden, weil gerade kein passender Worker gefunden wurde.
3. Ein freier Bewohner besitzt im V1 grundsätzlich die Möglichkeit, für **einfache allgemeine Transporte** eingesetzt zu werden, sofern er nicht durch eine höher priorisierte eigene Aufgabe gebunden ist.
4. Spezialarbeiten wie Bauen, Holzfällen, Steinabbau, Fischen und Jagen benötigen die passende fachliche Capability.
5. Eine Capability ist keine aktuelle Tätigkeit. `CAN_BUILD` bedeutet nicht, dass die Person gerade baut.
6. Ein Assignment ist keine Capability. Ein Transportjob darf eine ungeeignete Unit nicht nachträglich zum Träger „machen“.

## 9. Allgemeiner Bewohner als Transporthilfe

Die bereits im Master festgelegte Transporthilfe freier Bewohner wird folgendermaßen interpretiert:

`freier Bewohner -> besitzt CAN_SIMPLE_TRANSPORT -> erhält temporäres Transport-Assignment -> führt Pickup/Transport/Delivery aus -> Assignment endet -> Bewohner ist wieder frei -> Rückkehr/Freizeit`

Dabei gilt:

- Unit-Typ bleibt unverändert,
- Home-Bindung bleibt unverändert,
- keine dauerhafte Carrier-Spezialisierung entsteht,
- ein geeigneter freier Spezialist/Carrier hat grundsätzlich Vorrang,
- der Bewohner kann nach Abschluss wieder seinem normalen Lebensverhalten folgen.

Damit wird das gewünschte sichtbare „Bewohner helfen mit“ erhalten, ohne die historische Typmutation.

## 10. Carrier / Träger

Ein Carrier ist eine Person mit dauerhafter bzw. definierter Transport-Spezialisierung.

Er besitzt mindestens die Capability für einfache Warenlogistik und ist für Transportaufgaben gegenüber allgemeinen Hilfsbewohnern bevorzugt.

Carrier ist fachlich **nicht** gleichbedeutend mit `jede Unit, die gerade Ware trägt`.

Ein Bewohner kann Ware tragen, ohne dadurch Carrier zu werden.

## 11. Builder / Bauarbeiter

Ein Builder ist eine Person mit `CAN_BUILD`.

Nur eine entsprechend geeignete Person darf den Bauzustand einer vollständig belieferten Baustelle tatsächlich fortsetzen.

Verbindlich bleibt:

`Material vollständig -> Builder-Assignment -> Builder läuft zur Baustelle -> Builder kommt tatsächlich an -> Baufortschritt darf beginnen`

Ein allgemeiner Bewohner ohne Bau-Capability darf nicht automatisch zum Builder umgewandelt werden, nur weil eine Baustelle wartet.

## 12. Produktionsspezialisten

### Holzfäller

Benötigt die fachliche Fähigkeit für Holzfällerarbeit und darf reale gültige Bäume im Arbeitsbereich bearbeiten.

### Steinbrucharbeiter

Benötigt die fachliche Fähigkeit für Steinabbau und darf reale gültige Steinquellen bearbeiten.

### Fischer

Benötigt die fachliche Fähigkeit für Fischereiarbeit und darf gültige Fisch-/Arbeitsbereiche nutzen.

### Jäger

Benötigt die fachliche Fähigkeit für Jagd und darf reale geeignete Tiere als Ziele verwenden.

Diese Spezialisierungen dürfen nicht durch beliebige freie Bewohner ersetzt werden, solange S2D-00/S2D-01 dies nicht ausdrücklich erweitern.

## 13. Mehrere Fähigkeiten

Das Modell verbietet nicht grundsätzlich, dass eine Person mehrere Capabilities besitzt.

Für den V1-Kern gilt jedoch:

- Fähigkeiten werden bewusst durch Definition/Spezialisierung vergeben,
- nicht opportunistisch während der Jobvergabe,
- mehrere Fähigkeiten dürfen keine unkontrollierten Rollenwechsel erzeugen,
- welche konkreten Spezialisierungen kombinierbar sind, bleibt für spätere Detail-/Contententscheidungen offen.

Damit bleibt das Modell erweiterbar für spätere Berufe, Werkzeuge, Ausbildung oder Umschulung, ohne den V1-Kern unnötig zu verkomplizieren.

## 14. Home-Bindung und Beruf sind unabhängig

Das Zuhause einer Person und ihre Arbeitsfähigkeit sind getrennte Eigenschaften.

Beispiele:

- Bewohner A wohnt im kleinen Haus und ist aktuell frei.
- Bewohner B wohnt im mittleren Haus und ist Carrier.
- Bewohner C wohnt im kleinen Haus und ist Jäger.

Arbeit darf die Home-Bindung nicht überschreiben.

Nach Ende einer Aufgabe kann eine Person wieder in ihr normales Home-/Freizeitverhalten zurückkehren.

Die genaue Rückkehrlogik wird in einem folgenden S2D-02-Block definiert.

## 15. Aktueller Zustand ist nicht Identität

Sichtbare Zustände wie

- zuhause,
- idle,
- unterwegs,
- arbeitet,
- trägt Ware,
- wartet,
- kehrt zurück

beschreiben nur den momentanen Ablauf.

Sie dürfen nicht als Ersatz für Identität oder Beruf verwendet werden.

Beispiel:

`Jäger + unterwegs + trägt Fleisch`

bleibt fachlich dieselbe Person und derselbe Jäger.

## 16. Job und Assignment

Ein Job beschreibt einen vorhandenen Arbeitsbedarf der Simulation.

Ein Assignment ist die konkrete Zuordnung dieses Bedarfs zu einer geeigneten Unit.

Damit gilt:

`Bedarf/Job -> Eignungsprüfung -> geeignete Unit -> Assignment -> Ausführung -> Abschluss/Freigabe`

JobEngine und Unit dürfen dadurch nicht zwei unabhängige Wahrheiten darüber besitzen, wer welche Arbeit ausführt. Die technische Ownership wird in S2D-03 präzisiert.

## 17. Keine implizite Qualifikation durch Mangel

Ein Arbeitskräftemangel ist ein echter wirtschaftlicher Zustand.

Wenn kein geeigneter Builder, Fischer oder Jäger verfügbar ist, darf das System den Mangel nicht unsichtbar machen, indem es irgendeinen freien Bewohner umtypisiert.

Der Spieler soll erkennen können:

- Spezialist fehlt,
- Spezialist ist beschäftigt,
- geeignete Person ist unterwegs,
- allgemeine Transporthilfe ist knapp.

Damit bleibt die in S2D-01 definierte wirtschaftliche Lesbarkeit erhalten.

## 18. Save/Continue-Invariante

Save/Continue muss die dauerhaften Personeneigenschaften konsistent erhalten.

Mindestens fachlich relevant sind:

- stabile Unit-Identität,
- Home-Bindung,
- dauerhafte Spezialisierung/Capabilities,
- relevante laufende Arbeit bzw. ein eindeutig rekonstruierbarer Zustand.

Ein Reload darf nicht dazu führen, dass Bewohner plötzlich andere Berufe erhalten oder ein temporäres Assignment zur dauerhaften Identität wird.

Die konkrete Snapshot-/Restore-Struktur gehört in S2D-03.

## 19. Inspector-/Diagnoseanforderung

Der spätere Runtime-Inspector soll für eine Person getrennt anzeigen können:

- Unit-ID,
- Home,
- Spezialisierung,
- Capabilities,
- aktuelles Assignment,
- aktuellen Aktivitäts-/Bewegungszustand,
- gegebenenfalls Ziel/Job.

Gerade diese Trennung soll Fehler wie die historische Resident-zu-Carrier-Typmutation schnell sichtbar machen.

Der Inspector besitzt dabei keine Workforce-Business-Logik.

## 20. S2D-02A Invarianten

1. Eine Person behält ihre stabile Identität über Aufgaben hinweg.
2. Bewohner bleiben Bewohner, auch während Arbeit und Transport.
3. Home-Bindung und Beruf sind getrennte Eigenschaften.
4. Spezialisierung und aktuelles Assignment sind getrennt.
5. Capabilities bestimmen Eignung; Jobs erzeugen keine Capabilities.
6. Allgemeine Bewohner dürfen im V1 einfache Transporte unterstützen.
7. Spezialisten haben bei geeigneten Aufgaben grundsätzlich Vorrang vor Hilfsbewohnern.
8. Spezialarbeiten benötigen passende Capabilities.
9. Ein Assignment ist temporär und darf keine dauerhafte Typmutation verursachen.
10. Jobbedarf und Unit-Assignment dürfen nicht als zwei unabhängige Wahrheiten auseinanderlaufen.
11. Save/Continue darf temporäre Tätigkeit nicht zur dauerhaften Identität machen.
12. Arbeitskräftemangel darf nicht durch versteckte automatische Umqualifizierung kaschiert werden.

## 21. Was S2D-02A bewusst offen lässt

Noch nicht festgelegt werden:

- vollständige Unit-State-Machine,
- genaue Idle-/Home-/Freizeit-Timer,
- konkrete Assignment-Lebenszyklen,
- genaue Jobprioritäten,
- genaue Auswahl zwischen mehreren geeigneten Units,
- maximale parallele Assignments,
- Verhalten bei Pause während laufender Arbeit,
- Abbruch-/Retry-/Backoff-Details,
- konkrete Carrier-Tragmenge,
- Startzahl der Spezialisten,
- Herkunft/Erzeugung neuer Spezialisten,
- Umschulung/Ausbildung,
- Umzug von Bewohnern,
- Bewohnerbehandlung beim Hausabriss,
- technische Klassen, Enums, APIs und Stores.

Diese Punkte werden in den folgenden S2D-02-Blöcken bzw. in S2D-03 und S2D-05 dort festgelegt, wo sie hingehören.

## 22. Abschluss S2D-02A

Das Identitäts-, Spezialisierungs- und Capability-Fundament des Workforce-Modells ist damit fachlich definiert.

**S2D-02A – Unit Types, Identity & Capability Model: COMPLETE**  
**Implementation changes: 0**  
**Product scope conflict gegenüber S2D-00/S2D-01 FROZEN: 0**
