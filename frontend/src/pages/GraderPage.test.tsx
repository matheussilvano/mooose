import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import GraderPage from "./GraderPage";

const providers = [
  { id: "openrouter", label: "OpenRouter (grátis)", default_model: "openrouter/free", needs_key: true, free_tier: true, vision: false, key_url: "https://openrouter.ai/keys", notes: "", server_key_configured: false },
  { id: "ollama", label: "Ollama (local)", default_model: "qwen", needs_key: false, free_tier: true, vision: true, key_url: "", notes: "", server_key_configured: false }
];

function mockFetch() {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    const json = (d: unknown) => ({ ok: true, json: async () => d });
    if (url.endsWith("/v1/providers")) return json(providers);
    if (url.includes("free-models")) return json([]);
    if (url.includes("ocr/engines")) return json({ paddle: false, vision: true });
    return json({});
  }));
}

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <GraderPage />
      </MemoryRouter>
    </HelmetProvider>
  );
}

describe("GraderPage", () => {
  beforeEach(() => { localStorage.clear(); mockFetch(); });
  afterEach(() => vi.unstubAllGlobals());

  it("explains what is missing and blocks submit until key, theme and text are set", async () => {
    renderPage();
    const submit = screen.getAllByRole("button", { name: /corrigir redação/i }).find((b) => b.classList.contains("mz-btn--primary"))!;
    expect(submit).toBeDisabled();
    expect(await screen.findByText("Falta a chave de IA")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Chave de API"), "sk-test");
    await user.type(screen.getByLabelText("Tema da proposta"), "Desafios para valorizar comunidades");
    expect(submit).toBeDisabled(); // still no text
    await user.click(screen.getByLabelText("Texto"));
    await user.paste("palavra ".repeat(60));
    expect(submit).toBeEnabled();
    expect(screen.getByText(/palavras, cerca de/)).toBeInTheDocument();
  });

  it("lets a keyless local provider (Ollama) start without a key", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByLabelText(/Ollama/));
    expect(screen.queryByLabelText("Chave de API")).not.toBeInTheDocument();
    expect(screen.getByText(/IA pronta/)).toBeInTheDocument();
  });

  it("keeps the draft in the browser", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Tema da proposta"), "Tema salvo");
    expect(JSON.parse(localStorage.getItem("mooose_draft_v2")!).tema).toBe("Tema salvo");
  });
});
