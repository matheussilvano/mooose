import { Helmet } from "react-helmet-async";
import PageShell from "../components/PageShell";
import Section from "../components/ui/Section";
import Card from "../components/ui/Card";

export default function PrivacidadePage() {
  return (
    <PageShell>
      <Helmet>
        <title>Política de Privacidade | Mooose</title>
        <meta name="description" content="Entenda como a Mooose coleta, utiliza e protege seus dados pessoais ao usar a plataforma de correção de redação do ENEM com IA." />
      </Helmet>

      <Section className="pt-10" title="Política de Privacidade" subtitle="Última atualização: Novembro de 2025" />

      <Section>
        <Card className="p-6 space-y-4 text-sm text-text-muted">
          <div>
            <h2 className="text-base font-semibold text-text">1. Coleta de Dados</h2>
            <p>
              A Mooose coleta informações mínimas necessárias para o funcionamento da plataforma, como e-mail, nome e dados das redações enviadas. Também podemos coletar dados de navegação anônimos por meio de ferramentas como Google Analytics para entender como os usuários navegam no site.
            </p>
          </div>
          <div>
            <h2 className="text-base font-semibold text-text">2. Uso das Informações</h2>
            <p>
              Seus dados são usados exclusivamente para: criar sua conta, fornecer o histórico de correções e melhorar a inteligência artificial. Não vendemos seus dados para terceiros.
            </p>
          </div>
          <div>
            <h2 className="text-base font-semibold text-text">3. Publicidade (Google AdSense)</h2>
            <p>
              Podemos utilizar o Google AdSense para exibir anúncios na plataforma. Quando isso estiver ativo, o Google e seus parceiros poderão usar cookies para exibir anúncios com base em visitas anteriores a este e a outros sites.
            </p>
            <p className="mt-2">
              Você pode gerenciar o uso de cookies diretamente nas configurações do seu navegador. Sempre que possível, configuraremos o Google AdSense para bloquear categorias sensíveis de anúncios (como conteúdo adulto, apostas e outros temas inadequados para estudantes em idade de vestibular).
            </p>
          </div>
          <div>
            <h2 className="text-base font-semibold text-text">4. Seus Direitos</h2>
            <p>
              Você pode solicitar a exclusão da sua conta e de todos os dados associados, bem como exercer outros direitos previstos na legislação aplicável, a qualquer momento enviando um e-mail para contato@mooose.com.br.
            </p>
          </div>
        </Card>
      </Section>
    </PageShell>
  );
}
