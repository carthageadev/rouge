# Rouge

A visual clipboard manager for people who think in pictures.

- **Trail**: everything you copy becomes a small tile that follows your cursor, chained on springs. Text shows as a page, links as a letter badge, emails as an envelope, colors as swatches, images as thumbnails and code as `</>`. When you stop moving, the tiles bunch up and dim.
- **Notch**: a black pill at the top of the screen. Hover it and it springs open to show your history as visual cards. Click a card to copy it again.
- **Mascot**: a flat chibi with moving ears, swaying hair and 8 expressions. Poke her for a random reaction; poke her six times quickly and she gets angry. Right-click to switch between Golshi, Rouge (red hair, no ear muffs) and Midnight.
- **Settings** (gear icon): dark, light or system theme; accent colour (presets or a hue slider); notch style (attached **Notch** or a **Floating** pill you drag by its grip); mascot; trail on/off and how long tiles last; start with Windows.
- **Pouch**: she catches your trail when your cursor enters the notch. When the cursor enters the notch it eats your trail. Its eyes follow you and it blinks and sleeps when empty. **Carry again** sends the items back to your cursor. **Shake it out** empties the pouch.
- **Source**: each clip remembers the app it came from. Browser copies (Chrome, Edge, Brave, Firefox and others) also remember the site and show its favicon.
- **Alt+V** opens a paste menu at your cursor. Pick with ↑↓ and Enter, 1–9, or a click, and it pastes straight into the field you were typing in.
- **Alt+scroll** chooses what Ctrl+V pastes. A small picker by the cursor shows your place in the history.
- **Shake the mouse** to hide the trail. Nothing is deleted. Each trail tile also fades out on its own after 30 seconds.
- **Cards / List** toggle in the notch. The list view shows more of each clip's text, plus the page title it came from.
- `Ctrl+Shift+X` does the same shake-off from the keyboard. The tray icon lets you turn the trail on or off, clear the history or quit.

## Run

```
npm install
npm start        # or double-click run.cmd
```

History is stored in `%APPDATA%/rouge-clipboard/`.

## Mascot credit

The mascot is **MO**, a free Live2D model by 樱井檬 ([@Sakurai_mon](https://x.com/Sakurai_mon)), made available free of charge.
It is rendered with [PixiJS](https://pixijs.com), [pixi-live2d-display-lipsyncpatch](https://github.com/RaSan147/pixi-live2d-display) and the Live2D Cubism Core (`vendor/`, under the [Live2D Proprietary Software License](https://www.live2d.com/eula/live2d-proprietary-software-license-agreement_en.html)).
Textures in `assets/live2d/MO/tex` are downscaled to 1024px so the notch stays light on memory.
