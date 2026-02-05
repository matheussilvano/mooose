import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-white px-4 py-10 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <Logo size="sm" />
          <p className="mt-2 text-sm text-text-muted">
            IA que corrige redações do ENEM e ajuda estudantes de todo o Brasil a ficarem
            mais perto da universidade pública.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-text-muted">
          <a href="/como-funciona" className="hover:text-brand">Como funciona</a>
          <a href="/sobre" className="hover:text-brand">Sobre</a>
          <a href="/privacidade" className="hover:text-brand">Privacidade</a>
          <a href="/termos" className="hover:text-brand">Termos</a>
        </div>
        <div className="text-sm text-text-muted">
          <p>Tem uma escola ou projeto social?</p>
          <a href="mailto:contato@mooose.com.br" className="font-semibold text-brand">
            contato@mooose.com.br
          </a>
        </div>
      </div>
      <div className="mx-auto mt-6 max-w-6xl text-xs text-text-muted">© 2025 Mooose. Todos os direitos reservados.</div>
    </footer>
  );
}
