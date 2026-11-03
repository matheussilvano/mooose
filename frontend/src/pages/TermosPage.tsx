import { Helmet } from "react-helmet-async";
import PageShell from "../components/PageShell";
import Section from "../components/ui/Section";
import Card from "../components/ui/Card";

export default function TermosPage() {
  return (
    <PageShell>
      <Helmet>
        <title>Termos de Uso | Mooose</title>
        <meta name="description" content="Leia os Termos de Uso da Mooose, plataforma de correção de redação do ENEM com Inteligência Artificial, e entenda as regras de uso do serviço." />
      </Helmet>

      <Section className="pt-10" title="Termos de Uso" subtitle="Última atualização: Novembro de 2025" />

      <Section>
        <Card className="p-6 space-y-4 text-sm text-text-muted">
          <div>
            <h2 className="text-base font-semibold text-text">1. Sobre o Serviço</h2>
            <p>
              A Mooose é uma plataforma que utiliza Inteligência Artificial para fornecer correções aproximadas de redações baseadas nos critérios do ENEM. O objetivo é educativo, para treino e estudo.
            </p>
          </div>
          <div>
            <h2 className="text-base font-semibold text-text">2. Natureza da Correção</h2>
            <p>
              A correção é automatizada e aproximada. Embora a Mooose se baseie em critérios oficiais, o resultado tem caráter estimativo e não garante a mesma nota na prova oficial do ENEM.
            </p>
          </div>
          <div>
            <h2 className="text-base font-semibold text-text">3. Uso Aceitável</h2>
            <p>
              É proibido utilizar o serviço para enviar conteúdo ofensivo, ilegal, discriminatório ou que viole direitos de terceiros. Reservamo-nos o direito de banir usuários que violem esta regra.
            </p>
          </div>
          <div>
            <h2 className="text-base font-semibold text-text">4. Limitação de Responsabilidade</h2>
            <p>
              A Mooose não se responsabiliza por eventuais discrepâncias nas notas ou falhas técnicas temporárias na plataforma.
            </p>
          </div>
        </Card>
      </Section>
    </PageShell>
  );
}
