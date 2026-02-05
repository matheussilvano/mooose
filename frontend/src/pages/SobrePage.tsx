import { Helmet } from "react-helmet-async";
import PageShell from "../components/PageShell";
import Section from "../components/ui/Section";
import Card from "../components/ui/Card";

export default function SobrePage() {
  return (
    <PageShell>
      <Helmet>
        <title>Sobre a Mooose · História, missão e futuro do projeto</title>
        <meta name="description" content="Conheça a história, missão e futuro da Mooose, projeto criado para democratizar a correção de redações do ENEM com IA para estudantes de todo o Brasil." />
      </Helmet>

      <Section className="pt-10" title="Sobre a Mooose" subtitle="A Mooose é um projeto criado para aproximar estudantes da universidade pública, usando Inteligência Artificial para corrigir redações do ENEM de forma acessível, rápida e didática." />

      <Section>
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-text">De onde surgiu a ideia?</h2>
          <p className="mt-3 text-sm text-text-muted">
            Todo ano, milhões de estudantes encaram o ENEM com a mesma dúvida: <strong>“Será que minha redação está realmente boa?”</strong>. Correção humana é cara, demorada e, muitas vezes, inacessível para quem mais precisa – especialmente estudantes de escolas públicas, projetos sociais e quem estuda por conta própria.
          </p>
          <p className="mt-3 text-sm text-text-muted">
            A Mooose nasceu desse incômodo e de uma pergunta simples: <strong>“E se existisse um lugar em que qualquer pessoa pudesse treinar redação, quantas vezes quisesse, com devolutiva quase imediata, pagando um valor acessível por correção?”</strong>
          </p>
          <p className="mt-3 text-sm text-text-muted">
            A partir daí, o projeto foi sendo construído passo a passo: primeiro como um experimento pessoal com IA, depois como uma plataforma de verdade, com fluxo de cadastro, envio, histórico de redações e um cuidado especial com a experiência de quem está do outro lado da tela.
          </p>
        </Card>
      </Section>

      <Section>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6 bg-slate-900 text-slate-200">
            <h2 className="text-lg font-semibold">Quem criou a Mooose?</h2>
            <p className="mt-3 text-sm text-slate-300">
              A Mooose foi idealizada e desenvolvida por <strong>Matheus Silvano</strong>, estudante de Sistemas de Informação na UFSC e desenvolvedor de IA.
            </p>
            <p className="mt-3 text-sm text-slate-300">
              A combinação de duas coisas – vivência com tecnologia e interesse por educação – levou à criação de uma plataforma que usa Inteligência Artificial de forma prática e responsável, com foco em reduzir desigualdades no acesso à correção de redações.
            </p>
            <p className="mt-3 text-sm text-slate-300">
              Hoje, a maior parte do desenvolvimento (código, interface, prompts, experimentos de qualidade) é feita pelo próprio fundador, com apoio pontual de professores, colegas e pessoas que acreditam na ideia e ajudam testando a plataforma e dando feedback.
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-text">O que a Mooose acredita</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-text-muted">
              <li>Que <strong>treinar redação não pode ser um privilégio</strong> de quem pode pagar por correções individuais.</li>
              <li>Que a IA pode ser usada para <strong>ampliar oportunidades</strong>, não para substituí-las.</li>
              <li>Que feedback rápido e didático ajuda a <strong>reduzir a ansiedade</strong> em torno da redação do ENEM.</li>
              <li>Que tecnologia e educação podem caminhar juntas com linguagem simples, acessível e divertida.</li>
            </ul>
            <p className="mt-3 text-sm text-text-muted">
              Mais do que uma ferramenta, a Mooose quer ser um <strong>aliado de estudo</strong>: um lugar seguro para errar, testar, aprender e chegar mais preparado no dia da prova.
            </p>
          </Card>
        </div>
      </Section>

      <Section>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-text">Nossa missão</h2>
            <p className="mt-3 text-sm text-text-muted">
              A missão da Mooose é simples de dizer e complexa de executar: <strong>ajudar mais estudantes a enxergarem a universidade pública como um caminho possível</strong>.
            </p>
            <p className="mt-3 text-sm text-text-muted">
              Isso passa por tornar o treino de redação mais acessível, menos solitário e mais divertido – especialmente para quem estuda em casa, trabalha e estuda ao mesmo tempo ou não tem estrutura de acompanhamento individual.
            </p>
          </Card>

          <Card className="p-6 bg-slate-900 text-slate-200">
            <h3 className="text-lg font-semibold">Como a Mooose se sustenta</h3>
            <p className="mt-3 text-sm text-slate-300">
              A ideia é manter a correção de redações <strong>acessível</strong> para estudantes, começando com <strong>1 correção grátis</strong> para todos e pacotes de <strong>10 correções por R$ 9,90</strong>. A sustentabilidade vem por meio de:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-300">
              <li><strong>Anúncios bem filtrados</strong>, evitando conteúdos enganosos, casas de aposta, pornografia ou qualquer coisa que não faça sentido para quem está estudando.</li>
              <li><strong>Pacotes de correções</strong> com mais correções, relatórios avançados e recursos extras para quem quiser investir ainda mais na preparação.</li>
            </ul>
            <p className="mt-3 text-sm text-slate-300">
              Tudo isso é construído com cuidado: antes de qualquer monetização, vem a responsabilidade com quem está usando a Mooose para tentar mudar a própria vida.
            </p>
          </Card>
        </div>
      </Section>

      <Section>
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-text">O que vem pela frente</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-text-muted">
            <li><strong>Trilhas de estudo</strong> com sugestões de temas, metas semanais e acompanhamento da evolução.</li>
            <li><strong>Relatórios mais detalhados</strong> sobre o desempenho ao longo do tempo, com gráficos e comparações.</li>
            <li>Recursos extras para professores e projetos sociais que queiram usar a Mooose em turma.</li>
            <li>Funcionalidades premium para quem quiser se aprofundar ainda mais, mantendo correções acessíveis.</li>
          </ul>
        </Card>
      </Section>

      <Section>
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-text">Mooose, universidade e parcerias</h2>
          <p className="mt-3 text-sm text-text-muted">
            A Mooose é um projeto independente, mas que conversa muito com o ambiente universitário e de inovação. Parte das ideias, testes e discussões surgiu dentro da UFSC, em disciplinas e conversas sobre tecnologia, sistemas e impacto social.
          </p>
          <p className="mt-3 text-sm text-text-muted">O objetivo é, cada vez mais, aproximar a plataforma de:</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-text-muted">
            <li>escolas públicas e particulares;</li>
            <li>projetos sociais focados em vestibular e ENEM;</li>
            <li>programas de inovação e empreendedorismo ligados à universidade;</li>
            <li>professores e corretores que queiram usar a Mooose como apoio em sala.</li>
          </ul>
          <p className="mt-3 text-sm text-text-muted">
            Se você faz parte de alguma iniciativa assim e quer conversar sobre parceria, uso em turma ou algum tipo de colaboração, a porta está aberta: basta entrar em contato pelo e-mail abaixo.
          </p>
        </Card>
      </Section>
    </PageShell>
  );
}
