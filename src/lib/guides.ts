/**
 * Guides (/guides/[slug]): practical, original writing for couples, mostly
 * long distance. Each one answers a real question people search for and ask
 * AI assistants, and mentions Clink only where it genuinely helps. Facts about
 * Clink must match the product (see llms.txt).
 */

export type GuideBlock =
  | { kind: "p"; text: string }
  | { kind: "list"; ordered?: boolean; items: { title?: string; text: string }[] }
  | { kind: "tip"; text: string };

export type Guide = {
  slug: string;
  title: string;
  /** Under 160 characters: the search result snippet. */
  description: string;
  /** The first paragraph: a direct, quotable answer. */
  answer: string;
  art: string;
  published: string;
  updated: string;
  minutes: number;
  sections: { id: string; title: string; blocks: GuideBlock[] }[];
  faq: { q: string; a: string }[];
};

export const GUIDES: Guide[] = [
  {
    slug: "long-distance-date-ideas",
    title: "40 long distance date ideas that actually feel like a date",
    description:
      "Long distance date ideas for couples in different cities or countries: dinners, games, films, slow dates across time zones and small daily rituals.",
    answer:
      "The best long distance dates have three things: something you do together at the same moment, something you can both see or hold, and something to talk about afterwards. Below are 40 ideas, grouped by how much time and planning they take, that work across cities, countries and time zones.",
    art: "party",
    published: "2026-11-24",
    updated: "2026-11-24",
    minutes: 8,
    sections: [
      {
        id: "on-a-call",
        title: "Dates on a video call",
        blocks: [
          {
            kind: "list",
            ordered: true,
            items: [
              {
                title: "Cook the same meal",
                text: "Agree a recipe, shop separately, then cook with the camera propped on the counter. Jollof works well: everyone has opinions about whose is better.",
              },
              {
                title: "Dinner at the same table",
                text: "Lay the table properly, light a candle and eat together on a call. The effort is the point.",
              },
              {
                title: "Watch party",
                text: "Start the same film or series at the same second and keep the call open, or use a watch-together feature so the video stays in sync for you both.",
              },
              {
                title: "Game night",
                text: "Play a drawing game, a trivia duel or a couples quiz. Live two-player games are made for this.",
              },
              {
                title: "Museum or gallery tour",
                text: "Many museums publish virtual tours. Pick one, explore it together and choose a favourite piece each.",
              },
              {
                title: "Teach each other something",
                text: "Fifteen minutes each: a dance step, a phrase in your language, how to plait hair, how to play a chord.",
              },
              {
                title: "Workout together",
                text: "Follow the same online class. Being out of breath together is surprisingly bonding.",
              },
              {
                title: "Read aloud",
                text: "Pick a short book and read a chapter each night, taking turns.",
              },
              {
                title: "Plan the next visit",
                text: "Open a map, choose a day trip and write the plan down together. Then set a countdown.",
              },
              {
                title: "Show and tell",
                text: "Each bring three objects that mean something and tell the story behind them.",
              },
            ],
          },
        ],
      },
      {
        id: "time-zones",
        title: "Dates that work across time zones",
        blocks: [
          {
            kind: "p",
            text: "If one of you is going to bed as the other wakes up, live dates get hard. These ones happen at each person's own pace.",
          },
          {
            kind: "list",
            ordered: true,
            items: [
              {
                title: "A turn-by-turn board game",
                text: "Oware, draughts or four in a row, one move at a time over a day or two. Each move is a small message that says you were thinking of them.",
              },
              {
                title: "Write a story together",
                text: "One line each, taking turns. Read it back at the weekend.",
              },
              {
                title: "Letters for later",
                text: "Write a letter that opens on a date you choose: their first day at a new job, a bad week you know is coming, your anniversary.",
              },
              {
                title: "A time capsule",
                text: "Collect photos, voice notes and a letter, and seal them until a date months away.",
              },
              {
                title: "Morning and night voice notes",
                text: "Leave one when you wake and one before you sleep, so they always have your voice waiting.",
              },
              {
                title: "A daily puzzle",
                text: "Solve the same small puzzle each day and compare how you did. A shared ritual beats an occasional big gesture.",
              },
              {
                title: "Photo prompts",
                text: "Agree a prompt each day: your view right now, something blue, what you're drinking. Swap photos.",
              },
              {
                title: "A shared playlist",
                text: "Add one song a day with a line about why.",
              },
            ],
          },
        ],
      },
      {
        id: "small",
        title: "Small dates for busy weeks",
        blocks: [
          {
            kind: "list",
            ordered: true,
            items: [
              { title: "Ten-minute coffee", text: "Same time, same mug, camera on. No agenda." },
              {
                title: "Would you rather",
                text: "Five questions over lunch. The why behind each answer is the good part.",
              },
              {
                title: "Rock paper scissors for stakes",
                text: "Loser plans the next date, or sends the next care package.",
              },
              {
                title: "Answer one question",
                text: "One deeper question a day, answered by both of you. See our list of questions to ask your partner.",
              },
              {
                title: "Send a sign",
                text: "A single tap, a sticker or a photo that just says: thinking of you.",
              },
              {
                title: "Fall asleep on a call",
                text: "Not for every night, but on the hard ones it helps.",
              },
            ],
          },
        ],
      },
      {
        id: "special",
        title: "Special occasion dates",
        blocks: [
          {
            kind: "list",
            ordered: true,
            items: [
              {
                title: "Surprise delivery",
                text: "Send their favourite meal from a local restaurant, timed for your call.",
              },
              {
                title: "Care package with instructions",
                text: "Number each item and open them together on a call, one at a time.",
              },
              {
                title: "Anniversary memory lane",
                text: "Go through your photos from the year together and pick the top ten.",
              },
              {
                title: "Matching outfits",
                text: "Dress up for each other for no reason except dinner on a call.",
              },
              {
                title: "A playlist of your story",
                text: "One song for each month you've been together.",
              },
              {
                title: "Stargazing",
                text: "Look at the same moon from two places. A sky map app tells you where it is.",
              },
              {
                title: "Write your future",
                text: "Describe a normal day once you live in the same city, in as much detail as you can.",
              },
              {
                title: "Recreate your first date",
                text: "Same food, same music, same questions, on a call.",
              },
            ],
          },
        ],
      },
      {
        id: "playful",
        title: "Playful dates",
        blocks: [
          {
            kind: "list",
            ordered: true,
            items: [
              {
                title: "How well do you know me",
                text: "Answer questions about yourself while they guess. Score each other and rematch next month.",
              },
              { title: "Draw and guess", text: "Bad drawing is mandatory." },
              {
                title: "Zoom guess",
                text: "Send an extreme close-up of something in your room and make them guess.",
              },
              {
                title: "Memory game with your photos",
                text: "Turn your shared photos into a pairs game.",
              },
              {
                title: "Trivia duel",
                text: "Settle who really knows more about film, food or music.",
              },
              {
                title: "Snap challenge",
                text: "Same prompt, two photos, vote for the better one.",
              },
              {
                title: "Story dice",
                text: "Take three random words and make up a story about the two of you.",
              },
              {
                title: "Design your dream home",
                text: "Room by room, arguing politely about the kitchen.",
              },
            ],
          },
        ],
      },
      {
        id: "with-clink",
        title: "Doing these on Clink",
        blocks: [
          {
            kind: "p",
            text: "Clink is a free app for two people that covers most of this list in one place: video calls, thirteen two-player games (live and turn by turn), letters and time capsules that open on a date you choose, countdowns to your next visit, watching YouTube or listening on Spotify and Apple Music together, and a daily word puzzle. It runs in your browser and adds to your home screen.",
          },
        ],
      },
    ],
    faq: [
      {
        q: "How often should long distance couples have a date?",
        a: "There's no rule, but many couples find a planned date once a week plus small daily contact works better than long calls every night. Consistency matters more than length.",
      },
      {
        q: "What can long distance couples do when they're in different time zones?",
        a: "Choose things that don't need you online at the same time: turn-by-turn games, letters that open later, voice notes, shared playlists and a daily puzzle you both solve.",
      },
      {
        q: "What's a cheap long distance date idea?",
        a: "Cook the same meal on a video call, play a free two-player game, or read a book aloud to each other. None of them cost more than an ordinary evening.",
      },
    ],
  },
  {
    slug: "games-to-play-on-video-call",
    title: "Games to play with your partner on a video call",
    description:
      "The best games to play with your boyfriend or girlfriend over FaceTime, WhatsApp or any video call: quick games, quizzes, drawing games and slow games for time zones.",
    answer:
      "The best video call games for couples are ones you both play on your own device while you talk: a couples quiz, a drawing and guessing game, a trivia duel or would you rather. For couples in different time zones, turn-by-turn games such as oware, draughts or a word game keep you playing between calls.",
    art: "draw_guess",
    published: "2026-11-24",
    updated: "2026-11-24",
    minutes: 6,
    sections: [
      {
        id: "no-app",
        title: "Games that need nothing but the call",
        blocks: [
          {
            kind: "list",
            items: [
              {
                title: "Twenty questions",
                text: "One thinks of something, the other has twenty yes or no questions.",
              },
              {
                title: "Never have I ever",
                text: "Take turns. Keep it gentle, or don't.",
              },
              {
                title: "Two truths and a lie",
                text: "Surprisingly hard once you know each other well.",
              },
              {
                title: "Finish the lyric",
                text: "Sing a line, stop, and they have to carry on.",
              },
              {
                title: "Scavenger hunt",
                text: "Name an object; first to show it on camera wins the round.",
              },
            ],
          },
        ],
      },
      {
        id: "two-devices",
        title: "Games where you each play on your own device",
        blocks: [
          {
            kind: "p",
            text: "These work better than screen sharing because each of you has a proper view of the game and nobody can see the other's answer early.",
          },
          {
            kind: "list",
            items: [
              {
                title: "How well do you know me",
                text: "A ten-question couples quiz with answers hidden until you've both locked in.",
              },
              {
                title: "Draw and guess",
                text: "One draws, the other watches every stroke live and guesses against a 60 second clock.",
              },
              {
                title: "Trivia duel",
                text: "Ten questions across film, food, music, science, travel and words, answered at the same time.",
              },
              {
                title: "Would you rather",
                text: "Choose silly, deep, future or travel questions and see where you match.",
              },
              {
                title: "Rock paper scissors",
                text: "With throws sealed until you've both chosen, so neither of you can wait and react.",
              },
              {
                title: "Zoom guess and Snap challenge",
                text: "Photo games that let you show each other your surroundings.",
              },
            ],
          },
        ],
      },
      {
        id: "between-calls",
        title: "Games to keep going between calls",
        blocks: [
          {
            kind: "p",
            text: "A game that waits for your partner keeps you connected on days a call doesn't fit.",
          },
          {
            kind: "list",
            items: [
              {
                title: "Oware",
                text: "Ghana's national board game. Sow seeds round twelve pits and capture; first to 25 wins.",
              },
              {
                title: "Draughts",
                text: "International 10 by 10 or English 8 by 8, one move at a time.",
              },
              { title: "Four in a row", text: "Short games, real strategy." },
              {
                title: "Word game",
                text: "Trace words through a shared letter board, eight turns each.",
              },
              { title: "Story builder", text: "Write a story one line at a time." },
            ],
          },
        ],
      },
      {
        id: "with-clink",
        title: "Where to play them",
        blocks: [
          {
            kind: "p",
            text: "Every game in the last two lists is free on Clink, an app for two people. You can call from the same place, and the turn-by-turn games let your partner know when it's their move.",
          },
        ],
      },
    ],
    faq: [
      {
        q: "What games can you play on FaceTime with your girlfriend or boyfriend?",
        a: "Without any app: twenty questions, two truths and a lie, never have I ever and a scavenger hunt. With an app on each device: a couples quiz, a drawing and guessing game, a trivia duel and would you rather.",
      },
      {
        q: "Can you play board games over video call?",
        a: "Yes. Turn-based board games such as oware, draughts and four in a row work well online, because each of you sees the board on your own device and moves when it's your turn.",
      },
    ],
  },
  {
    slug: "long-distance-relationship-tips",
    title: "Long distance relationship tips that hold up over time",
    description:
      "Practical tips for long distance relationships: communication without pressure, handling time zones, planning visits, trust and keeping it fun.",
    answer:
      "Long distance relationships last when both people know when they'll next see each other, keep small daily contact without making it a duty, share experiences rather than only updates, and talk openly about the hard parts. The tips below cover each of those.",
    art: "sparkling_heart",
    published: "2026-11-24",
    updated: "2026-11-24",
    minutes: 7,
    sections: [
      {
        id: "next-visit",
        title: "1. Always know when you'll see each other next",
        blocks: [
          {
            kind: "p",
            text: "Uncertainty is harder than distance. Even a rough date months away gives the waiting a shape. Put it on a shared calendar and keep a countdown somewhere you both see it.",
          },
        ],
      },
      {
        id: "contact",
        title: "2. Small, regular contact beats long obligatory calls",
        blocks: [
          {
            kind: "p",
            text: "Three-hour calls every night can turn into a chore. Agree a rhythm that suits both your lives: maybe a quick morning message, a voice note at lunch and a proper call a few times a week.",
          },
          {
            kind: "tip",
            text: "A one-tap signal that says you're thinking of them costs nothing and lands every time.",
          },
        ],
      },
      {
        id: "time-zones",
        title: "3. Make time zones work for you",
        blocks: [
          {
            kind: "list",
            items: [
              {
                text: "Keep both local times visible so you never have to do the maths before calling.",
              },
              {
                text: "Find your overlap windows and protect them, even if it's only 30 minutes.",
              },
              {
                text: "Use things that don't need you online together: voice notes, scheduled messages, letters that open later and turn-by-turn games.",
              },
              { text: "Take turns being the one who stays up late or wakes up early." },
            ],
          },
        ],
      },
      {
        id: "share",
        title: "4. Share experiences, not just updates",
        blocks: [
          {
            kind: "p",
            text: "Telling each other about your day is important, but couples feel closer after doing something together: watching the same film, playing a game, cooking the same recipe or solving a puzzle. Aim for at least one shared activity a week.",
          },
        ],
      },
      {
        id: "trust",
        title: "5. Build trust by being predictable",
        blocks: [
          {
            kind: "p",
            text: "Say when you'll be out of contact and roughly when you'll be back. Follow through on small promises. Trust grows from lots of small kept words, not one big reassurance.",
          },
        ],
      },
      {
        id: "hard-parts",
        title: "6. Talk about the hard parts early",
        blocks: [
          {
            kind: "list",
            items: [
              { text: "When and how will the distance end? Who might move, and when?" },
              { text: "What do you each need when you're having a bad day?" },
              { text: "How do you each feel about money spent on travel?" },
              { text: "What does being exclusive mean to both of you?" },
            ],
          },
        ],
      },
      {
        id: "visits",
        title: "7. Make visits about normal life too",
        blocks: [
          {
            kind: "p",
            text: "It's tempting to fill every visit with plans. Leave room for ordinary things like grocery shopping and lazy mornings: they show you what living in the same place would be like.",
          },
        ],
      },
      {
        id: "keep-it-fun",
        title: "8. Keep it fun",
        blocks: [
          {
            kind: "p",
            text: "Play. Two-player games, silly photo challenges and in-jokes do a lot of the work of keeping a relationship light. If every call is a logistics meeting, change something.",
          },
        ],
      },
      {
        id: "safety",
        title: "9. Look after yourself",
        blocks: [
          {
            kind: "p",
            text: "Keep your own friends, routines and plans. A relationship that is the only good thing in your week puts a lot of weight on two people. And if a relationship stops feeling safe, it's fine to leave. Clink's help and safety page lists where to get support.",
          },
        ],
      },
    ],
    faq: [
      {
        q: "Do long distance relationships work?",
        a: "Many do, especially when both people know roughly when the distance will end, keep regular contact and share activities rather than only updates.",
      },
      {
        q: "How often should you talk in a long distance relationship?",
        a: "As often as suits both of you without feeling like a duty. Many couples keep small daily contact and a longer call a few times a week.",
      },
      {
        q: "How do you deal with time zones in a long distance relationship?",
        a: "Keep both local times visible, protect your overlap windows, take turns staying up late, and use things that don't need you online together such as voice notes, letters that open later and turn-by-turn games.",
      },
    ],
  },
  {
    slug: "questions-to-ask-your-partner",
    title: "60 questions to ask your partner, from easy to deep",
    description:
      "Questions to ask your boyfriend or girlfriend: fun questions, deep questions, questions about the future and questions for long distance couples.",
    answer:
      "Good questions to ask your partner start easy and get deeper: what made them laugh this week, what they'd do with a free day, what they're proud of, and what they want your life to look like in five years. Here are 60, in four groups, plus a way to turn them into a game.",
    art: "question",
    published: "2026-11-24",
    updated: "2026-11-24",
    minutes: 6,
    sections: [
      {
        id: "fun",
        title: "Fun questions",
        blocks: [
          {
            kind: "list",
            ordered: true,
            items: [
              { text: "What's the best thing you ate this week?" },
              { text: "If you could only eat one dish for a year, what would it be?" },
              { text: "Which song do you know every word to?" },
              { text: "What would your perfect lazy Sunday look like?" },
              { text: "What's a skill you'd learn instantly if you could?" },
              { text: "What's the most useless thing you're very good at?" },
              { text: "Which fictional world would you live in?" },
              { text: "What was your favourite game as a child?" },
              { text: "What's your most controversial food opinion?" },
              { text: "Where would you go tomorrow if money didn't matter?" },
              { text: "What's the funniest thing that's happened to you this year?" },
              { text: "What's a smell that takes you straight back to childhood?" },
              { text: "Which celebrity would play you in a film?" },
              { text: "What's your go-to karaoke song?" },
              { text: "What are you irrationally afraid of?" },
            ],
          },
        ],
      },
      {
        id: "deep",
        title: "Deep questions",
        blocks: [
          {
            kind: "list",
            ordered: true,
            items: [
              { text: "What are you proudest of that you rarely mention?" },
              { text: "When do you feel most like yourself?" },
              { text: "What did your family teach you about love?" },
              { text: "What's something you've changed your mind about?" },
              { text: "What do you need when you're having a bad day?" },
              { text: "What's a fear you've never said out loud?" },
              { text: "Who shaped you most growing up?" },
              { text: "What does a good apology look like to you?" },
              { text: "When did you last cry, and why?" },
              { text: "What's something you wish people asked you about?" },
              { text: "What part of your life would you like to slow down?" },
              { text: "What's a memory you return to when things are hard?" },
              { text: "How do you know when you're loved?" },
              { text: "What's something about me you'd like to understand better?" },
              { text: "What are you still learning to forgive yourself for?" },
            ],
          },
        ],
      },
      {
        id: "future",
        title: "Questions about the future",
        blocks: [
          {
            kind: "list",
            ordered: true,
            items: [
              { text: "What does a normal weekday look like once we live together?" },
              { text: "City, town or countryside?" },
              { text: "What's one thing you want us to do before the year ends?" },
              { text: "How do you picture us in ten years?" },
              {
                text: "What traditions do you want to keep from your family, and which would you drop?",
              },
              { text: "What's a big goal you haven't told many people about?" },
              { text: "How do you feel about pets?" },
              { text: "What would you want our home to feel like?" },
              { text: "Where should our next trip be?" },
              { text: "What does financial security mean to you?" },
              { text: "What would you do if you could take a year off?" },
              { text: "What's a dream you've given up on that you'd still like to try?" },
              { text: "How should we celebrate our next anniversary?" },
              { text: "What's something we should learn together?" },
              { text: "What would make you feel we'd built a good life?" },
            ],
          },
        ],
      },
      {
        id: "long-distance",
        title: "Questions for long distance couples",
        blocks: [
          {
            kind: "list",
            ordered: true,
            items: [
              { text: "What's the hardest part of the distance for you this month?" },
              { text: "What's a small thing I do that makes the distance easier?" },
              { text: "What do you want to do first when we see each other?" },
              { text: "What does your street look like right now?" },
              { text: "When do you miss me most during the day?" },
              { text: "What should we do on our next call that we've never done?" },
              { text: "How do you want to handle it when one of us feels lonely?" },
              { text: "What's a place near you that you want to show me?" },
              { text: "How do you feel about how often we talk?" },
              { text: "What's our plan for closing the distance?" },
              { text: "What's a habit of mine you've picked up?" },
              { text: "Which of our calls do you remember best?" },
              { text: "What do you want me to know about your week that you haven't said?" },
              { text: "What's one thing we could start doing daily?" },
              { text: "What will you miss about this time, once it's over?" },
            ],
          },
        ],
      },
      {
        id: "game",
        title: "Turn it into a game",
        blocks: [
          {
            kind: "p",
            text: "Questions work even better when one of you answers and the other guesses first. That's the idea behind How well do you know me on Clink: ten questions about one partner, answers hidden until you've both locked in, and a score at the end. Would you rather on Clink also has Deep and Future decks for the bigger conversations.",
          },
        ],
      },
    ],
    faq: [
      {
        q: "What are good deep questions to ask your partner?",
        a: "Ask about what they're proud of, what they need on a bad day, what their family taught them about love, and how they know when they're loved. Leave room for silence and follow-up questions.",
      },
      {
        q: "What questions should long distance couples ask each other?",
        a: "Ask about the hardest part of the distance right now, what makes it easier, what you'll do first when you meet, and what your plan is for closing the distance.",
      },
    ],
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);
