# SongLearn: design direction

Direction source: the owner's two reference screenshots (desktop and phone) of a dusk scene with a
glowing CRT television on a grassy hill. Everything below is derived from them.

Design Read: a consumer service landing page (home-video digitizing) for families holding old
tapes, in a cinematic dusk 3D style. Dial: ENERGY 3 / RHYTHM 2 / MOTION 2.

## Identity

- **Motif: the camcorder viewfinder.** Thin corner brackets frame the hero and the before/after
  frame, the way a camcorder framed the footage people now want saved.
- **Motif: the handwritten tape label.** Dancing Script appears only where a person would have
  written by hand: the first headline line, the labels drawn on the cassettes, the closing
  "Start with one tape."
- **Motif: the cursor is a lamp.** From the owner's reference, where the grass glows gold around
  the pointer. In the 3D scenes the pointer is cast onto the hill and lights the blades there; on
  the flat sections a warm pool follows the mouse (screen blend on night, multiply on paper). Mouse
  only, never on touch, and off when the scene runs without a GPU.
- **One accent: tube glow amber `#ffc56b`.** It is the colour of the lit screen in the scene, so it
  marks only the main action (the wave icon on the button) and keyboard focus on dark grounds.

## Palette (2 cores + 1 accent)

| Token | Value | Reason |
|---|---|---|
| `--night` | `#0b1033` | The sky after the hero's dusk; sections read as the same evening going on. |
| `--cream` | `#f4efe6` | Cassette label paper; the one contrasting ground (Formats) and the button fill. |
| `--glow` | `#ffc56b` | The TV screen; one accent, used at the main action only. |

The hero sky (periwinkle to peach) lives only inside the 3D scene, where it is a literal sky.

## Type

- **Nunito Sans (variable):** rounded terminals sit well with the soft scene and stay legible for an
  older audience reading about their parents' tapes.
- **Dancing Script 700:** handwriting on a tape label (see motif).
- Fonts are self-hosted through Fontsource: a privacy-first service should not call a font CDN.

## Motion (dial 2)

