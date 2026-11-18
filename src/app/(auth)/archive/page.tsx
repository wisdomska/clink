import type { Metadata } from "next";
import Link from "@/components/ui/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Microphone, Image as ImageIcon } from "@phosphor-icons/react/dist/ssr";
import { supabaseServer } from "@/lib/supabase/server";
import { readOnlyArchive } from "@/lib/server/archive";
import { activeCouple } from "@/lib/server/api";
import { Display, Lead } from "@/components/ui/heading";

export const metadata: Metadata = { title: "Old chat", robots: { index: false } };
export const dynamic = "force-dynamic";

const PAGE = 300;

/** ACC-07: the chat from an unlinked couple, read-only until it is deleted. */
export default async function ArchivePage() {
  const db = await supabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/auth/reset?next=/archive");
  if (await activeCouple(user.id)) redirect("/chat");
  const archive = await readOnlyArchive(user.id);
  if (!archive) redirect("/link");

  // Read through RLS as the user: app.readable_couple_ids() is what allows this.
  const { data: rows } = await db
    .from("messages")
    .select("id, sender_id, type, body, media_ids, sticker_id, sent_at")
    .eq("couple_id", archive.coupleId)
    .is("removed_at", null)
    .neq("type", "sensitive")
    .order("sent_at", { ascending: false })
    .limit(PAGE);
  const messages = (rows ?? []).reverse();
  const until = new Date(archive.until).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
  });

  return (
    <div className="an-screen mx-auto flex min-h-dvh max-w-[720px] flex-col px-4 pt-[max(env(safe-area-inset-top),12px)] pb-10">
      <Link
        href="/link"
        aria-label="Back"
        className="press text-text hover:text-text flex h-11 w-11 items-center justify-center rounded-full"
      >
        <ArrowLeft size={22} aria-hidden />
      </Link>
      <Display size={36} className="mt-4">
        Your chat with {archive.partner}
      </Display>
      <Lead className="mt-2">
        Read only. It&apos;s deleted for both of you on {until}. Download your data in Settings if
        you want to keep anything.
      </Lead>

      <ol aria-label="Messages" className="m-0 mt-8 flex list-none flex-col gap-2 p-0">
        {messages.length === 0 && <li className="text-muted text-base">No messages to show.</li>}
        {messages.map((m) => {
          const mine = m.sender_id === user.id;
          const text =
            m.type === "text" || m.type === "system"
              ? m.body
              : m.type === "voice"
                ? null
                : m.type === "clink"
                  ? "Clink"
                  : m.type === "sticker"
                    ? "Sticker"
                    : (m.body ?? null);
          return (
            <li
              key={m.id}
              className={
                m.type === "system"
                  ? "text-faint self-center text-center text-sm"
                  : mine
                    ? "bg-s3 text-text max-w-[80%] self-end rounded-[20px_20px_6px_20px] px-4 py-2.5 text-base"
                    : "border-line bg-s1 text-text max-w-[80%] self-start rounded-[20px_20px_20px_6px] border px-4 py-2.5 text-base"
              }
            >
              {m.type === "voice" && (
                <span className="text-muted flex items-center gap-2">
                  <Microphone size={16} aria-hidden /> Voice note
                </span>
              )}
              {m.type === "media" && (
                <span className="text-muted flex items-center gap-2">
                  <ImageIcon size={16} aria-hidden />
                  {m.media_ids.length === 1
                    ? "Photo or video"
                    : `${m.media_ids.length} photos or videos`}
                </span>
              )}
              {text && <span className="block whitespace-pre-wrap">{text}</span>}
              <time dateTime={m.sent_at} className="mono text-faint mt-1 block text-[11px]">
                {new Date(m.sent_at).toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
