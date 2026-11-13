import type { Metadata } from "next";
import { cookies } from "next/headers";
import { IDENTITY_COOKIE, asIdentity } from "@/lib/app-identity";
import { InstallGuide } from "./install-guide";

export const metadata: Metadata = { title: "Add to home screen" };

export default async function InstallPage() {
  const identity = asIdentity((await cookies()).get(IDENTITY_COOKIE)?.value);
  return <InstallGuide identity={identity} />;
}
