import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Bug, Camera, Check, Github, Heart, ShieldCheck, Star } from "lucide-react";
import SiteNav from "../components/site/SiteNav";
import SiteFooter from "../components/site/SiteFooter";
import Folha from "../components/site/Folha";
import { REPO_URL, useRepoStats } from "../lib/github";

const competencias = [
  ["C1", "Norma culta", "Ortografia, acentuação, concordância, regência e pontuação.", "Avaliada por IA, com trechos citados."],
  ["C2", "Tema e repertório", "Compreensão da proposta, tipo dissertativo e repertório produtivo.", "Fuga ao tema zera; tangenciamento limita a nota."],
  ["C3", "Argumentação", "Tese, seleção de argumentos, coerência e autoria.", "Limitada se houver tangenciamento."],
  ["C4", "Coesão", "Conectivos, referências e articulação entre parágrafos.", "Avaliada por IA, com exemplos de conectivos."],
  ["C5", "Proposta de intervenção", "Agente, ação, meio, finalidade e detalhamento.", "Checklist: a IA aponta os cinco elementos e a nota é calculada por regra."]
];

const provedores = [
  ["OpenRouter", "free", "Grátis (modelos :free)", "Sim", "Só modelos com visão"],
  ["Google Gemini", "free", "Grátis (AI Studio)", "Sim", "Sim"],
  ["Groq", "free", "Grátis (com limites)", "Sim", "Não"],
  ["Ollama", "free", "Grátis e local", "Não", "Sim, com modelo de visão"],
  ["OpenAI", "paid", "Pago por uso", "Sim", "Sim"],
  ["Claude", "paid", "Pago por uso", "Sim", "Sim"]
];

const faq = [
  ["Preciso pagar alguma coisa?", "Não. O Mooose é gratuito e de código aberto. Você usa a sua própria chave de IA, e existem opções sem custo: OpenRouter, Gemini, Groq ou Ollama rodando no seu computador."],
  ["Posso usar minha assinatura do ChatGPT Plus ou Claude Pro?", "Não. Assinaturas de chat não incluem acesso à API, e usar o login delas em apps de terceiros viola os termos dos serviços. Use uma das opções gratuitas acima."],
  ["Minha redação e minha chave ficam salvas?", "Não. A chave fica só no seu navegador e a redação não é gravada no servidor. Se preferir, rode tudo na sua máquina com Ollama e nada sai de lá."],
  ["A nota é igual à do ENEM?", "Não. É uma estimativa feita por IA, seguindo as cinco competências, útil para treinar. Modelos menores erram mais; por isso há a opção de repetir a correção e usar a mediana."],
  ["Funciona com foto da redação?", "Sim. Mande a foto ou um PDF, revise o texto que a IA leu e corrija. Para letra de mão, modelos de visão funcionam bem melhor que OCR tradicional."]
];

export default function LandingPage() {
  const stats = useRepoStats();
  return (
    <div className="mz">
      <Helmet>
        <title>Mooose · corretor de redação do ENEM open-source</title>
        <meta name="description" content="Corrija sua redação do ENEM de graça, com a IA que você escolher. Nota de 0 a 1000, feedback por competência e código aberto." />
      </Helmet>
      <SiteNav />
      <main>
        <section className="mz-hero">
          <div className="mz-wrap mz-hero__grid">
            <div>
              <h1>Sua redação do ENEM corrigida em minutos, de graça.</h1>
              <p className="mz-hero__lead">
                Cole o texto ou mande uma foto. Você escolhe a IA, inclusive uma que roda no seu computador, e recebe nota por competência com sugestões do que mudar. O código é aberto.
              </p>
              <div className="mz-hero__cta">
                <Link className="mz-btn mz-btn--primary" to="/corrigir">
                  Corrigir minha redação
                </Link>
                <a className="mz-btn" href={REPO_URL} target="_blank" rel="noreferrer">
                  <Github aria-hidden /> Ver no GitHub
                  {stats && (
                    <span className="mz-stars">
                      <Star size={15} fill="currentColor" aria-hidden /> {stats.stars.toLocaleString("pt-BR")}
                    </span>
                  )}
                </a>
              </div>
              <p className="mz-hero__note">
                <ShieldCheck aria-hidden /> Sem cadastro. Sua chave de IA fica só no seu navegador.
              </p>
            </div>
            <Folha />
          </div>
        </section>

        <section className="mz-sec mz-sec--band" id="como-funciona">
          <div className="mz-wrap">
            <div className="mz-sec__head">
              <h2>Da folha em branco à nota em três passos</h2>
            </div>
            <ol className="mz-steps">
              <li>
                <h3>Escolha sua IA</h3>
                <p>Cole uma chave gratuita do OpenRouter, Gemini ou Groq, ou use o Ollama no seu computador. Leva dois minutos.</p>
              </li>
              <li>
                <h3>Escreva ou fotografe</h3>
                <p>Digite o tema e cole o texto, ou envie a foto da folha. Você revisa o que foi lido antes de corrigir.</p>
              </li>
              <li>
                <h3>Receba a correção</h3>
                <p>Nota de 0 a 200 em cada competência, trechos citados do seu texto e três próximos passos para a próxima redação.</p>
              </li>
            </ol>
          </div>
        </section>

        <section className="mz-sec" id="competencias">
          <div className="mz-wrap">
            <div className="mz-sec__head">
              <h2>As cinco competências do ENEM</h2>
              <p>Cada competência tem seu próprio corretor. Regras do ENEM, como anulação e limites por tangenciamento, são código testado, não palpite do modelo.</p>
            </div>
            <table className="mz-table">
              <thead>
                <tr>
                  <th scope="col">Competência</th>
                  <th scope="col">O que é avaliado</th>
                  <th scope="col">Como a nota é decidida</th>
                </tr>
              </thead>
              <tbody>
                {competencias.map(([id, nome, o, c]) => (
                  <tr key={id}>
                    <td>
                      {id} <small>{nome}</small>
                    </td>
                    <td data-label="O que é avaliado">{o}</td>
                    <td data-label="Como a nota é decidida">{c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mz-sec mz-sec--band" id="provedores">
          <div className="mz-wrap">
            <div className="mz-sec__head">
              <h2>Traga a IA que você já tem</h2>
              <p>
                <Camera size={18} style={{ verticalAlign: "-3px" }} aria-hidden /> Fotos de redação precisam de um modelo com visão. Veja a coluna da direita.
              </p>
            </div>
            <table className="mz-table">
              <thead>
                <tr>
                  <th scope="col">Provedor</th>
                  <th scope="col">Custo</th>
                  <th scope="col">Chave</th>
                  <th scope="col">Lê foto</th>
                </tr>
              </thead>
              <tbody>
                {provedores.map(([nome, tipo, custo, chave, foto]) => (
                  <tr key={nome}>
                    <td>{nome}</td>
                    <td data-label="Custo">
                      <span className={`mz-tag mz-tag--${tipo}`}>{custo}</span>
                    </td>
                    <td data-label="Precisa de chave">{chave}</td>
                    <td data-label="Lê foto">{foto}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mz-sec" id="codigo-aberto">
          <div className="mz-wrap mz-oss">
            <div>
              <div className="mz-sec__head" style={{ marginBottom: 0 }}>
                <h2>Feito em público, melhor com você</h2>
                <p>
                  Todo o código está no GitHub sob a licença Apache-2.0: a interface, a API e o pipeline de IA. Se o Mooose te ajudou, uma estrela leva o projeto a mais estudantes. Se quiser mexer, tem trabalho para quem está começando.
                </p>
              </div>
              <div className="mz-stats">
                <div className="mz-stat">
                  <b>{stats ? stats.stars.toLocaleString("pt-BR") : "—"}</b>
                  <span>estrelas</span>
                </div>
                <div className="mz-stat">
                  <b>{stats ? stats.forks.toLocaleString("pt-BR") : "—"}</b>
                  <span>forks</span>
                </div>
                <div className="mz-stat">
                  <b>{stats ? stats.issues.toLocaleString("pt-BR") : "—"}</b>
                  <span>issues abertas</span>
                </div>
              </div>
            </div>
            <div className="mz-ways">
              <a className="mz-way" href={REPO_URL} target="_blank" rel="noreferrer">
                <Star aria-hidden />
                <div>
                  <b>Dê uma estrela</b>
                  <span>É de graça e ajuda outras pessoas a encontrarem o projeto.</span>
                </div>
              </a>
              <a className="mz-way" href={`${REPO_URL}/issues?q=is%3Aopen+label%3A%22good+first+issue%22`} target="_blank" rel="noreferrer">
                <Bug aria-hidden />
                <div>
                  <b>Pegue uma issue para começar</b>
                  <span>Testar modelos, melhorar a interface, enviar redações corrigidas para medir a qualidade.</span>
                </div>
              </a>
              <a className="mz-way" href="https://github.com/sponsors/matheussilvano" target="_blank" rel="noreferrer">
                <Heart aria-hidden />
                <div>
                  <b>Apoie o projeto</b>
                  <span>Ajuda a manter o Mooose gratuito para estudantes.</span>
                </div>
              </a>
            </div>
          </div>
        </section>

        <section className="mz-sec mz-sec--band">
          <div className="mz-wrap mz-faq" style={{ maxWidth: 820 }}>
            <div className="mz-sec__head">
              <h2>Perguntas frequentes</h2>
            </div>
            {faq.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
            <div style={{ marginTop: 36 }}>
              <Link className="mz-btn mz-btn--primary" to="/corrigir">
                <Check aria-hidden /> Corrigir minha redação
              </Link>{" "}
              <a className="mz-btn mz-btn--ghost" href={REPO_URL} target="_blank" rel="noreferrer">
                Ler o código
              </a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
