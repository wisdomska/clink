// Tells Bing, Yandex, Seznam and Naver (via IndexNow) that the public pages
// changed, right after a deploy. Reads the live sitemap so the list is never stale.
// Usage: node scripts/indexnow.mjs [https://site]
const site = (process.argv[2] ?? process.env.SITE ?? "https://clinkapp.vercel.app").replace(
  /\/$/,
  "",
);
const key = "4e598bc64cb12147b3bc4a9367980bb2";
const xml = await (await fetch(`${site}/sitemap.xml`)).text();
const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (!urlList.length) throw new Error("sitemap has no URLs");
const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host: new URL(site).host,
    key,
    keyLocation: `${site}/${key}.txt`,
    urlList,
  }),
});
console.log(`IndexNow: ${res.status} for ${urlList.length} URLs`);
// 200 and 202 are accepted; anything else is worth a look but never fails a deploy.
if (![200, 202].includes(res.status)) console.log(await res.text());
