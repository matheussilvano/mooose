import { countWords, estimateLines, friendlyError, lineStatus, resultToMarkdown } from "./essay";

describe("essay helpers", () => {
  it("counts words ignoring extra whitespace", () => {
    expect(countWords("  um  dois\ntrês ")).toBe(3);
    expect(countWords("")).toBe(0);
  });
  it("flags sheet size like the ENEM rules", () => {
    expect(lineStatus("")).toBe("empty");
    expect(lineStatus("palavra ".repeat(40))).toBe("short"); // ~4 lines
    expect(lineStatus("palavra ".repeat(200))).toBe("ok"); // ~19 lines
    expect(lineStatus("palavra ".repeat(400))).toBe("long"); // ~37 lines
    expect(estimateLines("palavra ".repeat(22))).toBe(2);
  });
  it("turns provider errors into actionable messages", () => {
    expect(friendlyError("Falha (OpenAIRateLimitError)")).toMatch(/limite/i);
    expect(friendlyError("Falha (OpenAIModelNotFoundError)")).toMatch(/modelo/i);
    expect(friendlyError("Falha (AuthenticationError)")).toMatch(/chave/i);
    expect(friendlyError("Falha (StructuredOutputError)")).toMatch(/formato/i);
    expect(friendlyError("outra coisa")).toBe("outra coisa");
  });
  it("exports a correction as markdown", () => {
    const md = resultToMarkdown({ nota_final: 720, analise_geral: "ok", competencias: [{ id: 1, nota: 160, feedback: "bom" }], proximos_passos: ["a"] });
    expect(md).toContain("# Nota final: 720/1000");
    expect(md).toContain("## Competência 1: 160/200");
    expect(md).toContain("- a");
  });
});
