import { describe, it, expect } from "vitest";
import { groupMessage } from "@/lib/push-group";

describe("grouped chat notifications", () => {
  it("shows the first as is, then counts with the newest line", () => {
    expect(groupMessage(undefined, { body: "Theo: hey", from: "Theo" })).toEqual({
      body: "Theo: hey",
      count: 1,
    });
    expect(groupMessage(2, { body: "Theo: see you at 8", from: "Theo" })).toEqual({
      body: "3 new messages from Theo\nsee you at 8",
      count: 3,
    });
    expect(groupMessage(1, { body: "Theo sent a photo", from: "Theo" }).body).toBe(
      "2 new messages from Theo\nTheo sent a photo",
    );
  });
  it("never names or quotes when previews are off", () => {
    expect(groupMessage(1, { body: "New moment in Clink" })).toEqual({
      body: "2 new messages",
      count: 2,
    });
  });
});
