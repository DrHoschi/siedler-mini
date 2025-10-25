core - Structur
================
Die Datei core/adfinder.js ist kein veralteter Rest, sondern ein definiertes Kernmodul laut Projekt-Lastenheft v1.0 und Code-Struktur-Vorgaben.
Hier ist der Überblick, wofür sie gedacht ist und wann sie gebraucht wird:

⸻

🧭 Zweck laut Lastenheft

core/adfinder.js – Hybrid-Pathfinding (A + Heatmap-Bias)* ￼

	•	Verantwortung: Pfadfindung für Träger / Einheiten
	•	Schnittstelle: AdFinder.findPath(from, to, opts)
	•	Sendet Events:
	•	cb:path:test:done | fail → Inspector (Tab „Pfade“)
	•	Empfängt Events:
	•	cb:path:test:start → von Inspector-Testtab ausgelöst
	•	Besonderheit:
	•	nutzt „Hybrid A* + Heatmap-Bias“ = klassischer A*-Algorithmus mit Gewichtung durch Heatmap (Trampelpfade, Staus vermeiden)
	•	„Entrances“ = Türkacheln → wird vom Game-Modul geprüft

⸻

🧩 Aktueller Stand (Stub)

Der Code, den du zeigst, ist eine Dummy-/Testversion:

js

function _fakePath(from,to){ return [from,to]; }
class AdFinder{
  static findPath(from,to,opts={}){
    const path=_fakePath(from,to);
    setTimeout(()=>{ window.dispatchEvent(
      new CustomEvent('cb:path:test:done',{
        detail:{ cases:1, avgLen:path.length, blocked:0 }
      })
    ); },50);
    return path;
  }
}

✅ Sie erzeugt Test-Events für den Inspector, damit du im Tab „Pfade“ oder „Tests“ sofort Ergebnisse siehst, ohne echten A*-Algorithmus.
Damit ist sie für Debug-/QA-Tests nötig, bis der echte Pfadfinder eingebaut ist.

⸻

🔗 Verbindung zu anderen Modulen

| Modul | Beziehung | Zweck |
|------|-----------|-------|
| core/game.js | ruft später AdFinder.findPath() auf | berechnet reale Bewegungsrouten |
| core/path-overlay.js | nutzt Pfad-Daten zur Visualisierung | Heatmap / Pfad-Overlay |
| ui/ui-inspector.js | sendet cb:path:test:start / empfängt cb:path:test:done | QA-Tab „Pfade“ |
| core/carrier.js | indirekt, für Transport-KI | Routenberechnung für Träger |

🧱 Fazit – behalten oder löschen?

 | Entscheidung | Begründung |
 |-------|------|
 |🟢 Behalten (Pflichtmodul) | Laut Lastenheft Kap. 3.1 ist core/adfinder.js Bestandteil der Engine – Pfadfinding / Tests sind QA-relevant. |
 | 🟡 Aktuell Stub | dient nur als Platzhalter bis zur echten Implementierung (Hybrid A* + Heatmap). |
 | 🔴 Nicht löschen! | sonst fehlen im Inspector-Tab „Pfade“ die Test-Events (`cb:path:test:done |

💡 Empfehlung
	•	Datei drinlassen, Version 1.0.0 als Stub deklarieren.
	•	Später ersetzen durch echte Implementierung (A* + Heatmap).
	•	Falls du sie „temporär deaktivieren“ willst, kannst du sie leer importieren, aber nicht löschen, da sonst QA-Tests und Inspector-Events brechen.

⸻

Kurzfassung:

core/adfinder.js = Pathfinding-Modul (A* + Heatmap).
Aktuell nur Teststub, aber Pflichtbestandteil der Engine und Inspector-Integration.
➤ Nicht löschen.

====================
