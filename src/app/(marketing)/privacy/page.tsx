import type { Metadata } from "next";
import { LegalPage } from "../legal-page";

export const metadata: Metadata = { title: "Privacy", robots: { index: true, follow: true } };

export default function Privacy() {
  return (
    <LegalPage
      title={
        <>
          Your <em>privacy</em>
        </>
      }
      updated="13 NOV 2026"
    >
      <p>We collect only what Clink needs to work, and we never sell it.</p>
      <h2 className="text-text m-0 text-lg font-bold">What we keep</h2>
      <p>
        Your email, name, home city and time zone, your date of birth (never shown to your partner),
        what you create together, and the media you send. Photos are stripped of location and camera
        data on your phone and again on our servers.
      </p>
      <h2 className="text-text m-0 text-lg font-bold">Private media</h2>
      <p>
        After Dark media lives in a separate private store, opens only through the app, is never
        cached on your device, and is deleted on the schedule the sender chose. Unlinking or
        deleting your account wipes it for both of you within an hour, and we check that it&apos;s
        gone.
      </p>
      <h2 className="text-text m-0 text-lg font-bold">What we measure</h2>
      <p>
        Cookie-free product analytics that count actions, never content. No message text, media,
        dares or desire answers are ever sent to analytics. There&apos;s no session replay and no
        advertising tracking.
      </p>
      <h2 className="text-text m-0 text-lg font-bold">Who can see what</h2>
      <p>
        Our team can&apos;t read your messages, letters, capsules, answers or media. If you report a
        problem, we see only what you choose to attach.
      </p>
      <h2 className="text-text m-0 text-lg font-bold">Your rights</h2>
      <p>
        Download your own data or delete your account any time in Settings. We follow Ghana&apos;s
        Data Protection Act 2012 and the GDPR for people in the EU and UK.
      </p>
      <h2 className="text-text m-0 text-lg font-bold">Cookies</h2>
      <p>Only the ones needed to keep you signed in and to remember your app icon choice.</p>
    </LegalPage>
  );
}
