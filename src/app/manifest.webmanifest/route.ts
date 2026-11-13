import { cookies } from "next/headers";
import { IDENTITIES, IDENTITY_COOKIE, asIdentity } from "@/lib/app-identity";

/** Web app manifest. Name and icon follow the discreet identity the user picked. */
export async function GET() {
  const id = asIdentity((await cookies()).get(IDENTITY_COOKIE)?.value);
  const meta = IDENTITIES[id];
  const manifest = {
    id: "/",
    name: meta.name,
    short_name: meta.short,
    description: id === "clink" ? "Things to do together, from apart." : "",
    start_url: "/us?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0F0E11",
    theme_color: "#0F0E11",
    categories: id === "clink" ? ["lifestyle", "social"] : ["utilities"],
    icons: [
      { src: `/icons/${id}-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `/icons/${id}-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `/icons/${id}-maskable-192.png`, sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: `/icons/${id}-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return new Response(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "private, max-age=0, must-revalidate" },
  });
}
