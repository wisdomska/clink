import { describe, expect, it } from "vitest";
import { matchGuess } from "@/features/play/engines/guess-match";

describe("guess matching", () => {
  it.each([
    ["pizza", "pizza"],
    ["PIZZA!", "pizza"],
    ["a pizza", "pizza"],
    ["it's a pizza", "pizza"],
    ["pizzas", "pizza"],
    ["piza", "pizza"],
    ["a big pizza", "pizza"],
    ["dancing", "dance"],
    ["crying", "cry"],
    ["icecream", "ice cream"],
    ["ice-cream", "ice cream"],
    ["rollercoster", "rollercoaster"],
    ["roller coaster", "rollercoaster"],
    ["butterflies", "butterfly"],
    ["puppy", "dog"],
    ["cellphone", "phone"],
    ["airplane", "plane"],
    ["bike", "bicycle"],
    ["donut", "doughnut"],
    ["bunny", "rabbit"],
    ["café", "cafe"],
  ])("%s counts for %s", (guess, answer) => {
    expect(matchGuess(guess, answer)).toBe(true);
  });

  it.each([
    ["bat", "bath"],
    ["cat", "car"],
    ["king", "ring"],
    ["horse", "unicorn"],
    ["", "pizza"],
    ["the", "pizza"],
    ["dog cat tree house pizza", "pizza"],
    ["cream", "ice cream"],
  ])("%s does not count for %s", (guess, answer) => {
    expect(matchGuess(guess, answer)).toBe(false);
  });
});
