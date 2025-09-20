# Neue Siedler – Epoche 1 · Schemata (Mermaid)

Dieses Dokument bündelt alle aktuellen Diagramme (Stand 2025-09-20).
Die Diagramme sind direkt in **Mermaid** eingebettet und können im Repo mit deinem Viewer angezeigt werden.

**Hinweis:** Der Editor liegt unter `tools/diagram-editor/` und kann lokale `.mmd` laden oder dieses Dokument kopieren.

---

## 04_figuren_epoche1

```mermaid

%% ============================================================================
%% Siedler-Mini — Epoche 1 — Figuren & Items (Mermaid)
%% Version: v1.0.0 (2025-09-20)
%% Render: https://mermaid.live  oder GitHub/Markdown-Viewer mit Mermaid
%% ============================================================================
flowchart LR
  %% Figuren
  villager["Dorfbewohner"]
  porter["Träger"]
  lumber["Holzfäller"]
  fisher["Fischer"]
  mason["Steinmetz"]

  %% Ressourcen
  food["Nahrung (Fisch)"]
  wood["Holzstamm"]
  fish["Fisch"]
  stone["Steinblock"]
  pop["Bevölkerung"]

  %% Werkzeuge
  axe["Axt"]
  rod["Angel / Speer / Netz"]
  hammer["Hammer / Meißel"]

  %% Beziehungen
  villager -->|zugewiesen| porter
  villager -->|wird| lumber
  villager -->|wird| fisher
  villager -->|wird| mason
  villager -->|repräsentiert| pop

  porter -->|transportiert| wood
  porter -->|transportiert| fish
  porter -->|transportiert| stone

  lumber -->|benutzt| axe
  lumber -->|produziert| wood
  lumber -->|braucht| food

  fisher -->|benutzt| rod
  fisher -->|produziert| fish
  fisher -->|braucht| food

  mason -->|benutzt| hammer
  mason -->|produziert| stone
  mason -->|braucht| food

```
