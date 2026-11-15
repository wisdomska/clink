import type { Metadata } from "next";
import { LegalPage } from "../legal-page";

export const metadata: Metadata = { title: "Safety", robots: { index: true, follow: true } };

export default function Safety() {
  return (
    <LegalPage title="Help and safety" updated="13 Nov 2026">
      <p>
        Clink is built on three rules: nothing private unlocks without both of you, the sender
        always controls their own media, and we never promise protection we can&apos;t give.
      </p>
      <h2 className="text-text m-0 text-lg font-bold">Image abuse</h2>
      <p>
        If someone shares or threatens to share an intimate image of you, report it in the app. We
        act fast, remove what we can, and cooperate with lawful requests. StopNCII.org can help stop
        images spreading on other platforms.
      </p>
      <h2 className="text-text m-0 text-lg font-bold">Zero tolerance for minors</h2>
      <p>
        Any report that a user may be under 18 suspends that account immediately while our team
        reviews it. We preserve evidence where the law requires and report to the relevant
        authorities.
      </p>
      <h2 className="text-text m-0 text-lg font-bold">Leaving safely</h2>
      <p>
        You can unlink or block at any time, including from inside After Dark. Your partner gets a
        short, neutral notice, and private media is wiped for both of you within an hour.
      </p>
      <h2 className="text-text m-0 text-lg font-bold">In danger right now?</h2>
      <p>Call your local emergency number. In the UK, call 999. In Ghana, call 112.</p>
    </LegalPage>
  );
}
