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

- One file: `index.html`. No build step.
- 3D: [three.js](https://threejs.org/) r128, loaded from cdnjs.
- Music and sound effects: an original chiptune for each route, generated live with the Web Audio API.
- Leaderboard: a [Supabase](https://supabase.com/) table (`scores`: name, time, pace, route, posted at). Anyone can read and add scores; nobody can edit or delete them through the site. Per-route boards need the `route` column from `supabase/add_route_column.sql`.
- Hosting: [Netlify](https://www.netlify.com/), deployed from this repo.

Made by [@yourrunningbro](https://www.instagram.com/yourrunningbro/).
