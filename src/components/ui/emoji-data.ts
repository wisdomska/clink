/**
 * The emoji picker's set: grouped like a keyboard, each with a few search words.
 * Format per group: "emoji words words, emoji words, ...".
 */
const RAW: Array<[string, string, string]> = [
  [
    "smileys",
    "Smileys",
    "😀 grin happy, 😃 smile happy, 😄 laugh happy, 😁 grin teeth, 😆 laugh lol, 😅 sweat relief, 🤣 rofl lol, 😂 joy cry laugh lol, 🙂 smile, 🙃 upside silly, 😉 wink flirt, 😊 blush happy, 😇 angel innocent, 🥰 love hearts adore, 😍 heart eyes love, 🤩 star struck wow, 😘 kiss blow, 😗 kiss, 😚 kiss shy, 😙 kiss, 😋 yum tasty, 😛 tongue, 😜 wink tongue silly, 🤪 crazy silly, 😝 tongue silly, 🤑 money, 🤗 hug, 🤭 oops giggle, 🤫 shh secret, 🤔 think hmm, 🤐 zip quiet, 🤨 sus raised, 😐 neutral meh, 😑 meh, 😶 speechless, 😏 smirk flirt, 😒 unamused, 🙄 eye roll, 😬 grimace awkward, 😮‍💨 sigh exhale, 🤥 liar, 😌 relieved calm, 😔 pensive sad, 😪 sleepy, 🤤 drool, 😴 sleep zzz, 😷 sick mask, 🤒 sick, 🤕 hurt, 🤢 nausea, 🤮 vomit, 🥵 hot sweat, 🥶 cold freeze, 🥴 woozy tipsy drunk, 😵 dizzy, 🤯 mind blown, 🤠 cowboy, 🥳 party celebrate, 🥸 disguise, 😎 cool sunglasses, 🤓 nerd, 🧐 monocle, 😕 confused, 😟 worried, 🙁 frown sad, 😮 wow surprised, 😯 hushed, 😲 shocked, 😳 flushed embarrassed, 🥺 pleading puppy eyes, 🥹 holding tears touched, 😦 frown, 😧 anguished, 😨 fear scared, 😰 anxious sweat, 😥 sad relieved, 😢 cry tear, 😭 sob cry, 😱 scream, 😖 confounded, 😣 persevere, 😞 disappointed, 😓 sweat, 😩 weary, 😫 tired, 🥱 yawn bored, 😤 huff triumph, 😡 angry rage, 😠 angry mad, 🤬 swear curse, 😈 devil naughty, 👿 imp angry, 💀 dead skull lol, 👻 ghost boo, 🤡 clown, 💩 poop, 👽 alien, 🤖 robot",
  ],
  [
    "love",
    "Love",
    "❤️ red heart love, 🩷 pink heart, 🧡 orange heart, 💛 yellow heart, 💚 green heart, 💙 blue heart, 🩵 light blue heart, 💜 purple heart, 🖤 black heart, 🤍 white heart, 🤎 brown heart, ❤️‍🔥 heart fire passion, ❤️‍🩹 mending heart, 💔 broken heart, 💕 two hearts, 💞 revolving hearts, 💓 beating heart, 💗 growing heart, 💖 sparkling heart, 💘 cupid arrow, 💝 heart gift, 💟 heart, ❣️ heart exclamation, 💋 kiss lips, 💌 love letter, 💑 couple, 💏 kiss couple, 👩‍❤️‍👨 couple heart, 👩‍❤️‍👩 couple heart, 👨‍❤️‍👨 couple heart, 🫶 heart hands, 🌹 rose, 💐 bouquet flowers, 💍 ring engaged, 💒 wedding, 🥂 cheers clink toast, 🍾 champagne, 🫦 bite lip flirt, 😻 cat heart eyes, 💯 hundred perfect",
  ],
  [
    "hands",
    "Hands and people",
    "👋 wave hi, 🤚 hand, 🖐️ hand, ✋ high five, 🖖 vulcan, 👌 ok, 🤌 chef kiss, 🤏 pinch little, ✌️ peace, 🤞 fingers crossed luck, 🫰 snap money heart, 🤟 love you, 🤘 rock, 🤙 call me, 👈 left, 👉 right, 👆 up, 👇 down, ☝️ point, 👍 thumbs up yes like, 👎 thumbs down no, ✊ fist, 👊 punch fist bump, 🤛 fist, 🤜 fist, 👏 clap applause, 🙌 raise hands yay, 👐 open hands, 🤲 palms, 🤝 handshake deal, 🙏 pray please thanks, 💪 strong muscle, 🫡 salute, 🫣 peek shy, 🫠 melting, 🫢 gasp, 👀 eyes look, 👅 tongue, 👄 mouth lips, 🧠 brain, 🫂 hug people, 🙋 raise hand, 🤷 shrug, 🤦 facepalm, 💃 dance, 🕺 dance, 🏃 run, 🧎 kneel, 🛌 bed sleep",
  ],
  [
    "spicy",
    "After hours",
    "🔥 fire hot lit, 🥵 hot, 😈 naughty devil, 😏 smirk, 🫦 bite lip, 💦 splash sweat, 🍑 peach, 🍆 eggplant, 🍒 cherries, 🌶️ chili spicy, 👅 tongue, 💋 kiss, 👙 bikini, 🩲 underwear, 👠 heels, 🛁 bath, 🛏️ bed, 🕯️ candle, 🍷 wine, 🍸 cocktail, 🥃 whisky, 🍓 strawberry, 🍫 chocolate, 🌙 night moon, ⛓️ chains, 🎀 bow, 🔒 locked, 🗝️ key, 🙈 see no evil, 🫣 peek",
  ],
  [
    "party",
    "Celebrate",
    "🎉 party tada, 🎊 confetti, 🥳 party, 🎂 cake birthday, 🍰 cake, 🧁 cupcake, 🎁 gift present, 🎈 balloon, ✨ sparkles magic, 🌟 star glow, ⭐ star, 💫 dizzy star, 🎆 fireworks, 🎇 sparkler, 🏆 trophy win, 🥇 gold first, 🎯 bullseye, 🎮 game, 🎲 dice, 🃏 joker, 🎵 music note, 🎶 music, 🎤 mic sing, 🎧 headphones, 📸 camera photo, 🎬 movie, 🍿 popcorn movie night",
  ],
  [
    "nature",
    "Animals and nature",
    "🐶 dog puppy, 🐱 cat kitty, 🐭 mouse, 🐹 hamster, 🐰 bunny rabbit, 🦊 fox, 🐻 bear, 🐼 panda, 🐨 koala, 🐯 tiger, 🦁 lion, 🐮 cow, 🐷 pig, 🐸 frog, 🐵 monkey, 🙈 monkey see no evil, 🐔 chicken, 🐧 penguin, 🐦 bird, 🦆 duck, 🦉 owl, 🦄 unicorn, 🐝 bee, 🦋 butterfly, 🐌 snail, 🐢 turtle, 🐍 snake, 🐙 octopus, 🐬 dolphin, 🐳 whale, 🦈 shark, 🐾 paws, 🌸 blossom, 🌺 hibiscus, 🌻 sunflower, 🌷 tulip, 🌼 flower, 🍀 clover luck, 🌴 palm, 🌵 cactus, 🍁 leaf autumn, 🌈 rainbow, ☀️ sun, 🌤️ sunny, ⛅ cloud, 🌧️ rain, ⛈️ storm, ❄️ snow cold, ⚡ lightning, 🌊 wave sea, 🌍 world earth, 🌕 full moon, 🌙 moon night, 🌚 moon face",
  ],
  [
    "food",
    "Food and drink",
    "🍕 pizza, 🍔 burger, 🍟 fries, 🌭 hotdog, 🌮 taco, 🌯 burrito, 🍣 sushi, 🍜 noodles ramen, 🍝 pasta, 🍛 curry, 🍚 rice, 🥗 salad, 🍳 egg breakfast, 🥞 pancakes, 🧇 waffle, 🥐 croissant, 🍞 bread, 🧀 cheese, 🍗 chicken, 🥩 steak, 🍤 shrimp, 🍦 ice cream, 🍩 donut, 🍪 cookie, 🍫 chocolate, 🍬 candy, 🍭 lollipop, 🍯 honey, 🍎 apple, 🍌 banana, 🍉 watermelon, 🍇 grapes, 🍓 strawberry, 🍒 cherries, 🍑 peach, 🥭 mango, 🍍 pineapple, 🥑 avocado, ☕ coffee, 🍵 tea, 🧋 bubble tea boba, 🥤 drink, 🍺 beer, 🍻 cheers beers, 🍷 wine, 🥂 cheers champagne, 🍹 tropical drink, 🍸 cocktail",
  ],
  [
    "travel",
    "Travel and places",
    "✈️ plane flight, 🛫 departure, 🛬 arrival, 🚀 rocket, 🚗 car, 🚕 taxi, 🚌 bus, 🚆 train, 🚲 bike, 🛵 scooter, 🚢 ship, ⛵ sail, 🗺️ map, 🧭 compass, 🧳 luggage suitcase, 🏖️ beach, 🏝️ island, 🏔️ mountain, ⛺ camping, 🏠 home house, 🏡 home, 🏙️ city, 🌃 night city, 🌉 bridge, 🗼 tower, 🗽 liberty, 🎡 ferris wheel, 🎢 rollercoaster, 🌅 sunrise, 🌇 sunset, ⏰ alarm, ⏳ hourglass waiting, 📍 pin location, 🛰️ satellite, 🌌 galaxy stars",
  ],
  [
    "objects",
    "Objects and symbols",
    "📱 device phone, 💻 laptop, ⌚ watch, 📷 camera, 🎥 video, 💡 idea, 🔔 bell, 📣 megaphone, 📌 pin, ✏️ pencil, 📝 note memo, 📚 books, 💰 money, 💎 gem diamond, 🔑 key, 🔐 lock, 🧸 teddy bear, 🪄 magic wand, 🔮 crystal ball, 💤 zzz sleep, 💬 speech, 💭 thought, 🗯️ anger bubble, ✅ check yes done, ❌ cross no, ❓ question, ❗ exclamation, ‼️ double exclamation, ⁉️ what, ⚠️ warning, 🚫 no forbidden, 💢 anger, 💥 boom, 🆗 ok, 🆒 cool, 🆕 new, 🔝 top, 🔜 soon, ♾️ forever infinity, ☮️ peace, ☯️ yin yang, ♈ aries, ♉ taurus, ♊ gemini, ♋ cancer, ♌ leo, ♍ virgo, ♎ libra, ♏ scorpio, ♐ sagittarius, ♑ capricorn, ♒ aquarius, ♓ pisces",
  ],
];

export interface EmojiGroup {
  id: string;
  label: string;
  items: Array<{ e: string; words: string }>;
}

export const EMOJI_GROUPS: EmojiGroup[] = RAW.map(([id, label, list]) => ({
  id,
  label,
  items: list.split(", ").map((chunk) => {
    const i = chunk.indexOf(" ");
    return { e: chunk.slice(0, i), words: chunk.slice(i + 1) };
  }),
}));
