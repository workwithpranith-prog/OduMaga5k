# Odu Maga

A blocky 3D 5K run around central Bengaluru, built with Claude.

Start at Kanteerava Stadium, run past UB City, MG Road and Vidhana Soudha, cut through Cubbon Park, and finish with a masala dosa and a filter coffee.

## How to play

- **Tap** fast to run fast. Slow taps, slow pace.
- **Swipe** left or right to change lanes. Dodge autos and cows on the city roads and the street dogs inside Cubbon Park.
- **Fuel up:** water bottles refill your energy; carb gels refill it and give you a short boost.
- **Finish** under the arch, then post your name and time to the leaderboard.

On a laptop: space bar to run, arrow keys to change lanes.

## How it's built

- One file: `index.html`. No build step.
- 3D: [three.js](https://threejs.org/) r128, loaded from cdnjs.
- Music and sound effects: generated live with the Web Audio API (original 8-bit tune).
- Leaderboard: a [Supabase](https://supabase.com/) table (`scores`: name, time, pace, posted at). Anyone can read and add scores; nobody can edit or delete them through the site.
- Hosting: [Netlify](https://www.netlify.com/), deployed from this repo.

Made by [@yourrunningbro](https://www.instagram.com/yourrunningbro/).
