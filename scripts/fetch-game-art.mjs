/**
 * Game artwork for board games, the daily question and puzzle, the practice
 * bot and the streak freeze: Microsoft Fluent Emoji 3D (MIT licence,
 * https://github.com/microsoft/fluentui-emoji), saved as 256 px WebP.
 * Run: node scripts/fetch-game-art.mjs
 */
import sharp from "sharp";
const base = "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/";
const art = {
  oware: "Beans/3D/beans_3d.png",
  fourup: "Red circle/3D/red_circle_3d.png",
  draughts: "Chess pawn/3D/chess_pawn_3d.png",
  bot: "Robot/3D/robot_3d.png",
  puzzle: "Puzzle piece/3D/puzzle_piece_3d.png",
  question: "Thought balloon/3D/thought_balloon_3d.png",
  freeze: "Snowflake/3D/snowflake_3d.png",
};
for (const [name, path] of Object.entries(art)) {
  const r = await fetch(base + encodeURI(path));
  if (!r.ok) throw new Error(`${name}: ${r.status}`);
  await sharp(Buffer.from(await r.arrayBuffer()))
    .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 88 })
    .toFile(`public/art/${name}.webp`);
  console.log("saved", name);
}
