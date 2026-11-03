import { DEFAULT_SETTINGS, llmHeaders, loadSettings, saveSettings } from "./byok";

describe("byok settings", () => {
  beforeEach(() => localStorage.clear());

  it("sends provider, model and key as headers, skipping empty ones", () => {
    expect(llmHeaders({ ...DEFAULT_SETTINGS, provider: "groq", model: " m ", apiKey: " k " })).toEqual({
      "X-LLM-Provider": "groq", "X-LLM-Model": "m", "X-LLM-Api-Key": "k"
    });
    expect(llmHeaders({ ...DEFAULT_SETTINGS, model: "", apiKey: "" })).toEqual({ "X-LLM-Provider": DEFAULT_SETTINGS.provider });
  });
  it("persists and reloads settings, falling back to defaults on corrupt data", () => {
    saveSettings({ ...DEFAULT_SETTINGS, provider: "google", apiKey: "abc" });
    expect(loadSettings().provider).toBe("google");
    localStorage.setItem("mooose_byok_v1", "{not json");
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
});
