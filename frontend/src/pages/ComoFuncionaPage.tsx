import { Helmet } from "react-helmet-async";
import PageShell from "../components/PageShell";
import Section from "../components/ui/Section";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";

const faqItems = [
  {
    q: "📸 A Mooose lê qualquer foto de redação?",
    a: "A Mooose utiliza OCR (reconhecimento de caracteres) para transformar imagem em texto. Isso funciona melhor com fotos bem iluminadas, enquadradas e com letra legível. Fotos muito tortas, em baixa qualidade ou com sombras fortes podem prejudicar a leitura."
  },
  {
    q: "🤖 Que tipo de IA a Mooose usa?",
    a: "A plataforma se baseia em modelos de linguagem de última geração, configurados para seguir a lógica das competências do ENEM. A Mooose não é uma “IA genérica solta”: os prompts e fluxos foram desenhados especificamente para correção de redações."
  },
  {
    q: "🔒 O que acontece com as redações que eu envio?",
    a: "As redações são armazenadas para que você possa consultar seu histórico e acompanhar a evolução. Elas são usadas internamente para melhorar a experiência da plataforma, sempre respeitando a Política de Privacidade. A Mooose não publica suas redações em lugar nenhum nem as associa publicamente ao seu nome."
  },
  {
    q: "🎯 Por que a mesma redação pode ter notas um pouco diferentes?",
    a: "Modelos de IA trabalham com probabilidades, então pequenas variações de nota podem acontecer mesmo para o mesmo texto. Por isso, olhe sempre mais para o conjunto do feedback (comentários, pontos fortes e fracos) do que para diferenças pequenas na nota final."
  }
];

export default function ComoFuncionaPage() {
  return (
    <PageShell>
      <Helmet>
        <title>Como a Mooose funciona · Correção de redação com IA</title>
        <meta name="description" content="Entenda passo a passo como a Mooose corrige redações do ENEM com IA: envio da redação, OCR de foto/PDF, análise pelos critérios do ENEM e feedback detalhado." />
      </Helmet>

      <Section className="pt-10" title="Como a Mooose funciona na prática" subtitle="A Mooose foi pensada para ser o mais simples possível para quem está estudando para o ENEM: você envia a redação, a IA faz a leitura do texto (mesmo em foto ou PDF) e devolve uma nota aproximada nas 5 competências, com comentários didáticos." />

      <Section>
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-text">Visão geral do fluxo</h2>
          <p className="mt-3 text-sm text-text-muted">De um jeito simples, o processo da Mooose é:</p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-semibold text-text">
            <Badge className="bg-brand/10 text-brand">Foto / PDF / texto digitado</Badge>
            <span>→</span>
            <Badge className="bg-accent/20 text-accent-dark">Leitura do texto (OCR)</Badge>
            <span>→</span>
            <Badge className="bg-emerald-100 text-emerald-700">Análise por IA</Badge>
            <span>→</span>
            <Badge className="bg-slate-100 text-slate-700">Notas por competência</Badge>
            <span>→</span>
            <Badge className="bg-green-100 text-green-700">Feedback e sugestões de melhoria</Badge>
          </div>
          <p className="mt-4 text-sm text-text-muted">
            Cada correção consome 1 correção disponível. Para começar, crie sua conta e compre um pacote via Mercado Pago.
          </p>
        </Card>
      </Section>

      <Section>
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-text">Passo a passo da correção</h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-text-muted">
              <li><strong>Você cria a conta e escolhe um pacote</strong><br />Depois da confirmação do pagamento, escolha se quer enviar uma foto da redação escrita à mão, um PDF ou colar o texto digitado.</li>
              <li><strong>Leitura do texto (OCR, quando necessário)</strong><br />Se for foto ou PDF com imagem, a plataforma usa um sistema de reconhecimento de caracteres (OCR) para transformar a imagem em texto. Quanto mais nítida a foto, melhor a leitura.</li>
              <li><strong>Análise por IA seguindo as competências do ENEM</strong><br />Com o texto em mãos, a Mooose envia o conteúdo para modelos de Inteligência Artificial que foram configurados para olhar para os mesmos pontos avaliados no ENEM: domínio da escrita formal, desenvolvimento do tema, organização do texto, coesão e proposta de intervenção.</li>
              <li><strong>Cálculo das notas aproximadas</strong><br />A redação recebe uma nota aproximada de 0 a 200 em cada competência (1 a 5). A soma dessas notas gera a pontuação final aproximada (0 a 1000).</li>
              <li><strong>Geração do feedback didático</strong><br />A IA produz uma devolutiva em linguagem simples, explicando por que a nota ficou naquele valor e sugerindo ajustes práticos em cada parte do texto: introdução, desenvolvimento, conclusão, repertório, coesão etc.</li>
              <li><strong>Histórico para acompanhar a evolução</strong><br />Todas as redações que você enviar ficam salvas no seu histórico, para que você acompanhe sua evolução ao longo do tempo e compare notas e comentários.</li>
            </ol>
          </Card>

          <div className="space-y-4">
            {[
              { title: "1. Tela de envio da redação", src: "/prints/print-envio-redacao.png" },
              { title: "2. Resultado com notas por competência", src: "/prints/print-correcao.png" },
              { title: "3. Histórico de redações corrigidas", src: "/prints/print-historico.png" }
            ].map((item) => (
              <Card key={item.title} className="p-4">
                <p className="text-xs font-semibold text-text-muted">{item.title}</p>
                <img src={item.src} alt={item.title} className="mt-2 w-full rounded-xl border border-border" />
              </Card>
            ))}
            <p className="text-xs text-text-muted">*As imagens acima são prints reais do funcionamento da plataforma.</p>
          </div>
        </div>
      </Section>

      <Section>
        <Card className="p-6 bg-slate-900 text-slate-200">
          <h2 className="text-lg font-semibold">Limitações e avisos importantes</h2>
          <p className="mt-3 text-sm text-slate-300">A Mooose é uma ferramenta de apoio ao estudo, não uma substituta oficial da correção humana do ENEM.</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-300">
            <li>As notas são <strong>aproximadas</strong> e podem variar em relação à correção oficial ou de professores.</li>
            <li>A IA pode interpretar de forma diferente alguns trechos, especialmente em casos de letra pouco legível ou fotos muito escuras/desfocadas.</li>
            <li>A plataforma não garante aprovação, mas ajuda você a enxergar com mais clareza pontos fortes e fracos da sua escrita.</li>
            <li>Sempre que possível, use o feedback da Mooose como complemento à orientação de professores, escolas ou cursinhos.</li>
          </ul>
        </Card>
      </Section>

      <Section title="FAQ técnico: como a tecnologia funciona?">
        <div className="grid gap-4">
          {faqItems.map((item) => (
            <Card key={item.q} className="p-5">
              <p className="text-sm font-semibold text-brand">{item.q}</p>
              <p className="mt-2 text-sm text-text-muted">{item.a}</p>
            </Card>
          ))}
        </div>
      </Section>
    </PageShell>
  );
}
