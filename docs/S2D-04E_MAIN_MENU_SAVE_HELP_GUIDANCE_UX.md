# S2D-04E – Main Menu, New/Continue, Save, Help & Guidance Entry UX

Status: **COMPLETE – Bestandteil von S2D-04 UI / MOBILE UX V0.1 DRAFT**  
Datum: 2026-09-02  
Repository: `DrHoschi/siedler-mini`  
Arbeitsbranch: `feature/s2d-04-ui-mobile-ux`  
Verbindliche Basis: S2D-00/01/02/03 FROZEN + S2D-04A/B/C/D COMPLETE

> Konsolidierungshinweis: Dieser Teilblock wird beim späteren S2D-04-Freeze in `docs/S2D-04_UI_MOBILE_UX.md` übernommen. Er ist kein zusätzliches dauerhaftes Masterdokument.

## 1. Ziel

S2D-04E definiert die Spielerführung rund um:

- Startbildschirm,
- Neues Spiel,
- Weiterspielen,
- Save/Continue-Verhalten,
- Ingame-Systemmenü,
- Hilfe,
- Tutorial-/Guidance-Einstieg,
- Neustart der Einführung.

Es wird **kein UI-Code** geschrieben und keine SaveGame-Logik implementiert.

## 2. Zentrale Regel: New Game und Continue sind getrennte Pfade

> **Neues Spiel und Weiterspielen sind fachlich und visuell getrennte Aktionen.**

`Neues Spiel` erzeugt einen neuen autoritativen Spielzustand.

`Weiterspielen` lädt einen vorhandenen gültigen Save-Zustand und rekonstruiert daraus die Runtime gemäß S2D-03D.

Nicht zulässig:

`New Game Defaults -> danach Save darüberlegen`.

Die UI darf diese beiden Pfade nicht durch denselben versteckten Initialisierungsvorgang vermischen.

## 3. Startbildschirm – minimale Hauptstruktur

Der erste Produktkern benötigt bewusst keinen komplexen Launcher.

Primäre Elemente:

1. **Weiterspielen**
2. **Neues Spiel**
3. **Hilfe**
4. **Einstellungen**

Sekundär, soweit technisch/plattformseitig sinnvoll:

- Versionsinformation,
- Impressum/Rechtliches später,
- Entwicklerfunktionen ausdrücklich nicht im normalen Spielerbereich.

## 4. Priorität von „Weiterspielen“

Wenn ein gültiger Save vorhanden ist, ist `Weiterspielen` die bevorzugte primäre Aktion.

Die Startseite darf dazu eine sehr kompakte Save-Zusammenfassung zeigen, z. B.:

- Spielstand vorhanden,
- letzter Speicherzeitpunkt,
- optional Karten-/Siedlungsname später.

Keine detaillierten technischen Save-Daten.

Wenn **kein gültiger Save** vorhanden ist:

- `Weiterspielen` ist deaktiviert oder wird gar nicht als primäre Aktion angeboten,
- `Neues Spiel` wird zur klaren Hauptaktion.

## 5. Ungültiger oder nicht lesbarer Save

Ein defekter/inkompatibler Spielstand darf nicht stillschweigend wie ein neues Spiel gestartet werden.

Die UI zeigt einen verständlichen Zustand, z. B.:

`Spielstand konnte nicht geladen werden.`

Mögliche Spieleroptionen:

- zurück,
- neues Spiel starten,
- später gegebenenfalls weitere Recovery-Optionen, falls technisch vorhanden.

Technische Validator-/Migration-Details gehören in Diagnostics/Inspector, nicht in die normale Meldung.

## 6. Neues Spiel

### 6.1 Grundfluss

Für den ersten Sandbox-Kern:

`Neues Spiel -> ggf. einfache Kartenauswahl -> Start bestätigen -> New-Game-Initialisierung -> Spielwelt`

Wenn zunächst nur eine feste Karte verfügbar ist, darf der Zwischenschritt Kartenauswahl vollständig entfallen.

### 6.2 Vorhandener Save

Wenn `Neues Spiel` einen vorhandenen Save ersetzen würde, ist eine eindeutige Bestätigung erforderlich.

Beispiel:

`Ein vorhandener Spielstand wird durch das neue Spiel ersetzt.`

Aktionen:

- `Abbrechen`
- `Neues Spiel starten`

Das bloße Antippen von `Neues Spiel` darf einen bestehenden Save nicht unmittelbar löschen/überschreiben.

### 6.3 Tutorial beim neuen Spiel

Bei einem neuen Spiel kann die Einführung angeboten bzw. gemäß noch festzulegendem Guidance-Status automatisch gestartet werden.

Mindestens vorgesehen:

- `Mit Einführung starten`
- `Ohne Einführung starten`

Die endgültige visuelle Form kann später festgelegt werden.

## 7. Weiterspielen

Grundfluss:

`Weiterspielen -> Save validieren/migrieren -> Owner restore -> Runtime rekonstruieren -> Gesamtvalidation -> Scheduler starten -> Spielwelt`

Die UI zeigt während dieses Vorgangs einen klaren Ladezustand und erlaubt keine Gameplay-Eingaben, solange Restore noch nicht abgeschlossen ist.

> **Der Spieler sieht die Welt erst als spielbereit, wenn der Restore-Gate erfolgreich abgeschlossen ist.**

Damit wird vermieden, dass zwischenzeitlich unvollständige Gebäude-, Ressourcen-, Unit- oder Pfadzustände sichtbar/interagierbar werden.

## 8. Save-Verhalten im Spiel

S2D-04E unterscheidet die UX von technischer Save-Implementierung.

### 8.1 Manuelles Speichern

Das Systemmenü bietet eine klare Aktion:

`Speichern`

Nach Erfolg erhält der Spieler eine kurze nicht blockierende Bestätigung, z. B.:

`Spiel gespeichert.`

### 8.2 Autosave

Autosave darf zusätzlich existieren.

Die UI muss Autosave nicht permanent hervorheben, sollte aber bei Bedarf einen diskreten Status anzeigen können.

Autosave ersetzt nicht zwingend die manuelle Save-Aktion.

### 8.3 Speichern während kritischer Übergänge

Die UI entscheidet nicht eigenständig, ob ein Save technisch sicher ist.

Sie sendet einen Save-Command an den SaveGameService; dieser erzeugt konsistente Owner-Snapshots gemäß S2D-03.

Die UI darf keine halbfertigen eigenen Zustände in den Save einbauen.

## 9. Save-Feedback

Spielerrelevante Zustände:

- `Speichern…`
- `Spiel gespeichert`
- `Speichern fehlgeschlagen`

Nicht zeigen:

- JSON-Größe,
- localStorage-Key,
- Owner-Snapshot-Interna,
- Serialisierungsstack,
- technische IDs.

Bei Fehlern bleibt das Spiel kontrolliert nutzbar, soweit Runtime selbst gültig ist. Die UI behauptet niemals einen erfolgreichen Save, wenn keiner bestätigt wurde.

## 10. Ingame-Systemmenü

Das Systemmenü ist vom normalen HUD eindeutig erreichbar.

NOW-Struktur:

- `Zurück zum Spiel`
- `Speichern`
- `Hilfe`
- `Einstellungen`
- `Einführung neu starten`
- `Zum Hauptmenü`

Eine klare Hierarchie verhindert, dass seltene Optionen den Hauptspielscreen belasten.

## 11. Verhalten beim Öffnen des Systemmenüs

Für den ersten Kern gilt:

> **Das Öffnen des Systemmenüs pausiert die Simulation.**

Damit kann ein Smartphone-Nutzer das Menü bedienen, ohne dass Produktion, Transporte, Bau und Wirtschaft unbemerkt weiterlaufen.

Diese Pause nutzt denselben autoritativen Simulations-/Pause-Mechanismus und keinen eigenen UI-Timer.

Nach `Zurück zum Spiel` läuft die Simulation kontrolliert weiter.

## 12. Zum Hauptmenü

`Zum Hauptmenü` ist eine bewusste Session-Aktion.

Falls seit dem letzten bestätigten Save relevante Änderungen existieren und das System dies zuverlässig erkennen kann, kann eine Sicherheitsabfrage angeboten werden:

- `Speichern und Hauptmenü`
- `Ohne Speichern`
- `Abbrechen`

Falls Dirty-State-Erkennung im ersten technischen Kern noch nicht verlässlich vorgesehen wird, darf die UX stattdessen bevorzugt `Speichern und Hauptmenü` als sichere Standardaktion verwenden.

Die konkrete technische Dirty-State-Erkennung bleibt Implementierungsdetail und wird hier nicht als neue Domain-Wahrheit eingeführt.

## 13. Hilfe – Spielerbereich

Die Hilfe ist vollständig vom Entwickler-Inspector getrennt.

Sie erklärt in normaler Spielsprache mindestens:

- Kamera bewegen/zoomen,
- Gebäude auswählen,
- bauen,
- Produktion und Pause,
- lokale Waren und Transport zum Rathaus,
- Baustellenmaterial und Bauarbeiter,
- Bewohner und Wohnhäuser,
- Arbeitsbereiche,
- Ressourcen-/Wirtschaftsübersicht,
- Speichern/Weiterspielen.

Die Hilfe darf später wachsen, soll aber keine technische Dokumentation werden.

## 14. Guidance / Einführung – Zweck

Die Einführung soll das Spiel **im Spiel selbst** erklären, ohne einen langen Pflichttext vor dem Start.

Grundprinzip:

> **Kontext zeigen, kurze Handlung erklären, Spieler selbst ausführen lassen.**

Keine dauerhafte Vollbild-Tutorialkette, sofern nicht für einen einzelnen Schritt notwendig.

## 15. Guidance-State

Hinweise besitzen stabile IDs und einen persistierbaren Zustand.

Konzeptionelle Zustände:

- `UNSEEN`
- `SHOWN`
- `COMPLETED`

Später optional:

- `DISMISSED`

Der Zustand wird nicht aus zufälligen UI-Details abgeleitet, sondern gehört dem GuidanceSystem.

## 16. Erste Guidance-Themen

Für den bekannten Kern sind mindestens sinnvoll:

1. Kamera bewegen und zoomen
2. Rathaus/HUD verstehen
3. erstes Wohnhaus bauen
4. Bewohner verstehen
5. erstes Produktionsgebäude bauen
6. Arbeitsbereich verstehen
7. lokale Produktion beobachten
8. physischen Transport zum Rathaus verstehen
9. Baustelle: Materiallieferung
10. Baustelle: Bauarbeiter muss ankommen
11. Gebäude pausieren/fortsetzen
12. Wirtschaftsübersicht öffnen
13. Speichern / Weiterspielen

Diese Liste definiert Themen, noch keine finalen Texte oder Reihenfolge jedes einzelnen Mikro-Schritts.

## 17. Guidance-Auslösung

Gameplay-Systeme erzeugen öffentliche Ereignisse/Fakten.

Das GuidanceSystem entscheidet daraus, ob ein Hinweis relevant ist.

Beispiele:

- `building.placed`
- `construction.materials_complete`
- `construction.builder_arrived`
- `goods.produced`
- `goods.delivered`
- `building.paused`

Die UI erhält anschließend den darzustellenden Guidance-Schritt.

Nicht zulässig:

`UI erkennt intern irgendeine Variable und verändert dafür Gameplay-State`.

## 18. Guidance darf Gameplay nicht fälschen

Ein Tutorial darf:

- UI-Elemente hervorheben,
- auf Weltobjekte zeigen,
- kurze Erklärungen geben,
- einen erwarteten nächsten Schritt markieren.

Es darf nicht:

- Waren teleportieren,
- Baustellen künstlich fertigstellen,
- Worker direkt zuweisen,
- Ressourcen kostenlos erzeugen,
- Builder-Ankunft vortäuschen,
- Produktionsregeln umgehen.

Der Spieler lernt die echte Runtime.

## 19. Wiederholungen und Ruhe

Ein abgeschlossener Einführungsschritt soll nicht bei jedem neuen Spielereignis erneut aufspringen.

Guidance ist deshalb persistent.

Ein Hinweis kann später erneut über die Hilfe geöffnet werden, ohne seinen normalen automatischen Trigger dauerhaft wieder scharfzuschalten.

Ziel:

> **Am Anfang hilfreich, danach ruhig.**

## 20. Einführung neu starten

Das Systemmenü bietet:

`Einführung neu starten`

Diese Aktion benötigt eine kurze Bestätigung, weil sie Guidance-Fortschritt zurücksetzt.

Sie verändert ausschließlich den Guidance-/Tutorialstatus und keinen Gameplay-State.

Nach dem Reset können die vorgesehenen Einführungsschritte erneut ausgelöst werden.

Das aktuelle Spiel selbst bleibt erhalten.

## 21. Hilfe vs. Einführung

### Hilfe

- jederzeit frei aufrufbar,
- Themen nachschlagen,
- keine Fortschrittslogik nötig,
- blockiert/ändert Gameplay nicht.

### Einführung

- kontextbezogen,
- besitzt Fortschritt,
- reagiert auf echte Spielereignisse,
- wird nach Abschluss ruhig,
- kann manuell neu gestartet werden.

Beide Systeme können Inhalte teilen, bleiben aber UX-seitig unterscheidbar.

## 22. Guidance auf Smartphone

Hinweise sollen die Welt möglichst wenig verdecken.

Bevorzugt:

- kurze Callouts,
- Highlight um einen Button oder ein Weltobjekt,
- kleine Bottom-Sheet-/Tooltip-artige Erklärung,
- eindeutige Aktion `Verstanden` / `Weiter`, nur wenn notwendig.

Die Guidance darf wichtige Touch-Ziele nicht gleichzeitig verdecken und deren Betätigung verlangen.

## 23. Überspringen

Der Nutzer kann die Einführung beenden/überspringen.

Das beendet nicht das Spiel und verändert keine Gameplay-Regeln.

Ein späterer Neustart über Hilfe/Systemmenü bleibt möglich.

## 24. New Game + Guidance

Ein neues Spiel setzt den Gameplay-State neu auf.

Der Guidance-State wird davon **nicht automatisch zwingend gelöscht**.

Damit gilt:

- ein erfahrener Spieler muss nicht bei jedem neuen Sandbox-Spiel dieselben Einführungsschritte erneut sehen,
- über `Einführung neu starten` kann er sie bewusst zurücksetzen.

Falls beim Start ausdrücklich `Mit Einführung starten` gewählt wird, darf dieser Vorgang den relevanten Einführungsstatus für die neue Session gezielt aktivieren/resetten.

## 25. Continue + Guidance

Beim Continue wird der persistierte Guidance-Zustand wiederhergestellt.

Ein abgeschlossener Hinweis darf durch Continue nicht plötzlich erneut als ungesehen gelten.

Ein zum Save-Zeitpunkt aktiver Guidance-Schritt darf kontrolliert rekonstruiert oder anhand des aktuellen Gameplay-State sinnvoll neu bewertet werden.

Keine doppelte Tutorialausführung allein durch Restore-Events.

## 26. Hauptmenü- und Systemmenü-Fehlerprävention

Verbindlich:

- `Neues Spiel` überschreibt keinen Save ohne Bestätigung,
- `Zum Hauptmenü` ist von `Zurück zum Spiel` klar getrennt,
- destruktive/reset-artige Aktionen stehen nicht direkt neben häufigen harmlosen Aktionen,
- `Einführung neu starten` ist nicht dasselbe wie `Neues Spiel`,
- `Hilfe` verändert keinen Guidance-Fortschritt allein durch Öffnen,
- `Weiterspielen` startet niemals stillschweigend ein neues Spiel.

## 27. Ladezustände

Für New/Continue/Save werden klar erkennbare Zustände vorgesehen.

Während `Continue`:

- Eingaben zur Welt sind gesperrt,
- keine halbfertige Runtime wird interaktiv,
- bei Erfolg Übergang ins Spiel,
- bei Fehler Rückkehr in kontrollierten Menü-/Fehlerzustand.

Während `Save`:

- keine unnötige Vollbildblockierung, sofern technisch nicht nötig,
- Ergebnis wird bestätigt.

## 28. Plattformgleichheit

Smartphone, Tablet und Desktop nutzen dieselbe semantische Menüstruktur.

Desktop darf ergänzend Hotkeys verwenden, z. B. Escape für Systemmenü, aber keine Kernfunktion hängt davon ab.

Mobile Safe Areas und große Touch-Ziele bleiben verbindlich.

## 29. Technische Ownership

### Main Menu / UI

Besitzt nur Darstellungs-/Navigationszustand.

### SaveGameService

Besitzt Save-/Restore-Prozess und Dokumentvalidierung.

### Boot/Lifecycle

Koordiniert New Game vs. Continue und Runtime-Lifecycle.

### GuidanceSystem

Besitzt Tutorial-/Guidance-Fortschritt und Entscheidung über relevante Hinweise.

### SimulationScheduler

Besitzt autoritative Simulation/Pause.

Die UI übernimmt keine dieser fachlichen Zuständigkeiten.

## 30. Nicht Bestandteil von S2D-04E

Bewusst offen bleiben:

- finale Startbildschirmgrafik,
- Logo/Branding,
- exakte Buttonpositionen,
- finale Menüanimationen,
- mehrere Save-Slots,
- Cloud-Save,
- Accounts,
- Kampagnen-/Szenarioauswahl,
- komplexe Kartenbibliothek,
- endgültige Tutorialtexte,
- Audiooptionen und vollständige Settings-Matrix,
- rechtliche Store-Menüs.

Der erste Kern bleibt bewusst einfach.

## 31. Verbindliche S2D-04E-Invarianten

1. New Game und Continue sind getrennte Lifecycle-Pfade.
2. Continue legt niemals erst einen New-Game-State an und überschreibt ihn danach.
3. `Weiterspielen` ist nur für einen vorhandenen gültigen Save vorgesehen.
4. Ein ungültiger Save startet nicht stillschweigend ein neues Spiel.
5. Neues Spiel überschreibt einen vorhandenen Save nicht ohne Bestätigung.
6. Restore muss erfolgreich abgeschlossen sein, bevor Gameplay interaktiv wird.
7. Speichern wird nur nach bestätigtem Erfolg als erfolgreich angezeigt.
8. UI serialisiert keinen eigenen zweiten Gameplay-State.
9. Systemmenü pausiert im ersten Kern die autoritative Simulation.
10. Hilfe und Inspector bleiben getrennt.
11. Guidance und Hilfe sind unterschiedliche Spielerfunktionen.
12. Guidance basiert auf echten Gameplay-Ereignissen und öffentlichen Verträgen.
13. Guidance darf keine Gameplay-Regeln umgehen.
14. Guidance besitzt stabile persistierbare IDs/Zustände.
15. Abgeschlossene Hinweise werden nicht endlos wiederholt.
16. Einführung kann übersprungen werden.
17. Einführung kann über Hilfe/Systemmenü neu gestartet werden.
18. Tutorialreset verändert keinen Gameplay-State.
19. Continue stellt Guidance konsistent wieder her bzw. rekonstruiert sie kontrolliert.
20. Restore darf durch Guidance keine doppelten Gameplay-Effekte auslösen.
21. Spielerfehlertexte bleiben verständlich und enthalten keine Debug-Interna.
22. Smartphone bleibt vollwertige Referenzplattform.

## 32. Abschluss

S2D-04E – Main Menu, New/Continue, Save, Help & Guidance Entry UX ist **COMPLETE**.

Ergebnis:

- Startbildschirm-Minimalstruktur festgelegt,
- New/Continue eindeutig getrennt,
- Save-/Autosave-Feedback eingegrenzt,
- Ingame-Systemmenü strukturiert,
- Systemmenü-Pause festgelegt,
- Save-Fehler-/Restore-Fehlerverhalten definiert,
- Hilfe und Guidance getrennt,
- Guidance-Persistenz, Trigger, Überspringen und Neustart festgelegt,
- keine Runtime- oder UI-Implementierung verändert.

**Open Blockers: 0**
