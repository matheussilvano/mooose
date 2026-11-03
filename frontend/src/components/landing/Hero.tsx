import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Github } from "lucide-react";
import Button from "../ui/Button";
import BenefitsChips from "./BenefitsChips";

export default function Hero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="landing-hero" id="hero">
      <div className="landing-hero-inner">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.2 }}
          className="landing-pill"
        >
          <div className="landing-pill-avatars" aria-hidden="true">
            <img className="landing-avatar" src="/avatars/avatar-1.jpg" alt="" loading="lazy" />
            <img className="landing-avatar" src="/avatars/avatar-2.jpg" alt="" loading="lazy" />
            <img className="landing-avatar" src="/avatars/avatar-3.jpg" alt="" loading="lazy" />
          </div>
          <span>100% open-source · Apache-2.0 · +1.000 correções</span>
        </motion.div>

        <motion.h1
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.2, delay: 0.04 }}
          className="landing-title"
        >
          Corrija sua redação no ENEM com <span>feedback</span> que evolui você
        </motion.h1>

        <motion.p
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.2, delay: 0.08 }}
          className="landing-subtitle"
        >
          Receba nota por competência e comentários objetivos em minutos. Código aberto: use sua própria IA — dá para corrigir de graça com OpenRouter, Gemini, Groq ou Ollama local.
        </motion.p>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.2, delay: 0.12 }}
          className="landing-cta"
        >
          <Button size="lg" onClick={() => (window.location.href = "/aberto")}>
            Corrigir grátis com minha IA
            <ArrowUpRight size={18} />
          </Button>
          <Button size="lg" variant="secondary" onClick={() => window.open("https://github.com/matheussilvano/mooose", "_blank", "noopener")}>
            <Github size={18} className="mr-2" />
            Ver no GitHub
          </Button>
          <span className="landing-cta-note">
            Sem mensalidade: a chave é sua e fica no seu navegador. Prefere não configurar nada? <a href="/paywall" className="underline">Use a versão hospedada</a>.
          </span>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.2, delay: 0.16 }}
        >
          <BenefitsChips />
        </motion.div>
      </div>
    </section>
  );
}
