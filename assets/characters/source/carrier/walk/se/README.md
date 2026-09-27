# Carrier WALK / SE – Source Frame Staging

Dieser Ordner enthält die einzeln freigegebenen Produktionsframes vor Atlas-Zusammenbau.

## Verbindliche Dateinamen

- `carrier_walk_se_f01.png`
- `carrier_walk_se_f02.png`
- `carrier_walk_se_f03.png`
- `carrier_walk_se_f04.png`
- `carrier_walk_se_f05.png`
- `carrier_walk_se_f06.png`
- `carrier_walk_se_f07.png`
- `carrier_walk_se_f08.png`

Die Bilder bleiben als transparente Einzel-PNGs erhalten. Sie werden nicht manuell zu einem Sheet zusammenkopiert. DevForge Animation Tester lädt die Einzelbilder direkt bzw. über `manifest.json`, spielt sie mit gemeinsamem Bottom-Center-Anchor ab und dient als Review-Gate vor der Atlas-Erstellung.

## Workflow

1. Frame erzeugen.
2. Visuell gegen Character Reference und vorherigen freigegebenen Frame prüfen.
3. Freigegebenes PNG unter dem festen Namen hier ablegen.
4. In DevForge Animation Tester als Einzelbilder oder über `manifest.json` laden.
5. Loop, Frame-Sprünge, Scale, Root/Anchor, Kamera und Silhouettenänderungen prüfen.
6. Erst nach PASS in den finalen Atlas übernehmen.

## Trennung

Dieser Pfad enthält nur Character-Animation. Ressourcen, Waren und Werkzeuge bleiben separate Assets und werden nicht in die Character-Frames eingebrannt.