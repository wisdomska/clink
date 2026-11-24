import { siteUrl } from "@/lib/site";
import { FAQS } from "./faq";

/**
 * Structured data for search engines and AI assistants (schema.org JSON-LD):
 * who makes Clink, the site, the app itself, and the FAQ exactly as it reads
 * on the page. Facts only; keep it in step with the copy.
 */
export function StructuredData() {
  const url = siteUrl();
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${url}/#org`,
        name: "Clink",
        url,
        logo: `${url}/icons/clink-512.png`,
        slogan: "Made for two",
        description:
          "Clink makes a free, private web app for couples, especially long distance couples: calls, chat, two-player games, letters and date planning for two people. 18+.",
      },
      {
        "@type": "WebSite",
        "@id": `${url}/#site`,
        name: "Clink",
        url,
        inLanguage: "en-GB",
        publisher: { "@id": `${url}/#org` },
      },
      {
        "@type": "WebApplication",
        "@id": `${url}/#app`,
        name: "Clink",
        url,
        description:
          "A private app for couples, especially long distance: calls, chat, games, letters and date plans for two people. One account links to exactly one person. 18+.",
        applicationCategory: "LifestyleApplication",
        operatingSystem: "Any (web browser; installs to the home screen)",
        browserRequirements: "A modern browser such as Safari, Chrome, Edge or Firefox",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        audience: { "@type": "PeopleAudience", suggestedMinAge: 18 },
        featureList: [
          "One-tap clinks your partner feels straight away",
          "Voice and video calls",
          "Chat with voice notes, photos, stickers and scheduled messages",
          "Thirteen games for two, live or turn by turn, including Oware, Draughts and Four Up",
          "A daily word ladder puzzle you both play",
          "Letters and time capsules that open on a chosen date",
          "Date plans, countdowns and a shared calendar",
          "Watch and listen together",
          "A shared memory wall with On this day memories",
          "After Dark: an optional private space both partners must opt into",
        ],
        publisher: { "@id": `${url}/#org` },
      },
      {
        "@type": "FAQPage",
        "@id": `${url}/#faq`,
        mainEntity: FAQS.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };
  return (
    <script
      type="application/ld+json"
      // JSON only, with "<" escaped so nothing in it can close the tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, "\\u003c") }}
    />
  );
}
