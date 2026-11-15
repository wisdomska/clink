/**
 * The Clink mark: two champagne flutes leaning in to clink. Their bowls are
 * the two halves of a heart; a spark flies where they touch. Drawn on a
 * 64 x 80 grid. Shared by the React logo and the icon generator.
 */
export const MARK = {
  viewBox: "0 0 64 80",
  // Left flute: half-heart bowl, stem and foot. Pivots at its foot (24, 74).
  left: "M31 16.5C28.3 12.2 24.6 9.5 19.6 9.5C12.6 9.5 7 15.1 7 22.4C7 32.8 15.3 42.2 31 53.2L31 66H24.5C23.7 66 23 66.7 23 67.5C23 68.3 23.7 69 24.5 69H35.5C36.3 69 37 68.3 37 67.5C37 66.7 36.3 66 35.5 66H33.4L33.4 53.6L31 53.2Z",
  // Right flute, mirrored.
  right:
    "M33 16.5C35.7 12.2 39.4 9.5 44.4 9.5C51.4 9.5 57 15.1 57 22.4C57 32.8 48.7 42.2 33 53.2L33 66H39.5C40.3 66 41 66.7 41 67.5C41 68.3 40.3 69 39.5 69H28.5C27.7 69 27 68.3 27 67.5C27 66.7 27.7 66 28.5 66H30.6L30.6 53.6L33 53.2Z",
  // Fizz line inside each bowl (the drink).
  leftFizz: "M11 23.5C11 20 14 15 19.5 13.5",
  rightFizz: "M53 23.5C53 20 50 15 44.5 13.5",
  // Four-point spark above the touch point.
  spark: "M32 0L34.2 4.8L39 7L34.2 9.2L32 14L29.8 9.2L25 7L29.8 4.8Z",
} as const;

export const BRAND = {
  rouge: "#FF4F7B",
  ember: "#FF5A3C",
  lilac: "#B9A4FF",
  champagne: "#FFD08A",
  blush: "#FFB3C4",
  night: "#120C10",
  plum: "#1B1318",
} as const;
