// The hero's signature: a sample "folha de redação" with the corrector's red pen on it.
const lines: Array<Array<string | { hl?: string; under?: string }>> = [
  ["A Constituição assegura a todos"],
  ["o direito à cultura, ", { hl: "no entanto," }],
  ["povos tradicionais ainda enfrentam o"],
  [{ under: "preconceito" }, " e o apagamento cultural."],
  ["Nesse cenário, a escola é decisiva:"],
  ["é nela que a diversidade se conhece."],
  [{ hl: "Dessarte," }, " cabe ao Ministério da"],
  ["Educação criar campanhas escolares,"],
  ["por meio de aulas e palestras, a fim"],
  ["de combater o estigma."]
];

const notes = [
  { top: 0, text: "repertório ✓ (C2)" },
  { top: 62, text: "troque o conectivo (C4)" },
  { top: 130, text: "tese clara ✓ (C3)" },
  { top: 226, text: "detalhe meio e finalidade (C5)" }
];

function renderLine(parts: Array<string | { hl?: string; under?: string }>) {
  return parts.map((p, i) =>
    typeof p === "string" ? (
      <span key={i}>{p}</span>
    ) : p.hl ? (
      <span key={i} className="mz-hl">{p.hl}</span>
    ) : (
      <span key={i} className="mz-under">{p.under}</span>
    )
  );
}

export default function Folha() {
  return (
    <figure className="mz-folha" aria-label="Exemplo de redação corrigida com anotações">
      <span className="mz-folha__tag">exemplo</span>
      <div className="mz-folha__head">
        <span>FOLHA DE REDAÇÃO</span>
        <span>correção por competência</span>
      </div>
      <div className="mz-folha__body">
        <ol>
          {lines.map((l, i) => (
            <li key={i}>
              <span>{i + 1}</span>
              <span>{renderLine(l)}</span>
            </li>
          ))}
        </ol>
        <div className="mz-folha__notes" aria-hidden>
          {notes.map((n, i) => (
            <div key={i} className="mz-note" style={{ top: n.top, animationDelay: `${0.5 + i * 0.35}s` }}>
              {n.text}
            </div>
          ))}
        </div>
      </div>
      <div className="mz-folha__score">
        {[["C1", 160], ["C2", 160], ["C3", 120], ["C4", 120], ["C5", 160]].map(([c, n]) => (
          <div key={c}>
            {c}
            <b>{n}</b>
          </div>
        ))}
        <div className="mz-total">
          nota
          <b>720</b>
        </div>
      </div>
    </figure>
  );
}
