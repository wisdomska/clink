# Clink SEO and GEO: what's done, and what only you can do

Updated 24 November 2026.

## What's already live

- **Crawlers:** `robots.txt` names Google, Bing, Apple, DuckDuckGo, Yandex and the main AI answer engines. All of them can read the public pages; the app itself stays private.
- **Pages people search for (27 in the sitemap):**
  - `/games` and a page for each of the 14 games, with rules, tips and FAQs
  - `/guides` with four guides: long distance date ideas, video call games, relationship tips, and questions to ask your partner
  - `/long-distance`, `/faq` and `/about`
- **Structured data:** every page has schema.org data (Article, FAQPage, BreadcrumbList, ItemList, Organization, WebApplication, AboutPage) and its own share image.
- **For AI assistants:** `/llms.txt` (a short summary) and `/llms-full.txt` (the full text of every page), both built from the same data as the site.
- **IndexNow:** Bing, Yandex, Seznam and Naver get pinged with every public URL after each deploy.
- **Ready for verification:** Google, Bing and Yandex codes are read from Vercel settings, so verifying needs no code change.
- **Lighthouse scores:**
  - Every public page scores 100 for SEO, accessibility and best practices.
  - Performance on desktop: 99 to 100.
  - Performance on a throttled phone: 58 on the home page, 75 to 92 on the others. A separate task to fix this is waiting for you to start in the app.

## What only you can do, step by step

Do them in this order. Steps 1 to 3 matter most.

### 1. Get a custom domain (biggest single win)

A `vercel.app` address ranks worse and looks less trustworthy than your own domain. Every link you earn from now on builds up on whichever domain you use, so switch early.

1. Buy a domain at a registrar such as Namecheap, Cloudflare or Porkbun. Short and clear is best, for example `getclink.app` or `clinkapp.com`. Check availability on the registrar's site.
2. Open vercel.com, go to the **clinkapp** project, then **Settings** and **Domains**.
3. Click **Add**, type your domain, and add both the bare domain and `www`. Choose to redirect `www` to the bare domain.
4. Vercel shows DNS records (an A record and a CNAME). Add them in your registrar's DNS settings.
5. Wait until Vercel shows **Valid Configuration** (minutes to a few hours).
6. Tell me the domain. I'll then:
   - point the site, sitemap, share images and structured data at it
   - redirect the old `vercel.app` address to it permanently
   - update the Supabase sign-in redirect addresses
   - re-ping the search engines

### 2. Google Search Console

1. Go to search.google.com/search-console and sign in with your Google account.
2. Click **Add property**.
   - With a custom domain: choose **Domain** and follow the DNS step, then skip to step 6.
   - Without one: choose **URL prefix**, enter `https://clinkapp.vercel.app/` and continue.
3. Under **Other verification methods**, open **HTML tag**. Copy only the code inside `content="..."` (a long string of letters and numbers).
4. Send me that code, or add it yourself:
   - In Vercel, open the project, then **Settings**, then **Environment Variables**.
   - Add the name `GOOGLE_SITE_VERIFICATION`, paste the code as the value, and tick **Production**.
   - Save, then redeploy (**Deployments**, then **⋯**, then **Redeploy**).
5. Back in Search Console, click **Verify**.
6. Open **Sitemaps** in the left menu, enter `sitemap.xml` and click **Submit**.
7. Open **URL inspection**. Paste each of these, then click **Request indexing**:
   - `/`
   - `/games`
   - `/games/oware`
   - `/long-distance`
   - `/guides/long-distance-date-ideas`
8. Check back in a week: **Pages** shows what got indexed, **Performance** shows the searches you appear for.

### 3. Bing Webmaster Tools

Bing's index also feeds ChatGPT search and Microsoft Copilot, so this one matters for AI answers too.

1. Go to bing.com/webmasters and sign in.
2. Pick the easier route:
   - After Google verification: choose **Import from Google Search Console**. It copies your site and sitemap in one step.
   - Otherwise: choose **Add your site manually** and enter the address. Pick **HTML Meta Tag** and copy the `content` value. Either send it to me, or add it in Vercel as `BING_SITE_VERIFICATION` (Production) and redeploy. Then click **Verify**.
3. Open **Sitemaps** and submit `https://clinkapp.vercel.app/sitemap.xml` (or your new domain).
4. IndexNow is already set up from my side, so new pages reach Bing within hours.

### 4. Social profiles (helps search engines and AI recognise Clink)

1. Create profiles with the same name, logo and one-line description everywhere: Instagram, TikTok and X (optional: YouTube, LinkedIn page, Threads). Try to get `clinkapp` as the handle.
2. Put the site address in each bio.
3. Send me the profile links. I'll add them to Clink's structured data (`sameAs`) so search engines and AI assistants connect them to the site.
4. Post short clips of the games (Oware against Clink, Draw and guess) and the long distance features. These are what people share.

### 5. Launch and directory listings (your first backlinks)

Each listing is a link back to Clink and a place AI assistants learn about it. Use the same description each time:

> Clink is a free, private app for couples, especially long distance: one-tap clinks, video calls, 13 two-player games including Oware and Draughts, letters that open later and date planning. 18+.

1. **Product Hunt** (producthunt.com): launch on a Tuesday to Thursday. Prepare 4 to 6 screenshots and a short demo video. Ask friends to look on the day, but don't ask for upvotes; that breaks their rules.
2. **AlternativeTo** (alternativeto.net): add Clink, then list it as an alternative to other couples apps. This page often ranks for "apps like ..." searches.
3. **BetaList**, **SaaSHub** and **Indie Hackers**: free listings, each with a link.
4. **Reddit** (r/LongDistance, r/LongDistanceRelationships): read each community's rules first. Join conversations genuinely, and only share the link where self-promotion is allowed.
5. **Ghanaian and diaspora communities and blogs:** the Oware page and the "Ama in Accra, Theo in New York" story are a natural angle.

### 6. Get Clink into app stores (optional, more discovery)

**Google Play.** Clink can be listed without rewriting anything:

1. Go to pwabuilder.com, enter the site address and click **Package for stores**, then **Android**.
2. Create a Google Play developer account at play.google.com/console. It costs a one-time 25 US dollars and needs ID verification.
3. Upload the package PWABuilder gives you.
4. Send me the **SHA-256 fingerprint** PWABuilder shows. I'll add the `assetlinks.json` file so the app opens full-screen with no browser bar.

**Microsoft Store:** in PWABuilder choose **Windows**, and register at partner.microsoft.com (free for individuals).

**Apple App Store:** needs a native wrapper and a 99 US dollar a year developer account. Skip it for now; iPhone users can add Clink to their home screen.

### 7. Reviews and mentions

1. Ask your first happy couples for a short review on Product Hunt or Trustpilot.
2. Pitch a short story to relationship, tech and Ghanaian lifestyle writers: "a couples app with Oware built in".
3. Every genuine mention with a link helps both Google rankings and how often AI assistants mention Clink.

### 8. Check how AI assistants describe Clink (once a month)

1. Ask ChatGPT (with search on), Perplexity, Google Gemini, Microsoft Copilot and Claude questions like:
   - "What's a good app for long distance couples?"
   - "Where can I play oware online with my partner?"
   - "Games to play with my girlfriend on FaceTime"
   - "What is Clink app for couples?"
2. Note whether Clink appears, and whether the facts are right.
3. Send me anything wrong or missing. I'll fix the page they're drawing on.
4. In Bing Webmaster Tools and Search Console, look for any AI or Copilot reports once your site has data, and check which pages people arrive on.

### 9. Keep feeding it

New, useful pages are what keep traffic growing. Send me topics you hear couples asking about. A new guide a month is a good pace.

## What to expect

- Google and Bing usually index new pages within days to a few weeks after the sitemap is submitted.
- Rankings for competitive searches ("long distance relationship app") take months and depend mostly on steps 1, 4, 5 and 7.
- Specific searches ("how to play oware online", "games to play on video call with girlfriend") can show results sooner.
