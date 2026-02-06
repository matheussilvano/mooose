import { motion, useReducedMotion } from "framer-motion";

export default function ProductPreview() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="landing-preview" aria-label="Preview do produto">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.2 }}
        className="landing-preview-card"
      >
        <div className="landing-preview-header">
          <div>
            <p className="landing-preview-kicker">Preview da plataforma</p>
            <h2>Veja a devolutiva em tempo real</h2>
            <p>Acompanhe competências, pontos fortes e o que melhorar em cada redação.</p>
          </div>
          <span className="landing-preview-badge">Mooose</span>
        </div>
        <div className="landing-preview-body">
          <motion.div
            animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="landing-preview-result"
          >
            <div className="mock-result-header">
              <div>
                <p className="mock-label">Resultado da redação</p>
                <h3>Desafios para a valorização de comunidades tradicionais</h3>
                <p className="mock-meta">Hoje · Texto digitado</p>
              </div>
              <div className="mock-score-pill">
                <span>860</span>
                <small>Excelente</small>
              </div>
            </div>

            <div className="mock-competencias">
              {[
                { label: "Competência 1", score: "180/200", width: "90%" },
                { label: "Competência 2", score: "160/200", width: "80%" },
                { label: "Competência 3", score: "170/200", width: "85%" },
                { label: "Competência 4", score: "170/200", width: "85%" },
                { label: "Competência 5", score: "180/200", width: "90%" }
              ].map((item) => (
                <div className="mock-competencia" key={item.label}>
                  <div className="mock-competencia-head">
                    <span>{item.label}</span>
                    <span>{item.score}</span>
                  </div>
                  <div className="mock-progress">
                    <span style={{ width: item.width }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mock-feedback">
              <div className="mock-feedback-card">
                <strong>Pontos fortes</strong>
                <p>Argumentação clara e repertório bem aplicado.</p>
              </div>
              <div className="mock-feedback-card">
                <strong>Pontos a melhorar</strong>
                <p>Reforce a proposta de intervenção com detalhamento.</p>
              </div>
              <div className="mock-feedback-card accent">
                <strong>Sugestão prática</strong>
                <p>Inclua agentes, meios e finalidade na conclusão.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
