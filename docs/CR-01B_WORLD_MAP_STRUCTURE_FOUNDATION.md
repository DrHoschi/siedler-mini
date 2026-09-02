# CR-01B – World/Map Structure Foundation

Status: IMPLEMENTED / DEVICE GATE OPEN
Branch: `feature/cr-01b-world-map-structure`
Base: CR-01A (`75fe17539ca3ff90fc8c7cf50dc064b99b27e17d`)

## Ziel

CR-01B führt erstmals eine echte räumliche Weltstruktur auf Basis des in CR-01A eingefrorenen `WorldStore` und der Stable-ID-Verträge ein.

Noch nicht Bestandteil dieses Blocks sind Ressourcen, Gebäude, Wege, Einheiten, Jobs, Navigation, Wirtschaft oder SaveGame.

## Neue Struktur

### Map Identity

Eine Map ist eine autoritative World-Entity mit stabiler ID vom Typ:

`map:00000001`

Sie enthält ausschließlich strukturelle Metadaten:

- Name
- Breite
- Höhe
- Cell-Größe
- Ursprung
- freie Map-Metadaten

### Tile Identity

Terrain-/Tile-Definitionen sind eigene World-Entities mit stabilen IDs:

`tile:00000001`

CR-01B erzeugt genau eine neutrale Default-Tile-Definition `ground.default`. Weitere Tile-Definitionen können kontrolliert über `createTile()` angelegt werden.

Tile-Definitionen enthalten noch keinerlei produktive Terrain-Regeln. `passability` bleibt bewusst `UNSPECIFIED`.

### Cell Identity

Jede räumliche Zelle besitzt eine eigene stabile ID:

`cell:00000001`

Eine Cell speichert:

- `mapId`
- `tileId`
- Grid-Koordinate `{x,y}`
- abgeleitete Weltposition `{x,y}`

Die Identität einer Cell ändert sich nicht, wenn ihre Tile-Referenz geändert wird.

## Räumlicher Vertrag

Für jede gültige Grid-Koordinate existiert exakt eine Cell-ID.

`cellIdAt(x,y)` und `cellAt(x,y)` liefern deterministisch dieselbe Cell. Koordinaten außerhalb der Map liefern `null`.

Weltpositionen werden aus Map-Ursprung, Cell-Größe und Grid-Koordinate deterministisch berechnet.

## Autorität

`MapStructure` besitzt keinen zweiten Gameplay-State. Alle Map-, Tile- und Cell-Objekte liegen weiterhin ausschließlich im CR-01A `WorldStore`.

Der interne Coordinate-Index enthält nur die Zuordnung `x,y -> cellId` und keine duplizierten Entity-Daten.

## CR-01B Self-Test

Der Test prüft:

1. stabile Map-/Tile-/Cell-Identitäten,
2. korrekte Cell-Anzahl,
3. deterministische Grid→World-Zuordnung,
4. Bounds und eindeutige Koordinaten,
5. Tile-Wechsel ohne Änderung der Cell-ID,
6. eingefrorene Snapshots,
7. dass ausschließlich die Entity-Arten `map`, `tile` und `cell` neu entstehen.

Der sichtbare Browser-Gate lautet:

`CR-01B SELF-TEST: PASS`

## Nicht-Ziele

Explizit nicht implementiert:

- Ressourcen
- Gebäude
- Baustellen
- Lager
- Wege / Trampelpfade
- Einheiten
- Carrier
- Jobs
- Pathfinding / Navigation
- Wirtschaft
- Produktion
- SaveGame / Continue
- Legacy-Gameplay

## Freeze-Kriterium

CR-01B kann PASS / FROZEN gesetzt werden, wenn der Browser-/Gerätetest auf dem CR-01B-Branch `CR-01B SELF-TEST: PASS` zeigt und weiterhin keine Legacy-Gameplay-Oberfläche aktiv ist.
