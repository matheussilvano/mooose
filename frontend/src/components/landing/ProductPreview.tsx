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
            className="landing-preview-mock"
          >
            <div className="mock-sidebar">
              <div className="mock-logo">M</div>
              <div className="mock-dot" />
              <div className="mock-dot" />
              <div className="mock-dot" />
            </div>
            <div className="mock-main">
              <div className="mock-topbar">
                <div className="mock-search" />
                <div className="mock-user" />
              </div>
              <div className="mock-score-card">
                <div>
                  <p className="mock-label">Nota final</p>
                  <div className="mock-score">860</div>
                </div>
                <div className="mock-score-chip">+120 pts</div>
              </div>
              <div className="mock-competencias">
                <div className="mock-competencia">
                  <div className="mock-competencia-head">
                    <span>Competência 1</span>
                    <span>180/200</span>
                  </div>
                  <div className="mock-progress">
                    <span style={{ width: "90%" }} />
                  </div>
                </div>
                <div className="mock-competencia">
                  <div className="mock-competencia-head">
                    <span>Competência 2</span>
                    <span>160/200</span>
                  </div>
                  <div className="mock-progress">
                    <span style={{ width: "80%" }} />
                  </div>
                </div>
                <div className="mock-competencia">
                  <div className="mock-competencia-head">
                    <span>Competência 3</span>
                    <span>170/200</span>
                  </div>
                  <div className="mock-progress">
                    <span style={{ width: "85%" }} />
                  </div>
                </div>
              </div>
              <div className="mock-cards">
                <div className="mock-card">
                  <div className="mock-card-title" />
                  <div className="mock-card-line" />
                  <div className="mock-card-line short" />
                </div>
                <div className="mock-card">
                  <div className="mock-card-title" />
                  <div className="mock-card-line" />
                  <div className="mock-card-line short" />
                </div>
              </div>
              <div className="mock-chart">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="mock-list">
                <div className="mock-list-row">
                  <div className="mock-pill" />
                  <div className="mock-line" />
                </div>
                <div className="mock-list-row">
                  <div className="mock-pill" />
                  <div className="mock-line" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
