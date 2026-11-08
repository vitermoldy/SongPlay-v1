# ModernWebsite-v

Landing page for **SongLearn**, a tape digitizing service (VHS, Hi8, Super 8, MiniDV). The hero is a
real-time 3D dusk scene: a glowing CRT television on a grassy hill, grass moving in the wind,
drifting dust and a CRT power-on at load.

Built with [Vite](https://vite.dev) and [three.js](https://threejs.org), no framework.

Two pages:

- `index.html`: the landing page. The mouse cursor works as a lamp: over the 3D hero it lights the
  grass it points at, and over the other sections a warm pool of light follows it.
- `player.html` ("Put a song on"): only the TV on the hill. Paste YouTube links (a video, a YouTube
  Music link, a Short or a whole playlist); they stack up in a queue shown as a dropdown, and play
  one after another on the TV's screen. Here the set is a 16:9 TV with a thin bezel; the video
  covers the glass inside a thin dark rim. Pick a time of day (Dusk, Night, Sunset, Dawn) and a
  season (Spring: blossom and petals, Summer, Autumn: falling leaves, Winter: snow, Rain: an
  overcast sky and falling rain); both are kept in the browser. The speaker button in the header
  opens the ambient sound: an on/off switch and a volume slider for wind, rain and thunder,
  crickets, birds and rustling leaves to match the sky and season. Reached from the header button
  and the footer.

## Run it

```bash
npm install
npm run dev       # local dev server
npm run build     # static site in dist/
npm run preview   # serve dist/ locally
```

`dist/` uses relative paths, so it can be uploaded to any static host as is.

## Structure

```
index.html            landing page: hero, services, formats, contacts, footer
player.html           the "Put a song on" page
src/main.js           header, mobile menu, in-page links, scene start-up
src/styles.css        tokens, layout, responsive rules (shared by both pages)
src/cursor-light.js   the 2D lamp that follows the cursor outside the 3D scene
src/compare.js        before/after frame (the VHS look is made in a 2D canvas)
src/form.js           request form: validation, then a pre-filled email
src/player/           the player page
  main.js             queue (kept in localStorage), YouTube player, dropdown, controls
  youtube.js          link parsing, titles from oEmbed, the IFrame API loader
  ambience.js         the ambient sound, made with the Web Audio API (no audio files)
  player.css          stage, deck and dropdown
src/scene/            the 3D scene, used by both pages ("hero" and "player" variants)
  index.js            renderer, camera, loop, pause, cursor light, video on the screen (CSS3D)
  terrain.js          hill shape shared by ground and grass
  grass.js            instanced grass blades with wind
  tv.js               television (classic 4:3 and wide 16:9 sets), screen shader with power-on
  themes.js           times of day (sky, sun or moon, stars, light) and seasons (grass, what falls)
  sky.js              sky, clouds, mountains
  particles.js        what drifts: dust, fireflies, snow, petals, leaves
  post.js             bloom, focus blur, grain and vignette
DESIGN.md             design direction and the reason behind each choice
```

## Before launch

- Replace `hello@songlearn.example` (in `index.html` and `REQUEST_EMAIL` in `src/form.js`) with the
  real inbox. The form opens the visitor's email app with the request filled in; there is no server.
- Check the service details in the Services section (what files you deliver, tapes returned) against
  what the studio really does.
- `public/favicon.svg` is a text placeholder ("l." on night blue) until there is a real logo.

## How the player works

- The video is a real YouTube embed laid onto the TV's glass with three.js `CSS3DRenderer`, so it
  follows the scene's perspective. The camera keeps one wide shot at every window size (the set
  scales with the window) and only steps back when the TV would otherwise meet the controls; the
  queue dropdown moves beside the TV (or the TV moves up above it on a phone) so nothing covers the
  player. The wide shot was the owner's choice over YouTube's 200 x 200 px guideline for embeds:
  the video is about 335 x 197 px at 1440 x 900, 242 x 142 px at 1366 x 650 and 269 x 158 px on a
  phone. YouTube's own fullscreen button gives the big picture.
- YouTube is contacted only when someone adds a link: titles come from YouTube's oEmbed endpoint,
  the player loads in privacy-enhanced mode (`youtube-nocookie.com`).
- Some videos and lists cannot play on other sites: many label music videos (their owners turn
  embedding off) and YouTube's own mixes and charts. The page says so in the queue row and moves to
  the next link.
- Browsers may hold back sound until the visitor presses play; the page then says "Press play".
- Ambient sound is off until the visitor turns it on (switch, or the volume slider). Every sound is
  made in the browser: filtered noise for wind and rain, short tones for crickets and birds. Each
  sky and season sets the mix and changes fade over a second or two; it dips while a song plays and
  goes quiet in a hidden tab. On and volume are kept in the browser; sound left on starts again
  with the visitor's first click on a later visit, since browsers allow sound only after a gesture.

## Performance notes

- three.js loads after the page paints, in its own chunk.
- On phones and machines with 4 cores or fewer the scene uses fewer grass blades and a lower pixel
  ratio. When WebGL runs in software, or the first frames come in under about 15 fps, the scene
  stays on its still frame and the "Play scene" button starts it.
- The scene pauses when the hero is off screen or the tab is hidden, and starts paused when the
  visitor prefers reduced motion.
