# 🦟 Mosquito Shooter

A funny, chaotic 2D arcade shooter. Our hero is sleeping peacefully when mosquitoes invade the bedroom. He fights back with his… *third leg* (a very sporty sock-cannon 🧦💥).

* Plays in any modern browser (Chrome, Edge, Firefox, Safari, Android browsers) on phone **and** desktop
* Installable like a real app (**PWA**) on Android and iPhone, works **offline**
* 100 % client side — no server, no database — perfect for free hosting on **Vercel**
* Uses your four sound files exactly as supplied

---

## 🎮 How to play

| Action | Mouse / keyboard | Phone |
|---|---|---|
| Shoot at a spot | Click (hold = keep firing) | Tap (hold = keep firing) |
| Auto‑aim at the most dangerous mosquito | `Space` | Hold the big pink **SHOOT** button |
| Pause | `Esc` or `P` | Pause button |
| Mute | `M` | Speaker button |

* Every bite drains health, sets the hero's skin on fire 🔥 and plays the bite sound. Health 0 = game over.
* Kill quickly for **combos** (up to ×5 points), keep a **kill streak**, finish waves for **bonuses** (perfect wave = no bites).
* Mosquito types: **Normal**, **Fast** (wave 2+), **Fat** (wave 3+), **Armored** (wave 4+), **Golden** (rare – shoot it to heal!) the **Queen** (every 5th wave) and **Rekha**, a diva mosquito (original cartoon character) who appears from wave 3 — her bites make the hero scream (`rekha-scream.mp3`).
* High score is saved in the browser (`localStorage`).

### Sound system (your uploaded files)

| File | When it plays |
|---|---|
| `assets/sounds/mosquito-flying.mp3` | Loops while mosquitoes exist; volume rises with the number of mosquitoes, fades out at zero |
| `assets/sounds/mosquito-excess.mp3` | "Swarm alert": 9+ mosquitoes alive, 3 bites within 3 s, or the Queen arrives — 14 s cooldown |
| `assets/sounds/mosquito-bite.mp3` | Instantly on every successful bite (with fire effect, damage number, hero reaction) |
| `assets/sounds/rekha-scream.mp3` | Instead of the normal bite sound, whenever **Rekha** bites the hero |
| `assets/sounds/game-over.mp3` | When health reaches zero; all other sounds stop first |

Audio starts only after the first tap/click (browser autoplay rules). Settings has master / buzz / effects volume and mute. Pausing suspends audio; restart and main menu stop everything.
> iPhone tip: if you hear nothing, check the silent switch on the side of the phone.

---

## 📁 Project structure

```
mosquito-shooter/
├── index.html            ← the page (menus + HUD)
├── style.css             ← all UI styling
├── manifest.json         ← PWA manifest
├── service-worker.js     ← offline cache
├── vercel.json           ← hosting headers for Vercel
├── README.md
├── js/
│   ├── audio.js          ← sound manager (Web Audio, volume, mute, cooldowns)
│   ├── art.js            ← all artwork, drawn with canvas code (bedroom, hero, mosquitoes, fire)
│   └── game.js           ← gameplay, waves, scoring, input, UI wiring
├── assets/
│   ├── sounds/           ← your 5 mp3 files
│   ├── fonts/            ← Bangers + Fredoka (open source, SIL OFL) — works offline
│   └── images/reference-sketch.jpg
└── icons/                ← app icons (192, 512, maskable, apple-touch, favicon)
```

No build step, no `npm install`. It is plain HTML + CSS + JavaScript.

### Try it on your computer first
Because of browser security, the PWA/offline parts need `http://`, not double-clicking the file. If you have Python: open a terminal in the project folder and run `python3 -m http.server 8000`, then visit `http://localhost:8000`. (Double-clicking `index.html` also lets you play, but without install/offline support.)

---

## 🚀 Deploy: from download to a public link (beginner friendly)

### 1. Download the project
Download the ZIP (`mosquito-shooter.zip`) and **unzip** it (right‑click → *Extract All* on Windows, double‑click on Mac). You get a folder called `mosquito-shooter`. Open it and check you see `index.html` directly inside.

### 2. Create a GitHub account and repository
1. Go to <https://github.com> and click **Sign up** (skip if you have an account).
2. Click the **+** (top right) → **New repository**.
3. Repository name: `mosquito-shooter`. Choose **Public**. Leave "Add a README" **unchecked**. Click **Create repository**.

### 3. Upload the files (no command line needed)
1. On the new empty repository page click **uploading an existing file**.
2. Open the unzipped folder, select **everything inside it** (`index.html`, `js`, `assets`, `icons`, …) and drag it into the browser window.
   * Drag the *contents*, not the outer folder, so `index.html` ends up at the top level of the repo.
   * If folders don't upload by drag‑and‑drop in your browser, use **GitHub Desktop** (<https://desktop.github.com>): *File → Add local repository*, publish it, done.
3. Wait for the upload to finish, scroll down and click **Commit changes**.

*(Command‑line alternative)*
```bash
cd mosquito-shooter
git init
git add .
git commit -m "Mosquito Shooter"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/mosquito-shooter.git
git push -u origin main
```

### 4. Deploy with Vercel and connect GitHub
1. Go to <https://vercel.com> → **Sign Up** → **Continue with GitHub** (this connects GitHub and Vercel).
2. Click **Add New… → Project**. If asked, click **Adjust GitHub App Permissions** and allow access to your `mosquito-shooter` repository.
3. Click **Import** next to `mosquito-shooter`.
4. Settings: **Framework Preset = Other**. Leave Build Command, Output Directory and Install Command **empty**. (`vercel.json` is already included.)
5. Click **Deploy**. After ~30 seconds you get a link like `https://mosquito-shooter.vercel.app`.

### 5. Make it publicly accessible
* Vercel projects are public by default. Share the `*.vercel.app` link with anyone.
* If the link asks visitors to log in: **Project → Settings → Deployment Protection** → set **Vercel Authentication** to *Disabled*.
* Optional: **Settings → Domains** lets you add your own domain name.

### 6. Update the game later
1. Change files locally (or edit a file directly on GitHub with the ✏️ pencil icon).
2. Upload/commit the change to GitHub (**Add file → Upload files**, or `git add . && git commit -m "update" && git push`).
3. Vercel redeploys automatically within a minute.
4. **Important for installed apps:** open `service-worker.js` and change `const CACHE_VERSION = 'v1';` to `'v2'` (then `'v3'`, …) so phones download the new version. Players get it the next time they open the game (close and reopen once).

---

## 📲 Install as an app

### Android (Chrome)
1. Open your Vercel link in **Chrome**.
2. Tap the **📲 INSTALL APP** button in the main menu (or Chrome menu ⋮ → **Install app** / **Add to Home screen**).
3. Confirm. The game appears on your home screen and opens full‑screen with its own icon and splash screen.

### iPhone / iPad (Safari)
1. Open your link in **Safari** (must be Safari, not Chrome).
2. Tap the **Share** button (square with ↑ arrow).
3. Scroll and tap **Add to Home Screen** → **Add**.
4. Launch it from the home screen — it runs full screen and offline.

### Desktop (Chrome / Edge)
Click the install icon at the right end of the address bar, or the **INSTALL APP** button in the menu.

---

## 🛠 Tweaking the game
Open `js/game.js`:
* `TYPES` — mosquito speed, health, damage, points
* `startWave()` — how many mosquitoes per wave, spawn interval, speed growth
* `triggerSwarm()` / the `alive >= 9` check — when the "excess mosquito" sound fires
* In `js/audio.js` — default volumes

## 🔧 Troubleshooting
| Problem | Fix |
|---|---|
| No sound | Tap the screen once (browsers block autoplay). Check mute in Settings and the phone's silent switch. |
| "Install" button missing | Needs HTTPS (Vercel gives you that), Chrome on Android, and the app not already installed. On iPhone use Share → Add to Home Screen. |
| Old version after update | Bump `CACHE_VERSION` in `service-worker.js`, redeploy, reopen the game twice. |
| 404 on Vercel | `index.html` must be at the repository's top level, not inside a sub‑folder. |

Fonts: Bangers and Fredoka are licensed under the SIL Open Font License. Enjoy, and sleep tight! 🦟💤
