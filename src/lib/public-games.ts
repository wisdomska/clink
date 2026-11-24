/**
 * The public game pages (/games and /games/[slug]): what each game is and how
 * to play it, for people deciding whether to try Clink and for search engines
 * and AI assistants answering "games to play with your partner" questions.
 * Facts only, matched to the engines in src/features/play/engines. The board
 * game rules come from the same text the in-game "How to play" sheet shows.
 */
import { RULES } from "@/features/play/board-copy";

export type PublicGame = {
  slug: string;
  name: string;
  /** Art in /public/art. */
  art: string;
  mode: "Live" | "Turn by turn" | "Daily";
  /** "About 5 minutes", "Over a few days". */
  length: string;
  /** One or two sentences that answer "what is it?" on their own. */
  summary: string;
  /** Who it suits, in one line. */
  bestFor: string;
  intro?: string;
  steps: string[];
  tips: string[];
  faq: { q: string; a: string }[];
  /** Search phrases this page answers, used in its description. */
  keywords: string[];
};

const board = (k: keyof typeof RULES) => ({ intro: RULES[k].intro, steps: RULES[k].rules });

export const PUBLIC_GAMES: PublicGame[] = [
  {
    slug: "how-well-do-you-know-me",
    name: "How well do you know me",
    art: "know_me",
    mode: "Live",
    length: "About 5 minutes",
    summary:
      "A couples quiz for two. One of you answers 10 questions about yourself, the other guesses each answer, and both answers stay hidden until you've both locked in.",
    bestFor: "New couples, anniversaries, and finding out what you never asked.",
    steps: [
      "Whoever starts the game is the guesser; the other partner is the subject. Start the next one the other way round.",
      "Each round has 10 questions about the subject: favourites, habits, memories and what they would do.",
      "The subject answers honestly while the guesser picks what they think the subject chose.",
      "Answers are sealed until you've both answered, so nobody can peek or change their mind.",
      "Every match scores a point. Six or more out of 10 and the guesser wins the round; fewer and the subject does.",
    ],
    tips: [
      "Talk about the misses. They're often the best part.",
      "Play it again a few months on and see how your score changes.",
    ],
    faq: [
      {
        q: "Can we play How well do you know me long distance?",
        a: "Yes. You each play on your own device at the same time, from anywhere, and the answers are revealed to both of you together.",
      },
      {
        q: "What's a good score?",
        a: "Six or more out of 10 wins the round for the guesser. Most couples land between five and eight.",
      },
    ],
    keywords: ["couples quiz", "how well do you know me questions", "quiz for couples online"],
  },
  {
    slug: "draw-and-guess",
    name: "Draw and guess",
    art: "draw_guess",
    mode: "Live",
    length: "About 8 minutes",
    summary:
      "A drawing game for two over the internet. One of you draws a word, the other watches every stroke appear live and races to guess it within 60 seconds.",
    bestFor: "Laughing at each other's art, on a call or without one.",
    steps: [
      "A game has 3 rounds. In each round you both get one turn to draw.",
      "The drawer sees a secret word and has 60 seconds to draw it. Every stroke shows up on the guesser's screen as it's drawn.",
      "The guesser types guesses. Close enough counts: capital letters, small typos, plurals and common synonyms are all accepted.",
      "The faster the guess, the more points. The drawer earns half of what the guesser earns, so you both want a quick guess.",
      "After 3 rounds the higher score wins.",
    ],
    tips: [
      "Draw the shape first and the details later.",
      "Arrows and little scenes help more than shading.",
    ],
    faq: [
      {
        q: "Is Draw and guess like Pictionary?",
        a: "It's the same idea, made for two people on two devices: one draws, one guesses, and you swap every round.",
      },
      {
        q: "Does a guess have to be spelled exactly?",
        a: "No. Case, accents, a small typo, plurals and common synonyms such as puppy for dog all count.",
      },
    ],
    keywords: ["drawing game for couples online", "pictionary for two", "draw and guess online"],
  },
  {
    slug: "trivia-duel",
    name: "Trivia duel",
    art: "question",
    mode: "Live",
    length: "About 5 minutes",
    summary:
      "A head-to-head quiz for two: 10 multiple choice questions across six categories (Film, Food, Music, Science, Travel and Words), answered at the same time.",
    bestFor: "Competitive couples and settling who really knows more.",
    steps: [
      "You both see the same question with four options.",
      "Answer on your own device. Your answers are hidden from each other until you've both picked.",
      "Each right answer scores a point.",
      "Questions come from six categories: Film, Food, Music, Science, Travel and Words.",
      "After 10 questions the higher score wins. A tie is a tie.",
    ],
    tips: ["Read all four options before you tap.", "Play best of three for bragging rights."],
    faq: [
      {
        q: "Can we play Trivia duel from different countries?",
        a: "Yes. You each answer on your own device and see the results together, wherever you both are.",
      },
    ],
    keywords: ["trivia for couples", "quiz game for two online", "couples trivia questions"],
  },
  {
    slug: "would-you-rather",
    name: "Would you rather",
    art: "slot",
    mode: "Live",
    length: "As long as you like",
    summary:
      "Would you rather questions for couples. You both pick an answer at the same time and Clink shows where you match and where you don't.",
    bestFor: "Easy conversation starters, dinner dates and long calls.",
    intro: "Choose a deck to start: Silly, Deep, Future or Travel.",
    steps: [
      "Pick a deck. Silly is light, Deep gets personal, Future is about life plans, and Travel is about where you would go.",
      "Each card gives two options. You both choose one, privately.",
      "Once you've both chosen, the answers show side by side and matches are marked.",
      "There's no score to beat. The talk afterwards is the point.",
    ],
    tips: ["Ask why on every mismatch.", "Use the Future deck when you're planning a visit."],
    faq: [
      {
        q: "Are there deep would you rather questions for couples?",
        a: "Yes. The Deep deck is made for that, and the Future deck covers plans like where you would live and what you would build together.",
      },
    ],
    keywords: [
      "would you rather questions for couples",
      "deep would you rather",
      "couples conversation game",
    ],
  },
  {
    slug: "word-game",
    name: "Word game",
    art: "puzzle",
    mode: "Turn by turn",
    length: "Over a day or two",
    summary:
      "A turn-based word game on a shared 4 by 4 letter board. Take turns tracing words through touching tiles; longer words score more.",
    bestFor: "Couples with busy days or different time zones.",
    steps: [
      "You share one 4 by 4 board of letters.",
      "On your turn, trace a word through tiles that touch, across, up and down or diagonally.",
      "Longer words score more points.",
      "You each get 8 turns. The game also ends if you both pass in a row.",
      "Clink lets your partner know when it's their turn, so a game can run over days.",
    ],
    tips: [
      "Look for endings like -ER, -ED and -ING.",
      "Short words are fine when the board is tight.",
    ],
    faq: [
      {
        q: "Do we have to play at the same time?",
        a: "No. Word game is turn by turn: play your word whenever you're free and your partner gets a notification.",
      },
    ],
    keywords: ["word game for couples", "turn based word game", "boggle for two online"],
  },
  {
    slug: "story-builder",
    name: "Story builder",
    art: "story",
    mode: "Turn by turn",
    length: "Over a few days",
    summary:
      "Write a story together one line at a time. You take turns adding a line, up to 40 lines, and end up with something only the two of you could have written.",
    bestFor: "Creative couples and slow, silly evenings apart.",
    steps: [
      "One of you writes the first line.",
      "Take turns adding the next line. You can only see the story so far.",
      "Keep going until the story ends or you reach 40 lines.",
      "Read it back together when it's done.",
    ],
    tips: ["End your line on a cliffhanger.", "Bring in your in-jokes."],
    faq: [
      {
        q: "How long is a story?",
        a: "Up to 40 lines, written one line each in turn.",
      },
    ],
    keywords: [
      "story game for couples",
      "write a story together online",
      "collaborative story game",
    ],
  },
  {
    slug: "rock-paper-scissors",
    name: "Rock paper scissors",
    art: "rps",
    mode: "Live",
    length: "About a minute",
    summary:
      "Rock paper scissors for two people on different devices. Throws are sealed until you've both chosen, so neither can wait and react. First to 3 wins.",
    bestFor: "Settling who picks the film, who calls first, or who apologises.",
    steps: [
      "You both choose rock, paper or scissors.",
      "Your throw stays hidden until your partner has thrown too.",
      "Rock beats scissors, scissors beats paper and paper beats rock. The same throw is a draw.",
      "First to 3 wins.",
    ],
    tips: ["Decide what's at stake before you start."],
    faq: [
      {
        q: "Can my partner see my throw before choosing?",
        a: "No. Throws are sealed on the server until you've both chosen.",
      },
    ],
    keywords: ["rock paper scissors online with friend", "rock paper scissors for two"],
  },
  {
    slug: "snap-challenge",
    name: "Snap challenge",
    art: "snap",
    mode: "Live",
    length: "About 5 minutes",
    summary:
      "A photo game for couples apart. You get the same 3 prompts, each take a photo, then each pick the better one. Agree and it scores.",
    bestFor: "Seeing each other's world when you're in different places.",
    steps: [
      'You both get the same prompt, such as "Something blue" or "Your view right now".',
      "Each of you takes a photo. Photos stay hidden until you've both sent one.",
      "Then each of you picks the better photo.",
      "If you agree on a photo, it scores. If you each pick the other's, you both score.",
      "There are 3 prompts in a game.",
    ],
    tips: ["Be quick, not perfect.", "Funny beats pretty."],
    faq: [
      {
        q: "Where do the photos go?",
        a: "They stay private to the two of you inside Clink.",
      },
    ],
    keywords: ["photo game for long distance couples", "photo challenge for couples"],
  },
  {
    slug: "zoom-guess",
    name: "Zoom guess",
    art: "zoom",
    mode: "Live",
    length: "About 4 minutes",
    summary:
      "Guess the photo from an extreme close-up. Each wrong guess zooms out a step: 5 points for a first-look guess, down to 1 at the widest view.",
    bestFor: "Showing off your room, your street or your lunch.",
    steps: [
      "There are two rounds, one each.",
      "The setter picks a photo and says what it is.",
      "The guesser sees it zoomed right in and types a guess.",
      "Each wrong guess zooms out a step.",
      "A guess at the first look scores 5 points, down to 1 at the widest view.",
    ],
    tips: ["Pick something with a clear answer.", "Textures make the best close-ups."],
    faq: [
      {
        q: "Does my guess have to match exactly?",
        a: "No. Small typos, plurals and common synonyms count, the same as Draw and guess.",
      },
    ],
    keywords: ["zoomed in picture game", "guess the picture game for two"],
  },
  {
    slug: "photo-memory",
    name: "Photo memory",
    art: "memory",
    mode: "Live",
    length: "About 5 minutes",
    summary:
      "The classic pairs memory game, made from your own shared photos: 12 cards and 6 pairs. Take turns flipping two; a match scores and you go again.",
    bestFor: "A trip down memory lane that's also a contest.",
    steps: [
      "Twelve cards are laid face down: six pairs, drawn from the photos you've shared in Clink (topped up with art if you've only just started).",
      "Take turns flipping two cards.",
      "A match scores a point and you go again. No match and it's your partner's turn.",
      "When every pair is found, the higher score wins.",
    ],
    tips: ["Watch your partner's turns closely.", "Remember positions, not pictures."],
    faq: [
      {
        q: "Can my partner see where the cards are?",
        a: "No. The layout stays on the server and only flipped cards are shown.",
      },
    ],
    keywords: ["memory game with your own photos", "pairs game for couples"],
  },
  {
    slug: "oware",
    name: "Oware",
    art: "oware",
    mode: "Turn by turn",
    length: "20 to 40 minutes of play, at your own pace",
    summary:
      "Oware is a West African count-and-capture board game and Ghana's national game. Two players sow seeds around twelve pits and capture when the last seed makes a pit 2 or 3. First to 25 seeds wins.",
    bestFor: "Strategic couples, and anyone who grew up playing it in Ghana.",
    ...board("oware"),
    tips: [
      "Count before you sow: the last seed decides everything.",
      "Pits of 1 or 2 on their side are targets. Leave yours at 3 or more where you can.",
      "A big pit of 12 or more seeds can go all the way round and capture at the end.",
      "Practise against Clink first: easy, medium and hard.",
    ],
    faq: [
      {
        q: "What are the rules of oware?",
        a: "Each player has six pits with four seeds in each. On your turn you lift all the seeds from one of your pits and sow them one by one anticlockwise. If your last seed lands in an opponent's pit and makes it 2 or 3, you capture those seeds, and any 2s and 3s before it on their side. You must leave your opponent a move if you can. First to 25 seeds wins.",
      },
      {
        q: "Is oware the same as mancala?",
        a: "Mancala is the name for the whole family of sowing games. Oware is one of them, played across West Africa and the Caribbean. Clink uses the Abapa rules, the most common version.",
      },
      {
        q: "What is a grand slam in oware?",
        a: "A move that would capture every seed on your opponent's side. Under Abapa rules in Clink it's allowed but captures nothing.",
      },
      {
        q: "What happens if the seeds go round forever?",
        a: "If 100 moves pass with no capture, each player keeps the seeds on their own side and the game ends.",
      },
      {
        q: "Can I play oware against the computer?",
        a: "Yes. Clink has a practice mode against a computer opponent at three levels, and you can play your partner turn by turn.",
      },
    ],
    keywords: ["oware rules", "how to play oware", "oware online", "ware game Ghana", "mancala"],
  },
  {
    slug: "four-up",
    name: "Four Up",
    art: "fourup",
    mode: "Turn by turn",
    length: "About 10 minutes of play, at your own pace",
    summary:
      "A four in a row game for two. Take turns dropping discs into a board of 7 columns and 6 rows; the first to line up four across, down or diagonally wins.",
    bestFor: "Quick games between other things, with a real strategy underneath.",
    ...board("fourup"),
    tips: [
      "The centre column is part of more lines than any other. Take it early.",
      "Build two threats at once: they can only block one.",
      "Watch for a disc that would give them three in a row with space on both sides.",
    ],
    faq: [
      {
        q: "How do you win at four in a row?",
        a: "Take the centre column early, block any open three straight away, and aim to set up two threats your partner can't block in one move.",
      },
      {
        q: "Can I practise Four Up against the computer?",
        a: "Yes. Practice mode has easy, medium and hard opponents, and nothing is saved.",
      },
    ],
    keywords: [
      "four in a row online for two",
      "connect four online with partner",
      "4 in a row rules",
    ],
  },
  {
    slug: "draughts",
    name: "Draughts",
    art: "draughts",
    mode: "Turn by turn",
    length: "30 to 60 minutes of play, at your own pace",
    summary:
      "Draughts (checkers) for two, with a choice of International rules on a 10 by 10 board, as played across Africa, or English rules on 8 by 8. Captures are compulsory and pieces that reach the far row become kings.",
    bestFor: "Couples who like a classic, slow-burn strategy game.",
    ...board("draughts"),
    tips: [
      "Keep your back row filled as long as you can: it stops their pieces being crowned.",
      "Trade pieces when you're ahead, and avoid trades when you're behind.",
      "In 10 by 10, a flying king is very strong. Crown one before they do.",
    ],
    faq: [
      {
        q: "What is the difference between draughts and checkers?",
        a: "None: draughts is the British name and checkers the American one for the same family of games. English draughts is played on an 8 by 8 board; International draughts, popular in Africa and Europe, uses a 10 by 10 board.",
      },
      {
        q: "Do you have to take a piece in draughts?",
        a: "Yes. Captures are compulsory in both versions. In International draughts you must also take the line that captures the most pieces.",
      },
      {
        q: "Can kings move backwards?",
        a: "Yes. In English draughts a king moves one square diagonally in any direction. In International draughts a king flies any distance along a diagonal.",
      },
      {
        q: "When is draughts a draw?",
        a: "In English draughts, after 40 moves each with no capture or crowning. In International draughts, after 25 moves each with only kings moving and no capture. You can also agree a draw at any time.",
      },
    ],
    keywords: [
      "draughts rules",
      "international draughts 10x10",
      "checkers online for two",
      "play draughts online with friend",
    ],
  },
  {
    slug: "daily-word-ladder",
    name: "Daily word ladder",
    art: "puzzle",
    mode: "Daily",
    length: "A few minutes a day",
    summary:
      "A daily word puzzle for couples. Turn today's four-letter start word into the target word one letter at a time, with every step a real word. You both get the same ladder, and you see your partner's once you've finished yours.",
    bestFor: "A small shared ritual every day, wherever you both are.",
    steps: [
      "Each day there's a start word and a target word, both four letters.",
      "Change exactly one letter at a time. Every step has to be a real English word.",
      "Par is the shortest route using everyday words. Try to match it.",
      "Stuck? Ask for a hint and Clink shows the next everyday step.",
      "You both play the same ladder. Your partner's route appears once you've finished yours.",
    ],
    tips: [
      "Change the letter that gets you closest to the target's shape.",
      "Vowels are the easiest letters to swap.",
    ],
    faq: [
      {
        q: "What is a word ladder?",
        a: "A word puzzle invented by Lewis Carroll: change one word into another by altering one letter at a time, with every step a real word.",
      },
      {
        q: "Does the puzzle change every day?",
        a: "Yes. There's a new ladder each day, the same for both of you.",
      },
    ],
    keywords: ["daily word puzzle for couples", "word ladder", "doublets puzzle"],
  },
];

export const gameBySlug = (slug: string) => PUBLIC_GAMES.find((g) => g.slug === slug);
