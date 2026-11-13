"use client";
import { squareAvatar } from "./compress";

export async function uploadAvatar(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Pick a photo.");
  const blob = await squareAvatar(file);
  const res = await fetch("/api/me/avatar", {
    method: "POST",
    headers: { "Content-Type": "image/webp" },
    body: blob,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "That photo didn't upload.");
  return data.url as string;
}
