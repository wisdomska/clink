import type { Metadata } from "next";
import { InstallGuide } from "./install-guide";

export const metadata: Metadata = { title: "Add to home screen" };

export default function InstallPage() {
  return <InstallGuide />;
}
