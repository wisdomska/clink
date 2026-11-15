/**
 * Fetches the default avatar artwork: Microsoft Fluent Emoji 3D (MIT licence,
 * https://github.com/microsoft/fluentui-emoji) and saves 192 px WebP copies to
 * public/avatars. Run: node scripts/fetch-avatars.mjs
 */
import sharp from "sharp";
import { writeFileSync } from "node:fs";
const base = "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/";
const tone = (folder, file, t) => `${folder}/${t}/3D/${file}_3d_${t.toLowerCase()}.png`;
const S = (folder, file) => `${folder}/3D/${file}_3d.png`;
const list = {
  woman_light: tone("Woman", "woman", "Light"),
  woman_medium: tone("Woman", "woman", "Medium"),
  woman_dark: tone("Woman", "woman", "Dark"),
  man_light: tone("Man", "man", "Light"),
  man_medium: tone("Man", "man", "Medium"),
  man_dark: tone("Man", "man", "Dark"),
  curly_woman: tone("Woman curly hair", "woman_curly_hair", "Medium-Dark"),
  beard: tone("Person beard", "person_beard", "Medium-Light"),
  fox: S("Fox", "fox"),
  panda: S("Panda", "panda"),
  bear: S("Bear", "bear"),
  koala: S("Koala", "koala"),
  tiger: S("Tiger face", "tiger_face"),
  dog: S("Dog face", "dog_face"),
  rabbit: S("Rabbit face", "rabbit_face"),
  penguin: S("Penguin", "penguin"),
  unicorn: S("Unicorn", "unicorn"),
  frog: S("Frog", "frog"),
  alien: S("Alien", "alien"),
  ghost: S("Ghost", "ghost"),
  heart_eyes: S("Smiling face with heart-eyes", "smiling_face_with_heart-eyes"),
  sunglasses: S("Smiling face with sunglasses", "smiling_face_with_sunglasses"),
  cowboy: S("Cowboy hat face", "cowboy_hat_face"),
  moon: S("Crescent moon", "crescent_moon"),
  plant: S("Potted plant", "potted_plant"),
  cat: S("Cat face", "cat_face"),
  coffee: S("Hot beverage", "hot_beverage"),
  sparkle: S("Sparkles", "sparkles"),
};
const out = process.argv[2] ?? "public/avatars";
for (const [k, p] of Object.entries(list)) {
  const url = base + p.split("/").map(encodeURIComponent).join("/");
  const r = await fetch(url);
  if (!r.ok) {
    console.log("MISS", k, r.status, p);
    continue;
  }
  const buf = Buffer.from(await r.arrayBuffer());
  await sharp(buf)
    .resize(192, 192, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 82 })
    .toFile(`${out}/${k}.webp`);
  console.log("ok", k);
}

// Game and feature art, same source and licence.
const art = {
  know_me: S("Thinking face", "thinking_face"),
  draw_guess: S("Artist palette", "artist_palette"),
  trivia: S("Light bulb", "light_bulb"),
  wyr: S("Balance scale", "balance_scale"),
  word: S("Abacus", "abacus"),
  story: S("Open book", "open_book"),
  rps: tone("Victory hand", "victory_hand", "Default"),
  snap: S("Camera with flash", "camera_with_flash"),
  zoom: S("Magnifying glass tilted left", "magnifying_glass_tilted_left"),
  memory: S("Framed picture", "framed_picture"),
  slot: S("Slot machine", "slot_machine"),
  rock: tone("Raised fist", "raised_fist", "Default"),
  paper: tone("Raised hand", "raised_hand", "Default"),
  scissors: tone("Victory hand", "victory_hand", "Default"),
  telephone: S("Telephone receiver", "telephone_receiver"),
  video: S("Video camera", "video_camera"),
  fire: S("Fire", "fire"),
  sparkling_heart: S("Sparkling heart", "sparkling_heart"),
  party: S("Party popper", "party_popper"),
  trophy: S("Trophy", "trophy"),
};
for (const [k, p] of Object.entries(art)) {
  const url = base + p.split("/").map(encodeURIComponent).join("/");
  const r = await fetch(url);
  if (!r.ok) {
    console.log("MISS", k, r.status, p);
    continue;
  }
  const buf = Buffer.from(await r.arrayBuffer());
  await sharp(buf)
    .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 82 })
    .toFile(`public/art/${k}.webp`);
}
