import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "@/features/admin/ui";

describe("CSV export", () => {
  it("neutralises spreadsheet formulas", () => {
    for (const v of ["=SUM(A1)", "+1", "-2", "@cmd", "\t=x"])
      expect(csvCell(v).replace(/^"/, "")[0]).toBe("'");
  });
  it("quotes commas, quotes and new lines", () => {
    expect(csvCell('a,"b"\nc')).toBe('"a,""b""\nc"');
    expect(csvCell(null)).toBe("");
    expect(csvCell(42)).toBe("42");
  });
  it("builds rows with a header and CRLF", () => {
    expect(
      toCsv([
        { a: 1, b: "x" },
        { a: 2, b: "=y" },
      ]),
    ).toBe("a,b\r\n1,x\r\n2,'=y");
    expect(toCsv([])).toBe("");
  });
});
