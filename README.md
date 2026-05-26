# HA-Slider-in-a-Row

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=GB-1972&repository=HA-Slider-in-a-Row&category=plugin)

Lovelace-Custom-Card für Home Assistant: Mehrere `cover`-Entitäten als kompakte Reihe mit **vertikalem Slider, Auf/Ab/Stop-Buttons und Prozentanzeige** pro Cover. Im Mushroom-Look, ohne Abhängigkeiten.

Ursprünglicher Anwendungsfall: 8 vertikal verstellbare Solarpanels als eine Karte – funktioniert aber für jede Art von Cover (Rollos, Markisen, Jalousien, Tore, …).

## Features

- **Vertikaler Slider** pro Cover mit Drag- und Tap-to-Position-Bedienung (Service-Call erst beim Loslassen, kein „Service-Spam" beim Ziehen).
- **Auf / Ab / Stop** als eigene Buttons, Stop in dezentem Rot abgesetzt.
- **Prozent-Pill** unter jeder Säule mit Tabular-Numerals.
- **Multi-Stack-Layout** über `stacks` (vertikale Säulen, column-fill) oder `cols` (Reihen, row-fill): z. B. 8 Cover in 2 vertikalen Säulen à 4 — ohne horizontalen Scrollbalken.
- **UI-Konfiguration** im Dashboard-Editor (kein YAML zwingend nötig) inkl. Entity-Picker mit Cover-Filter.
- **Mushroom-Optik**: abgesetzte Tiles, weiche Schatten, frei wählbare Akzentfarbe.
- **Bewegungs-Indikator**: während `opening`/`closing` umrandet die Säule in der Akzentfarbe.
- **Long-Press / Rechtsklick** öffnet das HA-„Weitere Infos"-Popup.
- **Responsive**: kompaktere Buttons auf Mobile.
- **`unavailable`** wird ausgegraut und deaktiviert.
- Keine Build-Pipeline, kein Framework — eine Vanilla-JS-Datei.

## Installation

### Ein-Klick über HACS (empfohlen)

Klick auf den Badge oben → HACS öffnet sich auf deiner Instanz und bietet an, dieses Repository als **Custom Repository / Plugin** hinzuzufügen.

Alternativ in HACS manuell:
1. HACS → Frontend → drei Punkte oben rechts → *Custom repositories*.
2. URL: `https://github.com/GB-1972/HA-Slider-in-a-Row`, Kategorie: **Lovelace**.
3. *Cover Slider Row* installieren.

### Manuell

1. [`cover-slider-row-card.js`](cover-slider-row-card.js) nach `config/www/` kopieren.
2. **Einstellungen → Dashboards → Ressourcen** → hinzufügen:
   - URL: `/local/cover-slider-row-card.js?v=1`
   - Typ: **JavaScript-Modul**
3. Browser-Cache leeren (Shift-Reload).

## Konfiguration

Minimal:

```yaml
type: custom:cover-slider-row-card
entities:
  - cover.solarpanel_1
  - cover.solarpanel_2
  - cover.solarpanel_3
  - cover.solarpanel_4
  - cover.solarpanel_5
  - cover.solarpanel_6
  - cover.solarpanel_7
  - cover.solarpanel_8
```

Vollständig:

```yaml
type: custom:cover-slider-row-card
title: Solarpanels
icon: mdi:solar-panel
stacks: 2                    # 8 Entities + stacks:2 -> 2 vertikale Säulen à 4 (1-4 links, 5-8 rechts)
# cols: 4                    # Alternative: row-fill = 2 Reihen à 4 (1-4 oben, 5-8 unten). Nur eines von beiden setzen.
accent_color: "#f59e0b"     # jede CSS-Farbe; auch var(--rgb-blue) o.ä.
track_color: "rgba(127,127,127,0.18)"
height: 120                  # Slider-Höhe in px
invert: false                # true, falls 0%=offen interpretiert werden soll
show_buttons: true
show_percentage: true
show_name: true
show_stop: true
min_panel_width: 60          # Mindestbreite pro Säule
entities:
  - cover.solarpanel_1
  - cover.solarpanel_2
  - entity: cover.solarpanel_3
    name: "P3 Süd"            # optionaler Eigenname pro Panel
  - cover.solarpanel_4
  - cover.solarpanel_5
  - cover.solarpanel_6
  - cover.solarpanel_7
  - cover.solarpanel_8
```

### Optionen

| Option | Typ | Default | Beschreibung |
|---|---|---|---|
| `entities` | list | – | Pflicht. Liste von `cover.*`-Entity-IDs oder Objekten `{entity, name}`. |
| `title` | string | `""` | Header über der Reihe; leer = kein Header. |
| `icon` | string | `mdi:solar-panel` | Icon im Header. |
| `stacks` | number | – | Anzahl vertikaler Säulen, gefüllt von oben nach unten (column-fill). Bei 8 Entities und `stacks: 2` → 2 Säulen à 4 Slider (1–4 links, 5–8 rechts). Hat Vorrang vor `cols`. |
| `cols` | number | = Anzahl Entities | Säulen pro Reihe, gefüllt von links nach rechts (row-fill). Bei 8 Entities und `cols: 4` ergibt das 2 Reihen à 4 (1–4 oben, 5–8 unten). `0`/unset = alle in einer Reihe. Ignoriert, wenn `stacks` gesetzt ist. |
| `accent_color` | string | `#f59e0b` | CSS-Farbe für Slider, Fill, Thumb, Hover. |
| `track_color` | string | `rgba(127,127,127,0.18)` | Hintergrund der Slider-Schiene. |
| `height` | number | `120` | Höhe des Sliders in px. |
| `invert` | boolean | `false` | Visuell invertieren (0% oben statt unten). |
| `show_buttons` | boolean | `true` | Auf/Ab/Stop-Buttons anzeigen. |
| `show_stop` | boolean | `true` | Stop-Button anzeigen (nur wenn `show_buttons`). |
| `show_percentage` | boolean | `true` | Prozent-Pill unter dem Slider. |
| `show_name` | boolean | `true` | Name über dem Slider. |
| `min_panel_width` | number | `56` | Mindestbreite pro Säule. |

### UI-Editor

Beim Hinzufügen der Karte ist der **visuelle Editor** der Default. Du kannst Entities per Multi-Selector mit Cover-Filter auswählen, Spaltenzahl, Höhe und Farben setzen und Optionen per Schalter umlegen. Eigene Namen pro Panel (`name:`) bleiben beim UI-Speichern erhalten — feinere Anpassungen weiterhin per *„Code-Editor anzeigen"*.

## Voraussetzungen

- Home Assistant mit `cover`-Entitäten, die `set_cover_position` unterstützen (für den Slider).
- Open/Close/Stop sind optional – Buttons werden aber unabhängig vom Feature-Support angezeigt; deaktiviere sie ggf. mit `show_buttons: false`.

## Lizenz

MIT
