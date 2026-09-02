# CR-02B – Resource Reservation & Claim Contract

Status: DEVICE TEST REQUIRED

## Ziel

CR-02B ergänzt die in CR-02A eingeführte autoritative ResourceState-Schicht um einen deterministischen Reservierungs-/Claim-Vertrag. Eine konkrete Teilmenge einer Resource-Instanz kann für einen zukünftigen Verbraucher bzw. Bedarf reserviert werden, ohne Transport-, Job-, Carrier-, Gebäude- oder Produktionsverhalten vorwegzunehmen.

## Ownership

- ResourceState bleibt autoritativ für Resource-Definitionen und Resource-Instanzen.
- `domains.resources` bleibt der einzige produktive Store für konkrete Resource-Instanzen.
- ResourceClaims ist autoritativ für Claim-Records.
- Claims erzeugen keine Jobs und keine Units.
- Claims verschieben keine Ressourcen und ändern keinen Standort.

## Claim-Record

Jeder Claim besitzt:

- stabile `claim:*` ID
- `resourceId`
- positive ganzzahlige `amount`
- stabile `consumerId`
- optionale stabile `demandId`
- Zustand `ACTIVE`, `RELEASED` oder `CONSUMED`
- optionale Metadata

## Verfügbare Menge

Für eine Resource-Instanz gilt:

`available = resource.amount - activeClaims - consumedClaims`

Eine Reservierung wird abgewiesen, wenn sie die noch unbeanspruchte Menge überschreitet. Damit kann dieselbe konkrete Menge nicht doppelt reserviert werden.

## Zustandskopplung

- mindestens ein aktiver Claim -> ResourceState `RESERVED`
- keine aktiven Claims und noch nicht vollständig verbraucht -> `AVAILABLE`
- Summe konsumierter Claims erreicht Resource-Menge -> `CONSUMED`

Die Resource-Menge aus CR-02A bleibt dabei die definierte Menge der konkreten Resource-Instanz; der verbrauchte Anteil wird über abgeschlossene Claims nachvollziehbar gehalten.

## Deterministische Übergänge

### reserve

Erzeugt einen ACTIVE Claim nur bei ausreichender unbeanspruchter Menge.

### release

`ACTIVE -> RELEASED`

Die Menge wird sofort wieder verfügbar. Wiederholtes Release eines bereits RELEASED Claims ist idempotent. Ein CONSUMED Claim darf nicht freigegeben werden.

### consume

`ACTIVE -> CONSUMED`

Die beanspruchte Menge gilt danach endgültig verbraucht. Wiederholtes Consume eines bereits CONSUMED Claims ist idempotent. Ein RELEASED Claim darf nicht konsumiert werden.

## Self-Test

CR-02B prüft:

1. partielle Reservierung und Restmengenberechnung
2. Ablehnung einer Über-/Doppelreservierung
3. vollständige Reservierung über mehrere Claims
4. deterministisches Consume
5. Schutz gegen Release nach Consume
6. vollständiger Verbrauch setzt Resource auf CONSUMED
7. Release stellt die Menge wieder bereit
8. Frozen Snapshot
9. Buildings/Units/Jobs bleiben leer
10. gesamte Regression CR-00 bis CR-02A bleibt PASS

## Explizit nicht enthalten

- keine Carrier
- keine Bewegung
- kein Pathfinding
- keine Baustellen
- keine Lagerplätze oder Stapelgrenzen
- keine Produktionssysteme
- keine Job-Zuweisung
- keine Demand-Erzeugung
- keine automatische Claim-Auswahl
- keine SaveGame-Erweiterung

## Freeze-Kriterium

CR-02B kann PASS / FROZEN gesetzt werden, wenn der Browser-/Gerätetest `CR-02B SELF-TEST: PASS` meldet und kein Legacy-Gameplay sichtbar oder geladen wird.
