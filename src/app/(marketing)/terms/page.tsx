import type { Metadata } from "next";
import { LegalPage } from "../legal-page";

export const metadata: Metadata = { title: "Terms", robots: { index: true, follow: true } };

export default function Terms() {
  return (
    <LegalPage
      title={
        <>
          Terms of <em>use</em>
        </>
      }
      updated="13 NOV 2026"
    >
      <p>
        Clink is a private space for two adults in a relationship. By using it you agree to these
        terms.
      </p>
      <h2 className="text-text m-0 text-lg font-bold">Adults only</h2>
      <p>
        You must be 18 or older. We check your date of birth at sign-up, and After Dark&apos;s
        Unhinged tier asks both of you to confirm you&apos;re 18+ again. Accounts that belong to
        anyone under 18 are removed immediately and reported where the law requires.
      </p>
      <h2 className="text-text m-0 text-lg font-bold">Images and consent</h2>
      <p>
        Only send images of yourself. Only send images of adults. Never share anything from Clink
        outside the app, and never send anything your partner hasn&apos;t agreed to receive.
        Breaking any of these rules gets your account removed.
      </p>
      <h2 className="text-text m-0 text-lg font-bold">One person</h2>
      <p>
        One account links to exactly one other person. Either of you can unlink at any time. Private
        media is then wiped for both of you within an hour.
      </p>
      <h2 className="text-text m-0 text-lg font-bold">What we can&apos;t promise</h2>
      <p>
        We blur, watermark and delete private media on schedule, but no app can stop someone taking
        a screenshot or filming their screen. Only send what feels right.
      </p>
      <h2 className="text-text m-0 text-lg font-bold">Fair use</h2>
      <p>
        Clink is free while it&apos;s in this early version. Don&apos;t abuse the service, attempt
        to break it, or use it for anything unlawful. We may suspend accounts that put other people
        at risk.
      </p>
      <p>Questions? Open Help and safety in the app.</p>
    </LegalPage>
  );
}
