import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
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
          <span>+350 alunos · +1.000 correções</span>
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
          Receba nota por competência, comentários objetivos e acompanhe sua evolução em minutos.
        </motion.p>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.2, delay: 0.12 }}
          className="landing-cta"
        >
          <Button size="lg" onClick={() => (window.location.href = "/editor")}> 
            Corrigir grátis
            <ArrowUpRight size={18} />
          </Button>
          <span className="landing-cta-note">1 correção gratuita · sem cartão</span>
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
