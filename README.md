# EISENWACHT: NULLSEKTOR

Ein eigenständiger, asset-freier Retro-Raycaster für den Browser. Das Spiel ist von der Technik früher 90er-FPS inspiriert, verwendet aber eine eigene Welt, eigene Figuren und selbst erzeugte Grafik- und Soundeffekte.

## Enthalten

- Drei zusammenhängende Missionen inklusive Boss-Finale
- DDA-Raycaster mit prozeduralen Wandtexturen und Pixel-Sprites
- Zwei Waffen, Gegner-KI, Türen, Schlüssel, Pickups und Missionsziele
- Synthetisierte Audioeffekte ohne externe Dateien
- Maus-, Tastatur- und Touch-Steuerung
- Lokaler Highscore und installierbares Web-App-Manifest

## Starten

Das Spiel funktioniert ohne Build-Schritt. Im Projektordner einen lokalen Server starten:

```powershell
python -m http.server 4173
```

Danach `http://localhost:4173` öffnen.

## Steuerung

- `WASD`: bewegen/seitwärts laufen
- Maus oder Pfeiltasten: drehen und zielen
- Linksklick oder Leertaste: feuern
- `E`: Türen, Schleusen und Aufzüge benutzen
- `R`: nachladen
- `1` / `2`: Waffe wechseln
- `Shift`: sprinten
- `M`: Ton an/aus
- `Esc`: Pause

Touch-Steuerung wird auf Mobilgeräten automatisch eingeblendet.
