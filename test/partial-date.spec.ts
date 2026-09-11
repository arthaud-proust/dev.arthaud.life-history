import { describe, expect, it } from "vitest";
import {
  TODAY,
  formatPartialDate,
  nextPeriod,
  parseDateBoundary,
  parseMonthName,
  parsePartialDate,
  toEndDate,
  toStartDate,
} from "../app/utils/partial-date";

describe("parseMonthName", () => {
  it("lit les mois quelles que soient la casse et les accents", () => {
    expect(parseMonthName("Juin")).toBe(6);
    expect(parseMonthName("fevrier")).toBe(2);
    expect(parseMonthName("Février")).toBe(2);
    expect(parseMonthName("AOUT")).toBe(8);
  });

  it("accepte les abréviations sans ambiguïté", () => {
    expect(parseMonthName("janv.")).toBe(1);
    expect(parseMonthName("fév")).toBe(2);
    expect(parseMonthName("sept")).toBe(9);
    expect(parseMonthName("juil")).toBe(7);
  });

  it("refuse de deviner une abréviation ambiguë", () => {
    expect(parseMonthName("jui")).toBeNull();
    expect(parseMonthName("ma")).toBeNull();
    expect(parseMonthName("lundi")).toBeNull();
  });
});

describe("parsePartialDate", () => {
  it("lit les trois précisions", () => {
    expect(parsePartialDate("2024")).toEqual({ year: 2024 });
    expect(parsePartialDate("juin 2023")).toEqual({ year: 2023, month: 6 });
    expect(parsePartialDate("12 juin 2022")).toEqual({
      year: 2022,
      month: 6,
      day: 12,
    });
  });

  it("lit les écritures numériques", () => {
    expect(parsePartialDate("06/2023")).toEqual({ year: 2023, month: 6 });
    expect(parsePartialDate("12/06/2022")).toEqual({
      year: 2022,
      month: 6,
      day: 12,
    });
    expect(parsePartialDate("2023-06")).toEqual({ year: 2023, month: 6 });
    expect(parsePartialDate("2022-06-12")).toEqual({
      year: 2022,
      month: 6,
      day: 12,
    });
  });

  it("refuse ce qui est ambigu ou impossible plutôt que de le deviner", () => {
    expect(parsePartialDate("12/06/22")).toBeNull();
    expect(parsePartialDate("30 février 2020")).toBeNull();
    expect(parsePartialDate("13/2020")).toBeNull();
    expect(parsePartialDate("bientôt")).toBeNull();
    expect(parsePartialDate("")).toBeNull();
  });
});

describe("parseDateBoundary", () => {
  it("reconnaît une fin de période ouverte", () => {
    expect(parseDateBoundary("aujourd'hui")).toBe(TODAY);
    expect(parseDateBoundary("aujourd’hui")).toBe(TODAY);
    expect(parseDateBoundary("Aujourd’hui")).toBe(TODAY);
    expect(parseDateBoundary("en cours")).toBe(TODAY);
  });
});

describe("formatPartialDate", () => {
  it("écrit la forme canonique française", () => {
    expect(formatPartialDate({ year: 2024 })).toBe("2024");
    expect(formatPartialDate({ year: 2023, month: 6 })).toBe("juin 2023");
    expect(formatPartialDate({ year: 2022, month: 6, day: 12 })).toBe(
      "12 juin 2022",
    );
    expect(formatPartialDate(TODAY)).toBe("aujourd'hui");
  });

  it("conserve la précision écrite sans en inventer", () => {
    expect(formatPartialDate(parsePartialDate("06/2023")!)).toBe("juin 2023");
    expect(formatPartialDate(parsePartialDate("1998")!)).toBe("1998");
  });
});

describe("bornes", () => {
  it("positionne une date imprécise au début de sa période", () => {
    expect(toStartDate({ year: 1998 })).toEqual(new Date(1998, 0, 1));
    expect(toStartDate({ year: 1998, month: 6 })).toEqual(new Date(1998, 5, 1));
  });

  it("étend une date imprécise jusqu’à la fin de sa période", () => {
    expect(toEndDate({ year: 1998 })).toEqual(
      new Date(1998, 11, 31, 23, 59, 59, 999),
    );
    expect(toEndDate({ year: 2020, month: 2 })).toEqual(
      new Date(2020, 1, 29, 23, 59, 59, 999),
    );
  });
});

describe("nextPeriod", () => {
  it("avance d’un mois", () => {
    expect(nextPeriod({ year: 2023, month: 6 })).toEqual({
      year: 2023,
      month: 7,
    });
  });

  it("passe à l’année suivante en décembre", () => {
    expect(nextPeriod({ year: 2023, month: 12 })).toEqual({
      year: 2024,
      month: 1,
    });
  });

  it("avance d’un an quand seule l’année est connue", () => {
    expect(nextPeriod({ year: 1998 })).toEqual({ year: 1999 });
  });

  it("ne reconduit pas le jour", () => {
    expect(nextPeriod({ year: 2022, month: 6, day: 12 })).toEqual({
      year: 2022,
      month: 7,
    });
  });
});
