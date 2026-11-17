# Desi Fight Arena: Overdrive
A small, playable browser fighting-game prototype.

## Run it
1. Extract the ZIP.
2. Open `index.html` in a modern browser.
3. Choose **1 Player vs CPU** or **Local 2 Player**.
4. Press **Start Fight**.

For best results, use a local static server:
- Python: `python -m http.server 8000`
- Then open `http://localhost:8000`

## Controls
### Player 1
- A / D: move
- W: jump
- S: block
- F: punch
- G: kick
- H: special (uses energy)

### Player 2
- Left / Right: move
- Up: jump
- Down: block
- K: punch
- L: kick
- ;: special (uses energy)

Mobile browsers show touch controls during a match.

## What's implemented
- Two selectable original prototype fighters (Volt and Blaze)
- One playable arena
- 1-player CPU match and local 2-player
- Movement, jumping, blocking, punch, kick and energy-based special
- Health/energy bars, timer, hit effects, screen shake and basic synthesized sound
- Responsive menu and mobile touch controls

## Important scope note
This is a functional starter prototype, not the previously discussed 20-fighter / 5-boss complete edition. Those larger features are not included yet. The fighters use original simple canvas-drawn placeholder art; there are no professional sprite sheets, story campaign, online multiplayer, cloud saves, or global rankings in this build.

## Hosting
This is a static HTML/CSS/JavaScript game. GitHub Pages is a suitable simple hosting option. Streamlit is not required.
