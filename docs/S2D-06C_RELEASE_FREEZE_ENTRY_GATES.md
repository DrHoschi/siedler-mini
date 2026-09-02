# S2D-06C – Release Gates, Freeze Criteria & Implementation Entry Conditions

Status: **COMPLETE / 0 BLOCKER**  
Datum: 2026-09-02  
Repository: `DrHoschi/siedler-mini`  
Arbeitsbranch: `feature/s2d-06-roadmap-validation`  
Parent: S2D-06B commit `8c933bbbb35750602a0d8d6110501d9ef3edd8ed`

> Temporäres Teilblockdokument. Beim S2D-06 Freeze vollständig in `S2D-06_ROADMAP_VALIDATION.md` konsolidieren und anschließend löschen.

## 1. Zweck

S2D-06C definiert die formalen Freigabegrenzen zwischen Planung, Implementierungsblöcken und eingefrorenen technischen Zwischenständen.

> **Kein Implementierungsblock startet ohne freigegebenen Parent-Stand; kein Block wird eingefroren ohne nachgewiesenen Exit-Gate; kein Branch wandert weiter, solange ein verpflichtender Nachweis BLOCKED oder FAIL ist.**

## 2. Statusmodell

- **PLANNED** – Umfang/Gate definiert, noch nicht begonnen.
- **READY** – Entry Conditions erfüllt.
- **IN PROGRESS** – produktive Arbeit läuft.
- **BLOCKED** – notwendige Abhängigkeit/Testumgebung/Nachweis fehlt.
- **FAIL** – verpflichtendes Acceptance Criterion verletzt.
- **PASS** – alle verpflichtenden Gates und Evidence erfüllt.
- **FROZEN** – PASS-Stand als verbindlicher Parent festgezogen.

`PASS WITH DEFERRED NON-BLOCKER` darf nur FROZEN werden, wenn kein Deferred-Punkt eine V1-Kerninvariante, den nächsten Entry-Gate oder eine notwendige Migration berührt.

## 3. Globales Entry Gate jedes IM-Blocks

Vor READY müssen erfüllt sein:

1. erwarteter FROZEN/PASS-Parent eindeutig,
2. korrekter Branch direkt vom Parent oder nachweislich identisch,
3. ahead/behind gegen Parent dokumentiert; unerwartete Fremdcommits = BLOCKED,
4. Zielowner, betroffene Module und ausgeschlossener Scope benannt,
5. alle vorausgesetzten Vorgängerblöcke PASS/FROZEN,
6. relevante T1–T4- und VAL-Prüfungen vor Änderung bekannt,
7. Rollback-Commit vorhanden,
8. keine offene Kernregression aus früherem Block,
9. keine ungeklärte neue Produkt-/Architekturentscheidung; andernfalls S2D-07,
10. blockeigener T2-Nachweis grundsätzlich ausführbar.

## 4. Block Entry Record

Vor dem ersten produktiven Commit festhalten:
- Block-ID,
- Parent/Frozen Commit,
- Arbeitsbranch,
- Ziel/Owner,
- erwartete Changed Files/Modulgruppen,
- ausgeschlossene Bereiche,
- Vorgängerblöcke,
- Tests/VAL-IDs,
- Geräte-Gate,
- Rollback-Commit,
- Status READY.

## 5. In-Progress Stop-Regeln

### Scope Expansion
Wenn ein weiterer Owner grundlegend verändert werden müsste: Block stoppen, nicht beiläufig mitnehmen, ggf. Unterblock/Abhängigkeit definieren und neues Entry-Gate durchführen.

### Neue fachliche Entscheidung
Wenn eingefrorene Regeln unvollständig/widersprüchlich erscheinen: keine spontane Codeentscheidung; BLOCKED, S2D-07-Entscheidung, danach kontrollierte Aktualisierung.

### Regression außerhalb Scope
Eine neu verursachte Kernregression wird im aktuellen Block geklärt oder auf den letzten FROZEN-Stand zurückgeführt; sie wird nicht in den nächsten Block verschoben.

### Neuer Guard/Patch
Ein Guard zum „Grünmachen“ bedeutet standardmäßig FAIL/BLOCKED. Temporär nur mit dokumentiertem Grund, Zielowner, Exit-Gate und Entfernungspunkt; niemals als neue Dauerarchitektur.

## 6. Exit Gate jedes IM-Unterblocks

PASS nur wenn:
1. Scope vollständig,
2. Changed Files plausibel,
3. T1 PASS,
4. T2 PASS,
5. bisherige relevante Invarianten PASS,
6. erforderliche T3/T4 PASS,
7. Geräte-PASS vorhanden oder laut Matrix erst am Hauptblock-Exit fällig,
8. keine zweite Ownership,
9. keine neue versteckte Timer-/Self-Start-/Patchstruktur,
10. Evidence vollständig,
11. nur dokumentierte echte Non-Blocker offen.

## 7. Freeze Criteria eines IM-Hauptblocks

FROZEN erst wenn:
- alle Pflicht-Unterblöcke PASS,
- Hauptblock-VAL-Zuordnung PASS,
- vorgeschriebene T3/T4 PASS,
- vorgeschriebenes Geräte-Gate PASS,
- Legacy-Exit nur nach vollständiger Ownerübernahme,
- keine Kernregression/ungeklärte Ownership/ungeklärte Save-Lifecycle-Auswirkung,
- alle Changed Files bewertet,
- finaler Commit eindeutig,
- Branch gegen Parent/Startstand geprüft,
- Status/Evidence aktualisiert.

Nur dieser FROZEN-Commit ist regulärer Parent des nächsten Hauptblocks.

## 8. Branch-Weiterwanderung

Regel:
`FROZEN Parent -> IM-Branch -> PASS -> FROZEN -> nächster Block`

Kein späterer Block basiert auf zufälligem Zwischencommit eines unfertigen Vorgängers. Parallel erlaubt ist nur isolierte vorbereitende Dokument-/Testarbeit ohne vorgezogene produktive Zielownership.

## 9. Main-/Merge-Regel

S2D-06C erteilt keine automatische Merge-Freigabe nach `main`.
- main bleibt unangetastet bis ausdrücklicher Merge-Schritt,
- FROZEN = verbindlicher Entwicklungsstand, nicht automatisch gemerged,
- nur PASS/FROZEN darf Mergequelle sein,
- BLOCKED/FAIL/IN PROGRESS nie nach main,
- vorgeschriebene Regression/Gerätegates müssen vor Meilenstein-Merge erfüllt sein.

## 10. Deferred Non-Blocker

Nur zulässig wenn:
- keine V1-Kernregel verletzt,
- keine Daten-/Waren-/Personeninkonsistenz,
- kein Save/Continue-Risiko,
- kein Navigation-Hotloop/Leak,
- kein unbedienbarer Mobile-Core-Flow,
- keine Voraussetzung des nächsten Blocks,
- späterer Zielblock/Tuningbereich benannt.

Zulässig z. B. Balancewert, kosmetische Animation, nicht-blockierende Inspector-Darstellung.
Nicht zulässig z. B. Bau vor Builder-Ankunft, doppelte Ware, State-Verlust bei Continue, Resident-Type-Mutation, Overdelivery, Doppel-Scheduler, unerreichbare Smartphone-Kernaktion.

## 11. Release Gate vor Legacy-Entfernung

1. Zielowner implementiert,
2. Regression mit Legacy aktiv PASS,
3. keine alleinige Fachverantwortung mehr im Legacy-Code,
4. Legacy entfernen,
5. gleiche Regression erneut PASS,
6. Restreferenzen prüfen,
7. erst dann Removal PASS/FROZEN.

## 12. Save-/Lifecycle-Gate

Vor Änderungen an New Game/Continue/Scheduler-Start/Restore/Storage:
- Referenz-Save/Testzustand vorhanden,
- persistente Owner-State-Liste bekannt,
- additive Defaults bei Continue explizit als verbotener Effekt getestet,
- Scheduler-/Subscription-Zählung messbar,
- Rollback vorhanden,
- echter Browser-/Reload-Test spätestens am Exit eingeplant.

Korruptes/inkompatibles Save: fail-closed, kein stiller New-Game-Fallback.

## 13. Mobile-/Rendering-Gate

Vor IM-12/14 und anderen Touch-/Renderänderungen:
- kleines Smartphone als Pflichtziel benannt,
- betroffene Kerninteraktionen definiert,
- Darstellung besitzt keine Gameplay-Ownership,
- Desktop-PASS ersetzt Mobile-PASS nicht.

## 14. Entry Conditions für technische Implementierung nach S2D-06

IM-00 darf erst beginnen, wenn S2D-06 selbst FROZEN ist und:
1. S2D-00…05 FROZEN/PASS/0 BLOCKER,
2. S2D-06A COMPLETE,
3. S2D-06B COMPLETE,
4. S2D-06C COMPLETE,
5. S2D-06 Internal Consistency & Freeze Gate PASS,
6. keine widersprüchliche Blockreihenfolge,
7. IM-00…17 besitzen Exit-/Acceptance-Gates,
8. Gerätepflichten eindeutig,
9. Legacy-Entfernung besitzt Exit-Regeln,
10. während S2D-06 keine produktive Codeänderung vorgezogen,
11. finaler S2D-06-Frozen-Commit bekannt,
12. Implementierungsbranch direkt davon erzeugt.

## 15. IM-00 Entry Gate

Nach S2D-06 Freeze:
- Implementierungsbranch direkt vom Frozen Commit,
- Branch/HEAD identisch zum Parent,
- produktiver Referenzstand startbar,
- echter Referenz-Gerätetest des Altstands möglich,
- Save/Continue grundsätzlich testbar,
- Diagnose/Baseline ohne Gameplay-Reparatur möglich,
- keine neue Produktentscheidung nötig.

IM-00 darf Baseline und Test-/Diagnoseharness vorbereiten, aber keine Migration aus IM-01+ vorziehen.

## 16. IM-00 Freeze Gate

FROZEN wenn:
- Referenzcommit/Bootpfad dokumentiert,
- Core-Smoke-Checklist reproduzierbar,
- Diagnostic Baseline erfasst,
- Timer-/Interval-/Scheduler-Ausgangslage nachvollziehbar,
- New Game/Continue als Referenzabläufe dokumentiert,
- bekannte bestehende Fehler als Baseline Issues getrennt erfasst,
- keine fachliche Funktion absichtlich verändert,
- Geräte-Referenzcheck abgeschlossen,
- Evidence vollständig.

Erst danach IM-01 READY.

## 17. Known Baseline Issues

Ein vor IM-00 reproduzierbarer Fehler wird `KNOWN BASELINE ISSUE`:
- blockiert IM-00 nicht automatisch, wenn sichere Messung möglich bleibt,
- darf später nur als Altfehler gelten, wenn im FROZEN IM-00 nachgewiesen,
- Verschlechterung in Häufigkeit/Auswirkung/Datenkonsistenz = neue Regression,
- Zielprobleme späterer IM-Blöcke dürfen als Altprobleme bestehen, müssen aber spätestens am vorgesehenen Exit geschlossen sein.

## 18. Release Evidence Record

Für jeden FROZEN-Hauptblock mindestens:
- Block-ID/Titel,
- Parent Commit,
- Start Branch/HEAD,
- End Commit,
- Changed Files,
- veränderte Owner/Contracts,
- entfernte Legacy-Komponenten,
- T1/T2/T3/T4,
- VAL-IDs,
- Geräte/Browser,
- Performancevergleich falls relevant,
- Known Baseline Issues,
- Deferred Non-Blocker,
- Open Blockers = 0,
- Freeze Decision = PASS/FROZEN.

## 19. Stop-the-Line Criteria

Weiterwanderung stoppt bei:
- Datenverlust/Warenverdopplung,
- Resident-/Unit-Duplikation,
- neuer SaveGame-Korruption,
- Continue mit additiven Defaults,
- Baufortschritt ohne Builder-Ankunft nach zuständigem Construction-Gate,
- neuem Navigation-Hotloop,
- unkontrolliert wachsendem Timer-/Subscription-/Job-/Reservation-State,
- zweitem autoritativen Owner,
- notwendigem undokumentiertem Runtime-Patch,
- nicht reproduzierbarem Branch-/Parent-Stand,
- erforderlichem Geräte-Gate FAIL.

Letzter FROZEN-Commit bleibt dann verbindliche Basis.

## 20. Abschlussstatus

- Statusmodell: PASS
- Global Entry Gate: PASS
- Block Entry Record: PASS
- Stop-/Change-Control-Regeln: PASS
- Unterblock Exit Gate: PASS
- Hauptblock Freeze Criteria: PASS
- Branch-Weiterwanderung: PASS
- Main-/Merge-Regel: PASS
- Deferred-Non-Blocker-Grenzen: PASS
- Legacy-Removal Gate: PASS
- Save/Lifecycle Gate: PASS
- Mobile/Rendering Gate: PASS
- S2D-06 -> IM-00 Entry Conditions: PASS
- IM-00 Entry/Freeze Gate: PASS
- Known-Baseline-Issue-Regel: PASS
- Evidence Record: PASS
- Stop-the-Line Criteria: PASS
- Gameplay-/Runtime-/UI-Codeänderungen: 0
- offene S2D-06C-Blocker: 0

**S2D-06C – Release Gates, Freeze Criteria & Implementation Entry Conditions: COMPLETE / 0 BLOCKER**

Nächster zulässiger Planungsblock: **S2D-06D – Internal Consistency & Roadmap Freeze Gate**. Dort A/B/C gegen S2D-00…05 prüfen, dieses temporäre C-Dokument in den dauerhaften Master konsolidieren, temporäre Datei entfernen und nur bei 0 Blockern `S2D-06 V0.1 FROZEN – PASS / 0 BLOCKER` setzen.