# 📘 Event-Protokoll – Standardübersicht
**Projekt:** Neue Siedler  
**Datei:** `docs/event-protocol.md`  
**Version:** v1.0.0  
**Stand:** 2025-10-15  
**Autor:** A. Mann & GPT-5  
**Zweck:** Einheitliche Dokumentation aller internen Event-Kanäle  
*(cb: Callback / Broadcast, req: Request, emit: Signal)*  

---

## 🧭 Grundprinzip

Das gesamte Spielsystem (z. B. Registry, HUD, Build-System, Inspector, Runtime) kommuniziert **ereignisgesteuert** über einen zentralen Event-Bus (`GameEvents` oder `core/events.js`).  
Drei Präfixe legen Richtung und Bedeutung fest:

| Kürzel | Richtung | Bedeutung | Beschreibung |
|:-------|:----------|:-----------|:--------------|
| `cb:`  | System → Module | **Callback / Broadcast** | Das System meldet etwas, was passiert ist (z. B. Laden abgeschlossen, Änderung erfolgt). |
| `req:` | Module → System | **Request / Anfrage** | Ein Modul fordert aktiv Daten, Zustände oder Aktionen an. |
| `emit:` | beliebig | **Emit / Signal** | Ein Modul löst aktiv ein Ereignis aus, das andere abonnieren können. |

---

## 🧩 Aktuell verwendete Standard-Events

### 🔹 Registry-System
| Event | Richtung | Beschreibung | Antwort / Folgeaktion |
|:------|:----------|:--------------|:-----------------------|
| `cb:registry:ready` | System → HUD / Build | Wird gesendet, wenn die Registry (Gebäude, Ressourcen, etc.) vollständig geladen ist. | HUD initialisiert Ressourcenanzeigen, Build-Menü erzeugt Kategorien. |
| `req:registry:data` | HUD / Inspector → Registry | Fordert vollständige Registry-Datenstruktur an. | Gibt JSON-Objekt aller Einträge zurück. |

---

### 🔹 Ressourcen-System
| Event | Richtung | Beschreibung | Antwort / Folgeaktion |
|:------|:----------|:--------------|:-----------------------|
| `req:res:snapshot` | HUD / Inspector → Ressourcenmodul | Aktueller Ressourcenstand wird angefordert. | Antwortet mit `{ wood, stone, fish, … }`. |
| `cb:res:change` | System → HUD / Log | Ressourcenänderung (Zuwachs / Verbrauch). | HUD aktualisiert Anzeige; Log vermerkt Änderung. |
| `cb:res:reset` | System → HUD | Setzt alle Ressourcen auf Startwerte zurück. | HUD aktualisiert Anzeige und setzt Zahlen auf 0. |
| `emit:res:update` | Ressourcenmodul → alle | Manuell ausgelöst, um HUD / Inspector neu zu synchronisieren. | HUD führt Refresh durch. |

---

### 🔹 HUD-System
| Event | Richtung | Beschreibung | Antwort / Folgeaktion |
|:------|:----------|:--------------|:-----------------------|
| `cb:hud-ready` | HUD → Inspector / System | Meldet, dass das HUD-Interface vollständig aufgebaut ist. | Inspector kann danach Elemente referenzieren. |
| `req:hud:focus` | System / Inspector → HUD | Fokus auf bestimmte Ressource setzen. | HUD hebt Ressourcenzelle visuell hervor. |
| `emit:hud:highlight` | HUD → Log / Debug | Nutzerinteraktion oder Auswahländerung. | Wird in Debug-Konsole protokolliert. |

---

### 🔹 Build-Menü
| Event | Richtung | Beschreibung | Antwort / Folgeaktion |
|:------|:----------|:--------------|:-----------------------|
| `cb:build:ready` | System → HUD / Inspector | Wird gesendet, wenn das Baumenü initialisiert wurde. | Inspector kann danach Baumenü prüfen. |
| `req:build:categories` | HUD / Inspector → Build | Gibt alle Kategorien mit Label & Icon zurück. | JSON-Antwort: `[ {id, label, icon}, … ]` |
| `emit:build:select` | Build-UI → Game | Spieler wählt ein Gebäude aus. | Game aktiviert Platzierungsmodus. |
| `emit:build:confirm` | Build-UI → Game | Platzierung bestätigt. | Game zieht Kosten ab, erzeugt Gebäude. |
| `emit:build:cancel` | Build-UI → Game | Platzierung abgebrochen. | Game kehrt in Normalmodus zurück. |

---

### 🔹 Game-/Runtime-System
| Event | Richtung | Beschreibung | Antwort / Folgeaktion |
|:------|:----------|:--------------|:-----------------------|
| `cb:game:ready` | System → alle | Spiel ist initialisiert, Karte geladen. | HUD, Build, Inspector starten. |
| `req:map:tileinfo` | Debug / Inspector → Map | Liefert Infos zu angeklicktem Tile. | Gibt Tile-Koordinaten & Inhalt zurück. |
| `emit:unit:spawned` | Runtime → Log / Inspector | Einheit wurde erstellt. | Log-Eintrag & Marker in Inspector. |

---

### 🔹 Inspector-System
| Event | Richtung | Beschreibung | Antwort / Folgeaktion |
|:------|:----------|:--------------|:-----------------------|
| `cb:inspector:ready` | Inspector → System | Inspector-UI ist bereit. | Andere Module können Debug-Tabs hinzufügen. |
| `req:inspector:addTab` | System / Tools → Inspector | Fügt neuen Tab/Editor hinzu. | Inspector aktualisiert Registerkarte. |
| `emit:inspector:log` | Beliebig → Inspector | Log-Nachricht für Debug-Tab. | Nachricht wird in UI angezeigt. |

---

## 🧮 Technische Hinweise

- **Eventnamen sind durch Doppelpunkte getrennt:**  
  `cb:<Bereich>:<Aktion>` / `req:<Bereich>:<Aktion>` / `emit:<Bereich>:<Aktion>`.
- **Namenskonvention:** immer klein, mit klarer Domäne (`res`, `hud`, `build`, `map`, `game`, `inspector`).
- **Einheitliche Parameterübergabe:** immer als Objekt (`{}`), nie als Einzelparameter.  
  → erleichtert Logging und zukünftige Erweiterungen.
- **Logging:** jedes `emit:`-Event sollte (wenn Debug aktiv ist) im Inspector-Tab *Logs* erscheinen.

---

## 🧩 Beispiel – Ablaufkette

```text
boot.js
  → emit(cb:registry:ready)
       ↓
    ui-hud.js (on cb:registry:ready)
       → emit(req:res:snapshot)
            ↓
         core/registry.js (on req:res:snapshot)
            → emit(cb:res:change)
                 ↓
              ui-hud.js aktualisiert Anzeige
