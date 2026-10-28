# Gridiron Pocket

An original, lightweight retro pixel-art American football game made with plain HTML, CSS, and JavaScript. No build tools, dependencies, server, or external assets required.

## Features
- Quick matches and a persistent season mode
- Original fictional teams and branding
- Run plays with defensive pursuit
- Passing plays with three receiver options
- Touch-friendly on-screen controls and keyboard controls
- Local progress saved in browser storage
- Responsive layout for phones, tablets, and desktop
- GitHub Pages compatible

## Run locally
Open `index.html` in a browser. For best results, serve the folder with any static file server.

## Deploy to GitHub Pages
1. Extract the ZIP.
2. Create a GitHub repository and upload the contents of `RetroFootball/` (the `index.html`, `README.md`, `LICENSE`, `.nojekyll`, and `web/` folder should be at the repository root).
3. In the repository, open **Settings → Pages**.
4. Choose **Deploy from a branch**, select `main` and `/ (root)`, then save.
5. Wait for deployment and open the Pages URL shown there.

## Controls
- Start a play with **RUN** or **PASS**.
- Move using WASD or arrow keys, or use the on-screen directional pad.
- Press Space / tap **SPRINT** to burst forward on a run.
- On a pass play, tap a receiver marked 1–3, or press 1, 2, or 3. The THROW button targets the middle receiver.

## Save data
Season data is saved locally in the browser using `localStorage`. It does not sync between devices and can be erased if browser site data is cleared.

## Project structure
```text
RetroFootball/
├── index.html
├── README.md
├── LICENSE
├── .nojekyll
└── web/
    ├── style.css
    ├── game.js
    └── assets/
```

## Note
This is an original fan-made style of retro football game and is not affiliated with any existing football game or league.
