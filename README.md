# Odu Maga

Blocky 3D runs around Bengaluru, built with Claude. Pick a route after the intro screen:

| Route | Distance | What's on it | Finish treat |
|---|---|---|---|
| **Cubbon Park** | 5K | Kanteerava Stadium, UB City, MG Road, Vidhana Soudha, Cubbon Park. Flat. Autos, cows, Cubbon dogs. | Masala dosa + filter coffee |
| **Ulsoor Lake** | 3K | One lap round the lake on the footpath and the road: MEG & Centre (the Sappers) with its WWII tank and war memorial, army kayaks, the Kempegowda watch tower, the boat club, Kensington Road and the Gurudwara. Footpath steps, food carts, morning walkers. | Honey cake + masala chai |
| **NICE Road** | 10K | 5 km out along the expressway, U-turn, 5 km back. Toll plaza, a flyover, open country, no shade. Slower runners and cones. | Tender coconut + banana |

Ulsoor Lake and NICE Road follow real GPS tracks and elevation from Strava runs. Hills change the maths: going up costs speed and drains energy faster, coming down gives a little speed back, and the HUD shows the live grade and an elevation profile.

## How to play

- **Tap** fast to run fast. Slow taps, slow pace.
- **Swipe** left or right to change lanes. Dodge autos and cows on the city roads and the street dogs inside Cubbon Park.
- **Fuel up:** water bottles refill your energy; carb gels refill it and give you a short boost.
- **Finish** under the arch, then post your name and time to that route's leaderboard.
- **Share** your run: a challenge link (WhatsApp, copy link, or your phone's share sheet) and a story-sized image for Instagram. Friends who open the link land on your route with your time to beat.

On a laptop: space bar to run, arrow keys to change lanes.

## How it's built

- No build step: `index.html` loads `css/style.css` and the scripts in `js/`, in order. Open `index.html` in a browser to play.
- 3D: [three.js](https://threejs.org/) r128, loaded from cdnjs.
- Music and sound effects: an original chiptune for each route, generated live with the Web Audio API.
- Leaderboard: a [Supabase](https://supabase.com/) table (`scores`: name, time, pace, route, posted at). Anyone can read and add scores; nobody can edit or delete them through the site. Per-route boards use the `route` column added by `supabase/add_route_column.sql`.
- Hosting: [GitHub Pages](https://pages.github.com/), deployed from the `main` branch of this repo. Every merge to `main` goes live in about a minute.

### Where things live

| Path | What's in it |
|---|---|
| `index.html` | The screens (start, route picker, HUD, finish, leaderboard) and the list of scripts, in load order |
| `css/style.css` | All styling |
| `js/core.js` | Shared constants and small helpers |
| `js/leaderboard.js` | Supabase leaderboards and anonymous run stats |
| `js/data/strava-routes.js` | GPS tracks and elevation from the Strava runs |
| `js/engine/` | Three.js scene and textures (`scene.js`), the route path, elevation, ground and roads (`world.js`), landmark and scenery helpers (`scenery.js`) |
| `js/routes/` | One file per route (`cubbon.js`, `ulsoor.js`, `nice.js`) and `courses.js`, which describes every route: distance, treat, hazards, pickups |
| `js/models.js` | The runner, traffic, hazards and finish-line treats |
| `js/race.js` | Race state, input, physics and the camera |
| `js/hud.js`, `js/screens.js`, `js/share.js` | The heads-up display and mini-map, the screens and flow, sharing |
| `js/audio.js`, `js/treats.js` | Music and sound effects; the 2D treat drawings |
| `js/main.js` | The game loop and start-up |

The scripts are plain (not modules) and share one global scope, so the order in `index.html` matters.

### Checks

Install once with `npm install`, then:

- `npm run format`: tidy the formatting (Prettier)
- `npm run lint`: catch typos and names that are defined nowhere, across all the scripts
- `npm test`: play every route in a headless browser, plus a full Ulsoor run that checks the finish screen, the share text and the music (`npx playwright install chromium` the first time)

GitHub runs all three on every pull request (`.github/workflows/check.yml`).

Made by [@yourrunningbro](https://www.instagram.com/yourrunningbro/).
