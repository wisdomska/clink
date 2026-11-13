export const FAQS: Array<{ q: string; a: string }> = [
  {
    q: "Can my partner see my date of birth?",
    a: "No. We keep it to check you're 18+ and never show it to anyone, including your partner.",
  },
  {
    q: "What happens to the vault if we unlink?",
    a: "Everything in the vault and every View once item is deleted for both of you within 1 hour. A job checks the files are really gone. Chat stays read-only for 30 days, then it's deleted too.",
  },
  {
    q: "Does Clink block screenshots?",
    a: "No, and no app can. We blur sensitive media until you tap, watermark it with the viewer's name, hide it if you switch apps, and delete it on schedule. They can still screenshot. Only send what feels right.",
  },
  {
    q: "How do I make Clink look like another app?",
    a: "Settings, App icon and name. Pick Notes or Weather, then add Clink to your home screen again. Notifications switch to neutral text too.",
  },
  {
    q: "Who can open After Dark?",
    a: "Only the two of you, and only once you've both said yes. Each tier needs both of you, the lower choice always wins, and either of you can lower it any time.",
  },
  {
    q: "What is a View once photo?",
    a: "It opens once, full screen, and is deleted within 60 seconds of closing. The sender can also unsend anything, any time.",
  },
  {
    q: "Can I delete everything?",
    a: "Yes. Settings, Delete my account. Private media goes within 1 hour and everything else within 30 days. You can download your own data first.",
  },
  {
    q: "My partner is in another time zone. Does Clink cope?",
    a: "Yes. Clocks, quiet hours and date reminders all follow each person's own home city.",
  },
];

export const REPORT_CATEGORIES = [
  { value: "image_misuse", label: "Image misuse" },
  { value: "harassment", label: "Harassment" },
  { value: "minor_safety", label: "Someone may be under 18" },
  { value: "broken", label: "Something broke" },
  { value: "other", label: "Something else" },
] as const;
