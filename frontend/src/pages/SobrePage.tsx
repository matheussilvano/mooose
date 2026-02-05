import StaticLegacyPage from "../components/StaticLegacyPage";

export default function SobrePage() {
  return (
    <StaticLegacyPage
      src="/legacy/sobre.html"
      title="Sobre a Mooose · História, missão e futuro do projeto"
      description="Conheça a história, missão e futuro da Mooose, projeto criado para democratizar a correção de redações do ENEM com IA para estudantes de todo o Brasil."
      ogUrl="https://mooose.com.br/sobre.html"
      ogImage="logo.png"
      twitterTitle="Sobre a Mooose · História, missão e futuro do projeto"
      twitterDescription="Saiba quem criou a Mooose, qual é a missão do projeto e o que vem pela frente."
    />
  );
}
