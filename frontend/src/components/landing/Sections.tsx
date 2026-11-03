import { motion, useReducedMotion } from "framer-motion";
import { Check, Github, Heart, Sparkles, TrendingUp } from "lucide-react";
import Section from "../ui/Section";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Accordion from "../ui/Accordion";
import { cn } from "../../lib/cn";

const steps = [
  {
    title: "Envie sua redação",
    description: "Texto digitado ou foto/PDF com o tema informado."
  },
  {
    title: "Receba feedback",
    description: "Nota por competência + devolutiva prática e clara."
  },
  {
    title: "Evolua sempre",
    description: "Acompanhe histórico, média e seu progresso."
  }
];

const faqItems = [
  {
    title: "Preciso pagar para usar?",
    content: "Não. O Mooose é open-source: use a página /aberto com a sua própria chave de IA (há opções gratuitas como OpenRouter, Gemini, Groq e Ollama local). Os pacotes pagos existem só para quem prefere a versão hospedada, sem configurar nada."
  },
  {
    title: "Recebo nota no padrão ENEM?",
    content: "Sim. A correção segue o modelo por competências (C1–C5)."
  },
  {
    title: "Posso enviar por foto ou PDF?",
    content: "Sim. Você pode enviar texto digitado ou arquivo."
  },
  {
    title: "Quanto custa?",
    content: "O pacote mais popular é 10 correções por R$ 9,90."
  }
];

const plans = [
  {
    title: "Pacote Individual",
    price: "1 correção",
    value: "R$ 1,90",
    meta: "R$ 1,90 por correção",
    highlight: false,
    label: "Para corrigir agora",
    note: "Indicado para: quem precisa de uma correção pontual."
  },
  {
    title: "Pacote Padrão",
    price: "10 correções",
    value: "R$ 9,90",
    meta: "R$ 0,99 por correção",
    highlight: true,
    badge: "Recomendado",
    label: "Para treinar toda semana",
    note: "Melhor equilíbrio entre preço e constância. Indicado para: quem quer constância sem gastar demais.",
    savings: "Economize 48%"
  },
  {
    title: "Pacote Intensivão",
    price: "25 correções",
    value: "R$ 19,90",
    meta: "R$ 0,79 por correção",
    highlight: false,
    badge: "Melhor valor",
    label: "Para evolução acelerada",
    note: "Indicado para: quem quer avançar rápido e treinar muito.",
    savings: "Economize 58%"
  }
];

export default function LandingSections() {
  const reduceMotion = useReducedMotion();

  return (
    <>
      <Section
        id="open-source"
        title="Open-source de verdade"
        subtitle="Todo o código do Mooose é público (Apache-2.0): o front, a API e o pipeline de IA que corrige a redação."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Traga sua IA", "OpenRouter (modelos grátis), Gemini, Groq, Ollama local, OpenAI ou Claude. Sua chave não é guardada."],
            ["IA auditável", "5 corretores por competência (LangGraph), revisor, regras do ENEM em código e testes. Dá para ler, medir e melhorar."],
            ["Foto, PDF ou texto", "Mande a foto da redação: o OCR roda localmente (PaddleOCR) ou por modelo de visão."]
          ].map(([title, text]) => (
            <Card key={title} className="p-6">
              <h3 className="text-base font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-text-muted">{text}</p>
            </Card>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => (window.location.href = "/aberto")}>Corrigir grátis agora</Button>
          <Button variant="secondary" onClick={() => window.open("https://github.com/matheussilvano/mooose", "_blank", "noopener")}>
            <Github size={16} className="mr-2" /> Código no GitHub
          </Button>
          <Button variant="ghost" onClick={() => window.open("https://github.com/sponsors/matheussilvano", "_blank", "noopener")}>
            <Heart size={16} className="mr-2" /> Apoiar o projeto
          </Button>
        </div>
      </Section>

      <Section id="como-funciona" title="Como funciona" subtitle="Crie sua conta, escolha um pacote e treine redação toda semana.">
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
            >
              <Card className="p-6 transition duration-200 hover:-translate-y-1 hover:shadow-soft">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
                  {index + 1}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-text">{step.title}</h3>
                <p className="mt-2 text-sm text-text-muted">{step.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </Section>

      <Section id="beneficios" title="O que você recebe" subtitle="Tudo pronto para evoluir rápido e com clareza.">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { title: "Nota por competência", desc: "Entenda onde perdeu pontos.", icon: TrendingUp },
            { title: "Feedback claro", desc: "Sugestões objetivas e práticas.", icon: Sparkles },
            { title: "Plano de evolução", desc: "Dicas práticas para crescer toda semana.", icon: Check }
          ].map((item, index) => (
            <motion.div
              key={item.title}
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
            >
              <Card className="p-5 transition duration-200 hover:-translate-y-1 hover:shadow-soft">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <item.icon size={20} />
                </div>
                <h3 className="mt-4 text-base font-semibold text-text">{item.title}</h3>
                <p className="mt-2 text-sm text-text-muted">{item.desc}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </Section>

      <Section id="planos" title="Escolha seu pacote de correções" subtitle="Receba feedback completo em minutos e evolua a cada redação.">
        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.title}
              className={cn("p-6", plan.highlight && "border-2 border-brand bg-brand/5")}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-text">{plan.title}</h3>
                {plan.badge && <Badge>{plan.badge}</Badge>}
              </div>
              <p className="mt-4 text-sm text-text-muted">{plan.price}</p>
              <p className="mt-2 text-2xl font-extrabold text-text">{plan.value}</p>
              <p className="mt-2 text-sm text-text-muted">{plan.meta}</p>
              {plan.savings && <p className="mt-2 text-xs font-semibold text-accent-dark">{plan.savings}</p>}
              <p className="mt-3 text-sm text-text">{plan.label}</p>
              <p className="mt-2 text-xs text-text-muted">{plan.note}</p>
              <Button
                full
                className="mt-6"
                variant={plan.highlight ? "primary" : "secondary"}
                onClick={() => (window.location.href = "/paywall")}
              >
                Escolher pacote
              </Button>
            </Card>
          ))}
        </div>
      </Section>

      <Section id="faq" title="Perguntas frequentes" subtitle="Tudo o que você precisa saber antes de começar.">
        <Accordion items={faqItems} />
      </Section>
    </>
  );
}
