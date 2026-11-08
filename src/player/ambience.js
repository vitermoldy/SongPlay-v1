// Ambient sound for the player's scene, made in the browser with the Web Audio API: no audio
// files, nothing downloaded. Layers: wind, rain (with thunder now and then), crickets, birds,
// rustling leaves. Each time of day and season sets how loud each layer is; changes fade over.
// The AudioContext is only made from a click (browsers allow sound after a user gesture).

const LAYERS = ['wind', 'rain', 'crickets', 'birds', 'leaves'];
// The volume slider runs 0 to 1; a curve makes its middle sound like the middle.
