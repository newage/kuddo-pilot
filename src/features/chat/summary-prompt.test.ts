import { describe, expect, it } from "vitest";
import { SUMMARY_SYSTEM_PROMPT, buildSummaryInput } from "./summary-prompt";

describe("summary-prompt", () => {
  it("промпт один і не залежить від вчителя чи профілю", () => {
    expect(typeof SUMMARY_SYSTEM_PROMPT).toBe("string");
    // buildSummaryInput приймає лише записи чату: вчитель і профіль не можуть потрапити всередину
    expect(buildSummaryInput.length).toBe(1);
  });

  it("промпт не фіксує мову, а вимагає мови розмови", () => {
    expect(SUMMARY_SYSTEM_PROMPT).not.toContain("українською");
    expect(SUMMARY_SYSTEM_PROMPT).toContain("тією ж мовою");
  });

  it("підсумок позначається як попередній", () => {
    const text = buildSummaryInput([
      { role: "summary", content: "S" },
      { role: "user", content: "Привіт" },
      { role: "assistant", content: "Вітаю" },
    ]);
    expect(text).toBe("Попередній підсумок: S\nДитина: Привіт\nВчитель: Вітаю");
  });
});
