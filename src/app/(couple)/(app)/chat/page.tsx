import { Suspense } from "react";
import type { Metadata } from "next";
import { ChatScreen } from "@/features/chat/chat-screen";

export const metadata: Metadata = { title: "Chat" };

export default function ChatPage() {
  return (
    <Suspense>
      <ChatScreen />
    </Suspense>
  );
}
