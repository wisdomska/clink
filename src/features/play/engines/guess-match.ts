/**
 * Guess matching for the guessing games (Draw and Guess, Zoom Guess).
 * "Close enough" counts: case, accents and filler words are ignored; plurals
 * and -ing / -ed forms match their root; a small typo is forgiven; the answer
 * can sit inside a longer guess ("a big pizza"); and common synonyms count
 * ("puppy" for dog, "cellphone" for phone).
 * Runs on the server only for scoring, so it can't be gamed from the client.
 */

const FILLER = new Set([
  "a",
  "an",
  "the",
  "my",
  "our",
  "your",
  "some",
  "its",
  "it",
  "is",
  "thats",
  "this",
  "that",
  "i",
  "think",
  "maybe",
  "like",
  "of",
]);

/** Lowercase, no accents or punctuation, filler words out. */
export function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !FILLER.has(w))
    .join(" ");
}

/** A rough root: pizzas → pizza, dancing → danc, cried → cri, berries → berri. */
export function stem(w: string): string {
  if (w.length <= 3) return w;
  return w
    .replace(/(ies|ied)$/, "i")
    .replace(/(ing|ed|es|s)$/, "")
    .replace(/(.)\1$/, "$1")
    .replace(/e$/, "");
}

/** Edit distance (insert, delete, substitute). */
export function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i]![j] = Math.min(
        d[i - 1]![j]! + 1,
        d[i]![j - 1]! + 1,
        d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
  return d[a.length]![b.length]!;
}

/** How many typos a word of this length forgives. */
function tolerance(len: number): number {
  return len >= 8 ? 2 : len >= 5 ? 1 : 0;
}

function wordsMatch(g: string, a: string): boolean {
  if (g === a) return true;
  const gs = stem(g);
  const as = stem(a);
  if (gs === as) return true;
  return distance(gs, as) <= tolerance(as.length) && Math.abs(g.length - a.length) <= 2;
}

/** Other ways people say the words in the decks. Keys are answers. */
export const SYNONYMS: Record<string, string[]> = {
  phone: ["cellphone", "cell phone", "mobile", "mobile phone", "smartphone", "iphone"],
  plane: ["airplane", "aeroplane", "jet", "aircraft"],
  bicycle: ["bike", "cycle"],
  car: ["auto", "automobile", "vehicle"],
  dog: ["puppy", "doggy", "doggo", "pup", "hound"],
  cat: ["kitten", "kitty", "pussycat"],
  rabbit: ["bunny", "hare"],
  doughnut: ["donut"],
  burger: ["hamburger", "cheeseburger"],
  sandwich: ["sub", "sarnie"],
  "ice cream": ["icecream", "gelato", "ice cream cone", "cone"],
  laptop: ["computer", "notebook", "macbook", "pc"],
  glasses: ["spectacles", "specs", "eyeglasses", "sunglasses"],
  shoe: ["sneaker", "trainer", "boot"],
  sock: ["stocking"],
  gift: ["present", "box"],
  house: ["home", "hut"],
  boat: ["ship", "sailboat", "canoe"],
  rocket: ["spaceship", "rocketship"],
  sun: ["sunshine", "sunny"],
  rain: ["raining", "rainy", "drizzle", "storm"],
  cry: ["crying", "tears", "sad", "sobbing", "weep"],
  laugh: ["laughing", "lol", "giggle", "haha"],
  kiss: ["kissing", "smooch", "peck"],
  hug: ["hugging", "cuddle", "embrace"],
  sleep: ["sleeping", "nap", "bed time", "zzz"],
  run: ["running", "jog", "jogging", "sprint"],
  swim: ["swimming", "swimmer"],
  jump: ["jumping", "hop", "leap"],
  dance: ["dancing", "dancer"],
  wave: ["waves", "ocean", "sea", "surf"],
  heart: ["love"],
  star: ["stars"],
  moon: ["crescent"],
  cup: ["mug", "teacup"],
  teapot: ["kettle", "tea pot"],
  lamp: ["light", "lightbulb"],
  candle: ["flame"],
  fire: ["flames", "campfire", "bonfire"],
  bath: ["bathtub", "tub"],
  bed: ["mattress"],
  chair: ["seat", "stool"],
  table: ["desk"],
  clock: ["watch", "time"],
  rollercoaster: ["roller coaster", "coaster"],
  skateboard: ["skate board", "skating"],
  snowman: ["snow man"],
  toothbrush: ["tooth brush"],
  watermelon: ["water melon", "melon"],
  pineapple: ["pine apple"],
  lollipop: ["lolly", "sucker", "candy"],
  popcorn: ["pop corn"],
  cookie: ["biscuit"],
  cake: ["cupcake", "birthday cake"],
  sushi: ["maki"],
  guitar: ["ukulele"],
  drum: ["drums"],
  ring: ["wedding ring", "engagement ring"],
  crown: ["tiara"],
  ghost: ["spirit", "boo"],
  robot: ["android", "bot"],
  mermaid: ["siren"],
  frog: ["toad"],
  turtle: ["tortoise"],
  bird: ["birdie", "parrot", "pigeon"],
  fish: ["goldfish"],
  spider: ["tarantula"],
  snake: ["serpent", "python"],
  monkey: ["ape", "chimp", "gorilla"],
  lion: ["big cat"],
  owl: ["hoot"],
  island: ["isle"],
  mountain: ["hill", "mountains"],
  volcano: ["eruption"],
  beach: ["seaside", "shore"],
  cloud: ["clouds"],
  tree: ["palm tree", "oak"],
  flower: ["rose", "tulip", "daisy", "sunflower"],
  bridge: ["overpass"],
  castle: ["palace"],
  tent: ["camping"],
  suitcase: ["luggage", "bag", "baggage"],
  passport: ["id"],
  map: ["atlas"],
  camera: ["photo", "picture"],
  pencil: ["pen", "crayon"],
  scissors: ["shears"],
  hammer: ["mallet"],
  key: ["keys"],
  umbrella: ["parasol", "brolly"],
  balloon: ["balloons"],
  kite: ["kites"],
  swing: ["swingset"],
  window: ["windows"],
  door: ["doorway"],
  mirror: ["reflection"],
  broom: ["brush", "sweeper"],
  bus: ["coach"],
  train: ["subway", "tram", "metro"],
  egg: ["eggs"],
};

const SYN_INDEX = new Map<string, string[]>();
for (const [answer, alts] of Object.entries(SYNONYMS))
  SYN_INDEX.set(normalise(answer), alts.map(normalise));

function phraseMatch(g: string, a: string): boolean {
  if (!g || !a) return false;
  if (g === a || g.replace(/ /g, "") === a.replace(/ /g, "")) return true;
  const gw = g.split(" ");
  const aw = a.split(" ");
  if (gw.length === aw.length && gw.every((w, i) => wordsMatch(w, aw[i]!))) return true;
  // The answer inside a short longer guess ("a big fluffy pizza"), in order.
  // Capped at four words so a list of guesses can't fish for points.
  if (gw.length <= 4)
    for (let i = 0; i + aw.length <= gw.length; i++)
      if (aw.every((w, j) => wordsMatch(gw[i + j]!, w))) return true;
  // A one-word guess that is the main word of a longer answer ("cream" won't do, "icecream" will).
  if (gw.length === 1 && aw.length > 1) {
    const joined = aw.join("");
    if (distance(gw[0]!, joined) <= tolerance(joined.length)) return true;
  }
  // Whole-phrase typo for multi-word answers.
  return aw.length > 1 && distance(g, a) <= tolerance(a.length);
}

/** True when the guess means the answer, closely enough to score. */
export function matchGuess(guess: string, answer: string): boolean {
  const g = normalise(guess);
  const a = normalise(answer);
  if (!g || !a) return false;
  if (phraseMatch(g, a)) return true;
  const alts = SYN_INDEX.get(a);
  return Boolean(alts?.some((alt) => phraseMatch(g, alt)));
}
