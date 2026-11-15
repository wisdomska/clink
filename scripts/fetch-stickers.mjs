/**
 * Sticker and mood artwork: Microsoft Fluent Emoji 3D (MIT licence,
 * https://github.com/microsoft/fluentui-emoji), saved as 256 px WebP.
 * Run: node scripts/fetch-stickers.mjs
 */
import sharp from "sharp";
const base = "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/";
const S = (folder, file) => `${folder}/3D/${file}_3d.png`;
const stickers = {
  clink: S("Clinking glasses", "clinking_glasses"),
  "miss-u": S("Pleading face", "pleading_face"),
  "ur-cute": S("Smiling face with hearts", "smiling_face_with_hearts"),
  "night-x": S("Crescent moon", "crescent_moon"),
  lol: S("Face with tears of joy", "face_with_tears_of_joy"),
  omw: S("Running shoe", "running_shoe"),
  same: S("Handshake", "handshake"),
  brb: S("Hourglass not done", "hourglass_not_done"),
  "call-me": S("Telephone receiver", "telephone_receiver"),
  proud: S("Star-struck", "star-struck"),
  hehe: S("Smirking face", "smirking_face"),
  "good-morn": S("Sun with face", "sun_with_face"),
  ily: S("Red heart", "red_heart"),
  dying: S("Skull", "skull"),
  noted: S("Memo", "memo"),
  "ok-fine": S("Face with rolling eyes", "face_with_rolling_eyes"),
  mwah: S("Face blowing a kiss", "face_blowing_a_kiss"),
  hug: S("Hugging face", "hugging_face"),
  soon: S("Airplane", "airplane"),
  yesss: S("Partying face", "partying_face"),
  nope: S("Face with hand over mouth", "face_with_hand_over_mouth"),
  fire: S("Fire", "fire"),
  "heart-fire": S("Heart on fire", "heart_on_fire"),
  melting: S("Melting face", "melting_face"),
  "hot-face": S("Hot face", "hot_face"),
  shush: S("Shushing face", "shushing_face"),
  hungry: S("Pizza", "pizza"),
  cheers: S("Clinking beer mugs", "clinking_beer_mugs"),
  "sparkle-heart": S("Sparkling heart", "sparkling_heart"),
  crying: S("Loudly crying face", "loudly_crying_face"),
  "mind-blown": S("Exploding head", "exploding_head"),
  eyes: S("Eyes", "eyes"),
  100: S("Hundred points", "hundred_points"),
  rose: S("Rose", "rose"),
  ring: S("Ring", "ring"),
  zzz: S("Sleeping face", "sleeping_face"),
};
const moods = {
  "mood-cosy": S("Hot beverage", "hot_beverage"),
  "mood-missing": S("Pleading face", "pleading_face"),
  "mood-wired": S("Zany face", "zany_face"),
  "mood-tired": S("Yawning face", "yawning_face"),
  "mood-flirty": S("Smirking face", "smirking_face"),
  "mood-low": S("Cloud with rain", "cloud_with_rain"),
};
async function save(list, dir) {
  for (const [k, p] of Object.entries(list)) {
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
      .toFile(`${dir}/${k}.webp`);
  }
}
await save(stickers, "public/stickers");
await save(moods, "public/art");
