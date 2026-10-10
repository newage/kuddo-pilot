import { describe, expect, it } from "vitest";
import { buildContext } from "./build-context";

describe("buildContext", () => {
  const profile = { name: "Оля", age: 9, hobbies: "малювання", about: "люблю котів" };

  it("system = промпт вчителя + профіль", () => {
    const { system } = buildContext({ teacherPrompt: "Ти вчитель", profile, entries: [], locale: "uk" });
    expect(system).toContain("Ти вчитель");
    expect(system).toContain("Оля");
    expect(system).toContain("люблю котів");
  });

  it("підсумок іде першим, далі записи чату", () => {
    const { turns } = buildContext({
      teacherPrompt: "p",
      profile: null,
      locale: "uk",
      entries: [
        { role: "summary", content: "S" },
        { role: "assistant", content: "A" },
        { role: "user", content: "U" },
      ],
    });
    expect(turns.map((t) => t.role)).toEqual(["user", "model", "user"]);
    expect(turns[0].text).toContain("S");
  });

  it("сусідні репліки однієї ролі зливаються", () => {
    const { turns } = buildContext({
      teacherPrompt: "p",
      profile: null,
      locale: "uk",
      entries: [
        { role: "summary", content: "S" },
        { role: "user", content: "U" },
      ],
    });
    expect(turns).toHaveLength(1);
    expect(turns[0].text).toContain("S");
    expect(turns[0].text).toContain("U");
  });

  it("без профілю system дорівнює промпту", () => {
    expect(buildContext({ teacherPrompt: "p", profile: null, entries: [], locale: "uk" }).system).toBe(
      "p\n\nВідповідай українською мовою.",
    );
  });

  it("інструкція мови йде останньою, після промпту й профілю", () => {
    const { system } = buildContext({ teacherPrompt: "You are a math teacher", profile, entries: [], locale: "pl" });
    expect(system.startsWith("You are a math teacher")).toBe(true);
    expect(system.endsWith("Odpowiadaj w języku polskim.")).toBe(true);
    expect(system.indexOf("Оля")).toBeLessThan(system.indexOf("Odpowiadaj"));
  });
});
