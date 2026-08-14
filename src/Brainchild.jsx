import { useState, useRef, useEffect } from "react";

/* ============================================================
   BRAINCHILD — idea → PRD → architecture → interview → context kit
   Blueprint-drafting visual language: cobalt rail, vellum sheet.
   ============================================================ */

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap');
`;

const C = {
  cobalt: "#16307A",
  cobaltDeep: "#0E2158",
  cobaltLine: "#3D5BB8",
  chalk: "#E8EEFF",
  chalkDim: "#9DB0E4",
  sheet: "#F4F7FB",
  sheetEdge: "#DDE5F2",
  ink: "#1B2740",
  inkSoft: "#5A6A8C",
  amber: "#F5A623",
  amberDeep: "#C97F0A",
  green: "#2E9E6B",
  red: "#C94F3D",
};

const STAGES = [
  { id: "spark", label: "Spark", sub: "Use cases & intent" },
  { id: "prd", label: "PRD", sub: "Product requirements" },
  { id: "arch", label: "Architecture", sub: "System design" },
  { id: "interview", label: "Interview", sub: "Clarify & refine" },
  { id: "kit", label: "Context Kit", sub: "CLAUDE.md + .mex/" },
];

const ANCHORS = {
  claude: { label: "Claude Code", path: "CLAUDE.md" },
  cursor: { label: "Cursor", path: ".cursorrules" },
  codex: { label: "Codex", path: "AGENTS.md" },
  windsurf: { label: "Windsurf", path: ".windsurfrules" },
  copilot: { label: "GitHub Copilot", path: ".github/copilot-instructions.md" },
};

const MODELS = [
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (recommended)" },
  { id: "claude-opus-4-8", label: "Claude Opus 4.8 (deeper, slower)" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (fast, cheap)" },
];

/* ---------------- API helper ---------------- */

async function callClaude({ system, user, model, expectJson = false, apiKey }) {
  if (!apiKey) throw new Error("No API key set. Open Settings and paste your Anthropic API key.");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: model || "claude-sonnet-4-6",
      max_tokens: 8000,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "API error");
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  if (!expectJson) return text;
  const clean = text.replace(/```json|```/g, "").trim();
  const start = clean.indexOf(clean[0] === "[" ? "[" : "{");
  return JSON.parse(clean.slice(start >= 0 ? start : 0));
}

/* ---------------- tiny markdown renderer ---------------- */

function inlineMd(s) {
  const parts = [];
  let rest = s, key = 0;
  const re = /(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\*([^*]+)\*)/;
  while (rest.length) {
    const m = rest.match(re);
    if (!m) { parts.push(rest); break; }
    if (m.index > 0) parts.push(rest.slice(0, m.index));
    if (m[2]) parts.push(<strong key={key++}>{m[2]}</strong>);
    else if (m[4]) parts.push(<code key={key++} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.86em", background: "#E7EDF8", padding: "1px 5px", borderRadius: 3, color: C.cobalt }}>{m[4]}</code>);
    else if (m[6]) parts.push(<em key={key++}>{m[6]}</em>);
    rest = rest.slice(m.index + m[0].length);
  }
  return parts;
}

function Markdown({ text }) {
  if (!text) return null;
  const lines = text.split("\n");
  const out = [];
  let i = 0, key = 0;
  const hStyle = (lvl) => ({
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: lvl <= 2 ? 700 : 600,
    fontSize: lvl === 1 ? 24 : lvl === 2 ? 18 : 15,
    color: C.ink,
    margin: `${lvl === 1 ? 8 : 22}px 0 8px`,
    letterSpacing: lvl <= 2 ? "-0.01em" : 0,
    ...(lvl === 2 ? { borderBottom: `1px solid ${C.sheetEdge}`, paddingBottom: 6 } : {}),
  });
  while (i < lines.length) {
    const ln = lines[i];
    if (ln.startsWith("```")) {
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) { buf.push(lines[i]); i++; }
      i++;
      out.push(<pre key={key++} style={{ background: C.cobaltDeep, color: C.chalk, padding: "12px 14px", borderRadius: 6, fontSize: 12.5, fontFamily: "'JetBrains Mono', monospace", overflowX: "auto", lineHeight: 1.55, margin: "10px 0" }}>{buf.join("\n")}</pre>);
      continue;
    }
    const h = ln.match(/^(#{1,4})\s+(.*)/);
    if (h) { out.push(<div key={key++} style={hStyle(h[1].length)}>{inlineMd(h[2])}</div>); i++; continue; }
    if (/^\s*[-*]\s+/.test(ln)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*[-*]\s+/, "")); i++; }
      out.push(<ul key={key++} style={{ margin: "6px 0 10px", paddingLeft: 22 }}>{items.map((it, j) => <li key={j} style={{ margin: "3px 0", lineHeight: 1.6 }}>{inlineMd(it)}</li>)}</ul>);
      continue;
    }
    if (/^\s*\d+\.\s+/.test(ln)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+\.\s+/, "")); i++; }
      out.push(<ol key={key++} style={{ margin: "6px 0 10px", paddingLeft: 24 }}>{items.map((it, j) => <li key={j} style={{ margin: "3px 0", lineHeight: 1.6 }}>{inlineMd(it)}</li>)}</ol>);
      continue;
    }
    if (ln.trim() === "---") { out.push(<hr key={key++} style={{ border: "none", borderTop: `1px dashed ${C.sheetEdge}`, margin: "16px 0" }} />); i++; continue; }
    if (ln.trim() === "") { i++; continue; }
    const buf = [ln];
    i++;
    while (i < lines.length && lines[i].trim() !== "" && !/^(#|```|\s*[-*]\s|\s*\d+\.\s|---$)/.test(lines[i])) { buf.push(lines[i]); i++; }
    out.push(<p key={key++} style={{ margin: "6px 0 10px", lineHeight: 1.65 }}>{inlineMd(buf.join(" "))}</p>);
  }
  return <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: C.ink }}>{out}</div>;
}

/* ---------------- shared UI atoms ---------------- */

function Btn({ children, onClick, kind = "primary", disabled, small }) {
  const base = {
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 600,
    fontSize: small ? 12.5 : 14,
    padding: small ? "6px 12px" : "10px 18px",
    borderRadius: 6,
    cursor: disabled ? "not-allowed" : "pointer",
    border: "1.5px solid transparent",
    opacity: disabled ? 0.5 : 1,
    transition: "transform 0.08s ease, box-shadow 0.15s ease",
    letterSpacing: "0.01em",
  };
  const kinds = {
    primary: { background: C.amber, color: "#2A1E04", boxShadow: "0 2px 0 " + C.amberDeep },
    ghost: { background: "transparent", color: C.cobalt, border: `1.5px solid ${C.cobaltLine}` },
    dark: { background: C.cobalt, color: C.chalk },
    danger: { background: "transparent", color: C.red, border: `1.5px solid ${C.red}` },
  };
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{ ...base, ...kinds[kind] }}
      onMouseDown={(e) => !disabled && (e.currentTarget.style.transform = "translateY(1px)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "none")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
    >
      {children}
    </button>
  );
}

function Tag({ children, color = C.cobalt }) {
  return (
    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color, border: `1px solid ${color}44`, padding: "2px 8px", borderRadius: 3 }}>
      {children}
    </span>
  );
}

function Spinner({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "24px 0", color: C.inkSoft, fontFamily: "'Inter', sans-serif", fontSize: 13.5 }}>
      <svg width="26" height="26" viewBox="0 0 26 26" style={{ animation: "bc-spin 1.1s linear infinite" }}>
        <circle cx="13" cy="13" r="10" fill="none" stroke={C.sheetEdge} strokeWidth="3" />
        <path d="M13 3 A10 10 0 0 1 23 13" fill="none" stroke={C.amber} strokeWidth="3" strokeLinecap="round" />
      </svg>
      {label}
    </div>
  );
}

function ErrorNote({ msg, onRetry }) {
  return (
    <div style={{ background: "#FCEEEB", border: `1px solid ${C.red}55`, borderRadius: 6, padding: "12px 14px", margin: "12px 0", fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.red, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <span>Generation failed: {msg}</span>
      {onRetry && <Btn small kind="danger" onClick={onRetry}>Retry</Btn>}
    </div>
  );
}

/* ---------------- document panel (view / edit / regenerate) ---------------- */

function DocPanel({ title, doc, onChange, onRegenerate, busy }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(doc || "");
  useEffect(() => setDraft(doc || ""), [doc]);
  return (
    <div style={{ background: "#FFFFFF", border: `1px solid ${C.sheetEdge}`, borderRadius: 8, boxShadow: "0 1px 3px rgba(20,35,80,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: `1px solid ${C.sheetEdge}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Tag>{title}</Tag>
          {doc && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.inkSoft }}>{doc.split(/\s+/).length} words</span>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {doc && !editing && <Btn small kind="ghost" onClick={() => setEditing(true)}>Edit</Btn>}
          {editing && <Btn small onClick={() => { onChange(draft); setEditing(false); }}>Save edits</Btn>}
          {editing && <Btn small kind="ghost" onClick={() => { setDraft(doc); setEditing(false); }}>Cancel</Btn>}
          {doc && !editing && onRegenerate && <Btn small kind="ghost" onClick={onRegenerate} disabled={busy}>Regenerate</Btn>}
        </div>
      </div>
      <div style={{ padding: "8px 20px 18px", maxHeight: 460, overflowY: "auto" }}>
        {editing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            style={{ width: "100%", minHeight: 380, border: `1px solid ${C.sheetEdge}`, borderRadius: 6, padding: 12, fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, lineHeight: 1.6, color: C.ink, resize: "vertical", boxSizing: "border-box", marginTop: 10 }}
          />
        ) : (
          <Markdown text={doc} />
        )}
      </div>
    </div>
  );
}

/* ---------------- stage rail (signature element) ---------------- */

function StageRail({ stage, setStage, done, projectName }) {
  return (
    <div style={{ width: 232, minWidth: 232, background: `linear-gradient(180deg, ${C.cobalt}, ${C.cobaltDeep})`, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* blueprint grid */}
      <svg style={{ position: "absolute", inset: 0, opacity: 0.14 }} width="100%" height="100%">
        <defs>
          <pattern id="bcgrid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke={C.chalk} strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#bcgrid)" />
      </svg>
      <div style={{ position: "relative", padding: "26px 22px 14px" }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 23, color: C.chalk, letterSpacing: "-0.02em" }}>
          brainchild<span style={{ color: C.amber }}>_</span>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: C.chalkDim, letterSpacing: "0.14em", textTransform: "uppercase", marginTop: 4 }}>
          idea → context kit
        </div>
        {projectName && (
          <div style={{ marginTop: 14, fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: C.chalk, background: "#FFFFFF14", border: `1px solid ${C.cobaltLine}`, borderRadius: 4, padding: "5px 9px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            ▸ {projectName}
          </div>
        )}
      </div>
      <div style={{ position: "relative", flex: 1, padding: "8px 0" }}>
        {STAGES.map((s, idx) => {
          const active = s.id === stage;
          const isDone = done.includes(s.id);
          const reachable = idx === 0 || done.includes(STAGES[idx - 1].id) || isDone;
          return (
            <div key={s.id} style={{ position: "relative" }}>
              {idx < STAGES.length - 1 && (
                <div style={{ position: "absolute", left: 33, top: 40, height: 26, borderLeft: `1.5px ${isDone ? "solid" : "dashed"} ${isDone ? C.amber : C.cobaltLine}` }} />
              )}
              <div
                onClick={() => reachable && setStage(s.id)}
                style={{ display: "flex", alignItems: "center", gap: 13, padding: "10px 22px", cursor: reachable ? "pointer" : "default", opacity: reachable ? 1 : 0.4, background: active ? "#FFFFFF12" : "transparent", borderLeft: active ? `3px solid ${C.amber}` : "3px solid transparent" }}
              >
                <div style={{ width: 22, height: 22, borderRadius: 4, transform: "rotate(45deg)", border: `1.5px solid ${isDone ? C.amber : active ? C.chalk : C.cobaltLine}`, background: isDone ? C.amber : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {isDone && <span style={{ transform: "rotate(-45deg)", fontSize: 12, fontWeight: 700, color: C.cobaltDeep }}>✓</span>}
                </div>
                <div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14.5, color: active || isDone ? C.chalk : C.chalkDim }}>{s.label}</div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10.5, color: C.chalkDim }}>{s.sub}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "relative", padding: "14px 22px 20px", fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: C.chalkDim, letterSpacing: "0.06em", borderTop: `1px solid ${C.cobaltLine}55` }}>
        SHEET NO. {String(STAGES.findIndex((s) => s.id === stage) + 1).padStart(2, "0")} / 05 · REV A
      </div>
    </div>
  );
}

/* ============================================================
   MAIN APP
   ============================================================ */

export default function Brainchild() {
  const [stage, setStage] = useState("spark");
  const [done, setDone] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // settings
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(MODELS[0].id);
  const [anchor, setAnchor] = useState("claude");
  const [extra, setExtra] = useState("");

  // project state
  const [name, setName] = useState("");
  const [pitch, setPitch] = useState("");
  const [useCases, setUseCases] = useState("");
  const [prd, setPrd] = useState("");
  const [arch, setArch] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [refined, setRefined] = useState(false);
  const [files, setFiles] = useState({});
  const [kitProgress, setKitProgress] = useState(null);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const importRef = useRef(null);

  const markDone = (id) => setDone((d) => (d.includes(id) ? d : [...d, id]));

  const digest = () =>
    `PROJECT: ${name}\n\nPITCH:\n${pitch}\n\nUSE CASES:\n${useCases}\n\nPRD:\n${prd}\n\nARCHITECTURE:\n${arch}\n\nCLARIFYING Q&A:\n${questions.map((q) => `Q: ${q.question}\nA: ${answers[q.id] || "(unanswered)"}`).join("\n")}${extra ? `\n\nSTANDING INSTRUCTIONS FROM THE FOUNDER:\n${extra}` : ""}`;

  /* ---------- generation steps ---------- */

  const genPRD = async () => {
    setBusy(true); setErr(null);
    try {
      const text = await callClaude({ apiKey,
        model,
        system: `You are a senior product manager writing a PRD in clean Markdown. Sections: # <Product name> — PRD, ## Overview, ## Problem, ## Goals, ## Non-goals, ## Users & Personas, ## Use Cases (numbered, derived directly from the founder's notes), ## Functional Requirements (grouped, with MUST/SHOULD/COULD), ## Non-functional Requirements, ## Success Metrics, ## Risks & Open Questions. Be specific and decisive; where the notes are silent, make a sensible call and mark it (assumption). Output ONLY the Markdown document, no preamble.${extra ? " Standing instructions from the founder: " + extra : ""}`,
        user: `Product name: ${name}\n\nPitch:\n${pitch}\n\nRaw use-case notes:\n${useCases}`,
      });
      setPrd(text);
      markDone("spark"); markDone("prd");
      setStage("prd");
    } catch (e) { setErr({ msg: e.message, retry: genPRD }); }
    setBusy(false);
  };

  const genArch = async () => {
    setBusy(true); setErr(null);
    try {
      const text = await callClaude({ apiKey,
        model,
        system: `You are a staff engineer producing an architecture design doc in clean Markdown. Sections: # <Product name> — Architecture, ## System Overview, ## Recommended Stack (with one-line justification each), ## Component Architecture (include an ASCII diagram in a code block), ## Data Model (key entities + fields), ## API Surface (key endpoints or interfaces), ## Infrastructure & Deployment, ## Security & Auth, ## Key Tradeoffs & Decisions (decision / alternatives / rationale). Be opinionated; mark assumptions. Output ONLY the Markdown document.${extra ? " Standing instructions from the founder: " + extra : ""}`,
        user: `Design the architecture for this product.\n\nPRD:\n${prd}`,
      });
      setArch(text);
      markDone("arch");
      setStage("arch");
    } catch (e) { setErr({ msg: e.message, retry: genArch }); }
    setBusy(false);
  };

  const genQuestions = async () => {
    setBusy(true); setErr(null);
    try {
      const qs = await callClaude({ apiKey,
        model,
        expectJson: true,
        system: `You are finalizing a product design before implementation. Read the PRD and architecture, find the decisions that are still ambiguous, risky, or assumption-marked, and ask the founder the 5 most consequential clarifying questions. Respond ONLY with a JSON array: [{"id":"q1","question":"...","why":"one line on why this matters"}]. No markdown fences, no prose.`,
        user: `PRD:\n${prd}\n\nARCHITECTURE:\n${arch}`,
      });
      setQuestions(qs);
      setStage("interview");
    } catch (e) { setErr({ msg: e.message, retry: genQuestions }); }
    setBusy(false);
  };

  const applyAnswers = async () => {
    setBusy(true); setErr(null);
    try {
      const qa = questions.map((q) => `Q: ${q.question}\nA: ${answers[q.id] || "(founder skipped — keep your assumption)"}`).join("\n\n");
      const newPrd = await callClaude({ apiKey,
        model,
        system: "You are revising a PRD. Apply the founder's answers below: resolve the related assumptions and open questions, keep everything else intact, keep the same section structure. Output ONLY the full revised Markdown PRD.",
        user: `CURRENT PRD:\n${prd}\n\nFOUNDER ANSWERS:\n${qa}`,
      });
      setPrd(newPrd);
      const newArch = await callClaude({ apiKey,
        model,
        system: "You are revising an architecture doc. Apply the founder's answers and the revised PRD: update affected decisions, keep the same section structure. Output ONLY the full revised Markdown architecture doc.",
        user: `CURRENT ARCHITECTURE:\n${arch}\n\nREVISED PRD:\n${newPrd}\n\nFOUNDER ANSWERS:\n${qa}`,
      });
      setArch(newArch);
      setRefined(true);
      markDone("interview");
    } catch (e) { setErr({ msg: e.message, retry: applyAnswers }); }
    setBusy(false);
  };

  /* ---------- context kit ---------- */

  const kitSpecs = () => {
    const a = ANCHORS[anchor];
    return [
      { path: a.path, spec: `The project anchor file for ${a.label}. Small and always-loaded: 1-2 sentence project summary, the tech stack in one line, a pointer telling the agent to read .mex/ROUTER.md before any task to load routed context, the 5 most important conventions/commands, and what to update in .mex/ after meaningful work. Under 60 lines.` },
      { path: ".mex/AGENTS.md", spec: "Instructions for AI coding agents working in this repo: how the .mex wiki is organized, when to read ROUTER.md, when and how to write back decisions/patterns/state after completing work, and rules for keeping the wiki current instead of stale." },
      { path: ".mex/ROUTER.md", spec: "The context router. A task-type table mapping kinds of work (e.g. new feature, bug fix, API change, UI work, data model change, infra) to which .mex/context/*.md and patterns files to load, so agents load only what the task requires. Include a short 'always load' line and a default route." },
      { path: ".mex/context/architecture.md", spec: "The system architecture distilled for agent consumption: components and responsibilities, how they communicate, the ASCII component diagram, and the data flow. Derived from the architecture doc; tighter and more declarative." },
      { path: ".mex/context/stack.md", spec: "The exact tech stack: languages, frameworks, key libraries, datastores, infra — each with a one-line 'why' and any version constraints." },
      { path: ".mex/context/setup.md", spec: "Bootstrap instructions for a fresh clone: prerequisites, install, env vars (names + purpose, never values), run dev, run tests, build. Where the design hasn't fixed a detail yet, write the intended command and mark it TODO." },
      { path: ".mex/context/decisions.md", spec: "An architecture-decision log seeded from the design: each entry is '## D-00N — <title>' with Decision / Alternatives considered / Rationale / Status. Include every decision resolved during the founder Q&A." },
      { path: ".mex/context/conventions.md", spec: "Code conventions for this project: naming, file/folder layout, error handling, testing expectations, commit style, and product-specific rules implied by the PRD (e.g. how user-facing copy is written)." },
      { path: ".mex/patterns/INDEX.md", spec: "The patterns index, mostly empty at project start: explain what belongs here (reusable implementation patterns discovered during real work), the entry format, and seed 1-2 anticipated pattern stubs based on the architecture." },
    ];
  };

  const genKit = async () => {
    setBusy(true); setErr(null);
    setStage("kit");
    const specs = kitSpecs();
    const d = digest();
    const built = {};
    try {
      for (let i = 0; i < specs.length; i++) {
        setKitProgress({ i: i + 1, n: specs.length, path: specs[i].path });
        const text = await callClaude({ apiKey,
          model,
          system: `You generate one file of a mex-style project context kit (github.com/mex-memory/mex): a repo-local Markdown wiki that gives AI coding agents persistent project memory. Write the file so a coding agent (not a human reader) gets maximum signal per token: declarative, specific, no marketing language, no placeholders like "[insert here]". Output ONLY the raw file content — no fences, no commentary.`,
          user: `PROJECT DIGEST:\n${d}\n\nFILE TO GENERATE: ${specs[i].path}\nWHAT IT MUST CONTAIN: ${specs[i].spec}`,
        });
        built[specs[i].path] = text;
        setFiles({ ...built });
      }
      setKitProgress(null);
      markDone("kit");
    } catch (e) {
      setKitProgress(null);
      setErr({ msg: e.message, retry: genKit });
    }
    setBusy(false);
  };

  /* ---------- downloads / project io ---------- */

  const download = (filename, content, type = "text/markdown") => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadInstallScript = () => {
    const lines = ["#!/usr/bin/env bash", "# brainchild context kit — run from your project root", "set -e", ""];
    Object.entries(files).forEach(([path, content]) => {
      const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : null;
      if (dir) lines.push(`mkdir -p "${dir}"`);
      const eof = "BRAINCHILD_EOF";
      lines.push(`cat > "${path}" << '${eof}'`);
      lines.push(content.replace(new RegExp(eof, "g"), "BRAINCHILD-EOF"));
      lines.push(eof, "");
    });
    lines.push('echo "brainchild kit installed: $(ls -d .mex 2>/dev/null && echo .mex/) ✔"');
    download("install-brainchild-kit.sh", lines.join("\n"), "text/x-shellscript");
  };

  const exportProject = () => {
    download(
      `${(name || "brainchild-project").toLowerCase().replace(/\s+/g, "-")}.brainchild.json`,
      JSON.stringify({ v: 1, name, pitch, useCases, prd, arch, questions, answers, files, anchor, extra, done }, null, 2),
      "application/json"
    );
  };

  const importProject = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const p = JSON.parse(r.result);
        setName(p.name || ""); setPitch(p.pitch || ""); setUseCases(p.useCases || "");
        setPrd(p.prd || ""); setArch(p.arch || ""); setQuestions(p.questions || []);
        setAnswers(p.answers || {}); setFiles(p.files || {}); setAnchor(p.anchor || "claude");
        setExtra(p.extra || ""); setDone(p.done || []);
        setStage(p.done?.includes("kit") ? "kit" : p.done?.slice(-1)[0] || "spark");
      } catch { setErr({ msg: "That file isn't a brainchild project export." }); }
    };
    r.readAsText(f);
    e.target.value = "";
  };

  /* ---------- kit file browser ---------- */

  const [selFile, setSelFile] = useState(null);
  useEffect(() => {
    const keys = Object.keys(files);
    if (keys.length && (!selFile || !files[selFile])) setSelFile(keys[0]);
  }, [files]);

  /* ============================ RENDER ============================ */

  const sheet = { maxWidth: 880, margin: "0 auto", padding: "34px 40px 80px" };
  const label = { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkSoft, display: "block", marginBottom: 6 };
  const input = { width: "100%", boxSizing: "border-box", border: `1.5px solid ${C.sheetEdge}`, borderRadius: 6, padding: "10px 12px", fontFamily: "'Inter', sans-serif", fontSize: 14, color: C.ink, background: "#FFF", outline: "none" };

  return (
    <div style={{ display: "flex", height: "100vh", background: C.sheet, overflow: "hidden" }}>
      <style>{FONTS + `
        @keyframes bc-spin { to { transform: rotate(360deg); } }
        textarea:focus, input:focus, select:focus { border-color: ${C.cobaltLine} !important; }
        ::selection { background: ${C.amber}55; }
        @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
      `}</style>

      <StageRail stage={stage} setStage={setStage} done={done} projectName={name} />

      <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
        {/* top bar */}
        <div style={{ position: "sticky", top: 0, zIndex: 5, background: C.sheet + "F2", backdropFilter: "blur(6px)", borderBottom: `1px solid ${C.sheetEdge}`, padding: "10px 40px", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <input ref={importRef} type="file" accept=".json" style={{ display: "none" }} onChange={importProject} />
          <Btn small kind="ghost" onClick={() => importRef.current?.click()}>Open project…</Btn>
          <Btn small kind="ghost" onClick={exportProject} disabled={!name && !useCases}>Save project</Btn>
          <Btn small kind="dark" onClick={() => setSettingsOpen(true)}>Settings</Btn>
        </div>

        {err && <div style={{ ...sheet, paddingBottom: 0 }}><ErrorNote msg={err.msg} onRetry={err.retry} /></div>}

        {/* ---------- SPARK ---------- */}
        {stage === "spark" && (
          <div style={sheet}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 30, color: C.ink, letterSpacing: "-0.02em" }}>Start with the raw idea.</div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14.5, color: C.inkSoft, lineHeight: 1.6, margin: "8px 0 26px", maxWidth: 620 }}>
              Dump your use cases exactly the way you'd normally write them for an AI session — messy is fine. Brainchild drafts the PRD from this, then the architecture, then interviews you to close the gaps.
            </p>
            <div style={{ display: "grid", gap: 18 }}>
              <div>
                <label style={label}>Product name</label>
                <input style={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. TrailSync" />
              </div>
              <div>
                <label style={label}>One-line pitch</label>
                <input style={input} value={pitch} onChange={(e) => setPitch(e.target.value)} placeholder="What it is and who it's for, in a sentence" />
              </div>
              <div>
                <label style={label}>Use cases & product notes</label>
                <textarea style={{ ...input, minHeight: 240, resize: "vertical", lineHeight: 1.6 }} value={useCases} onChange={(e) => setUseCases(e.target.value)} placeholder={"- As a user I can…\n- The system should…\n- Edge case: …\n\nAnything goes: features, constraints, integrations, monetization, gut feelings."} />
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <Btn onClick={genPRD} disabled={busy || !name.trim() || !useCases.trim()}>Draft the PRD →</Btn>
                {busy && <Spinner label="Writing the PRD from your notes…" />}
              </div>
            </div>
          </div>
        )}

        {/* ---------- PRD ---------- */}
        {stage === "prd" && (
          <div style={sheet}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 26, color: C.ink }}>Product requirements</div>
              <Btn onClick={genArch} disabled={busy || !prd}>Design the architecture →</Btn>
            </div>
            {busy && !prd && <Spinner label="Writing the PRD…" />}
            {busy && prd && <Spinner label="Drafting the architecture from this PRD…" />}
            <DocPanel title="PRD.md" doc={prd} onChange={setPrd} onRegenerate={genPRD} busy={busy} />
          </div>
        )}

        {/* ---------- ARCH ---------- */}
        {stage === "arch" && (
          <div style={sheet}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 26, color: C.ink }}>Architecture</div>
              <Btn onClick={genQuestions} disabled={busy || !arch}>Interview me →</Btn>
            </div>
            {busy && <Spinner label={arch ? "Finding the questions that matter…" : "Designing the system…"} />}
            <DocPanel title="ARCHITECTURE.md" doc={arch} onChange={setArch} onRegenerate={genArch} busy={busy} />
          </div>
        )}

        {/* ---------- INTERVIEW ---------- */}
        {stage === "interview" && (
          <div style={sheet}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 26, color: C.ink, marginBottom: 6 }}>Close the open questions</div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: C.inkSoft, margin: "0 0 22px", maxWidth: 620, lineHeight: 1.6 }}>
              These are the decisions the design can't make for you. Answer what you can — skip anything and the current assumption stands. Your answers get folded back into both documents.
            </p>
            {busy && !refined && questions.length === 0 && <Spinner label="Reading both docs for weak spots…" />}
            <div style={{ display: "grid", gap: 14 }}>
              {questions.map((q, idx) => (
                <div key={q.id} style={{ background: "#FFF", border: `1px solid ${C.sheetEdge}`, borderRadius: 8, padding: "16px 18px" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 12, color: C.amber, background: C.cobaltDeep, borderRadius: 4, padding: "3px 7px", flexShrink: 0 }}>Q{idx + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14.5, color: C.ink, lineHeight: 1.5 }}>{q.question}</div>
                      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.inkSoft, margin: "4px 0 10px" }}>{q.why}</div>
                      <textarea
                        style={{ ...input, minHeight: 60, resize: "vertical", fontSize: 13.5 }}
                        placeholder="Your call… (leave blank to keep the assumption)"
                        value={answers[q.id] || ""}
                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {questions.length > 0 && (
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 22 }}>
                <Btn onClick={applyAnswers} disabled={busy}>{refined ? "Re-apply answers" : "Fold answers into the design"}</Btn>
                {refined && !busy && <Btn kind="dark" onClick={genKit}>Generate the context kit →</Btn>}
                {refined && !busy && <Tag color={C.green}>docs updated</Tag>}
                {busy && <Spinner label="Revising the PRD and architecture…" />}
              </div>
            )}
          </div>
        )}

        {/* ---------- KIT ---------- */}
        {stage === "kit" && (
          <div style={{ ...sheet, maxWidth: 1020 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6, flexWrap: "wrap", gap: 10 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 26, color: C.ink }}>Context kit</div>
              <div style={{ display: "flex", gap: 8 }}>
                {Object.keys(files).length > 0 && <Btn small kind="ghost" onClick={downloadInstallScript}>Download install script</Btn>}
                {Object.keys(files).length > 0 && <Btn small kind="ghost" onClick={genKit} disabled={busy}>Regenerate kit</Btn>}
                {Object.keys(files).length === 0 && !busy && <Btn onClick={genKit}>Generate {ANCHORS[anchor].path} + .mex/</Btn>}
              </div>
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: C.inkSoft, margin: "0 0 18px", maxWidth: 680, lineHeight: 1.6 }}>
              A mex-style repo wiki: a small <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{ANCHORS[anchor].path}</code> anchor that routes agents through <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>.mex/ROUTER.md</code> to task-relevant context. Drop the files into your repo root (the install script does it in one shot), then run <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>npx mex-agent setup</code> if you want the graph + drift checks on top.
            </p>
            {kitProgress && <Spinner label={`Drafting ${kitProgress.path} (${kitProgress.i}/${kitProgress.n})…`} />}
            {Object.keys(files).length > 0 && (
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ width: 268, minWidth: 268, background: C.cobaltDeep, borderRadius: 8, padding: "12px 0", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                  {kitSpecs().map((s) => {
                    const ready = !!files[s.path];
                    const active = selFile === s.path;
                    return (
                      <div
                        key={s.path}
                        onClick={() => ready && setSelFile(s.path)}
                        style={{ padding: "7px 16px", color: !ready ? C.cobaltLine : active ? C.amber : C.chalk, cursor: ready ? "pointer" : "default", background: active ? "#FFFFFF10" : "transparent", whiteSpace: "nowrap", overflow: "hidden", textOverflowEllipsis: "ellipsis", display: "flex", justifyContent: "space-between", gap: 8 }}
                      >
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{s.path.includes("/") ? "  " : ""}{s.path}</span>
                        <span>{ready ? "●" : "○"}</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {selFile && files[selFile] && (
                    <div style={{ background: "#FFF", border: `1px solid ${C.sheetEdge}`, borderRadius: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: `1px solid ${C.sheetEdge}` }}>
                        <Tag>{selFile}</Tag>
                        <div style={{ display: "flex", gap: 8 }}>
                          <Btn small kind="ghost" onClick={() => navigator.clipboard?.writeText(files[selFile])}>Copy</Btn>
                          <Btn small onClick={() => download(selFile.split("/").pop(), files[selFile])}>Download</Btn>
                        </div>
                      </div>
                      <pre style={{ margin: 0, padding: "16px 20px", fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, lineHeight: 1.6, color: C.ink, whiteSpace: "pre-wrap", maxHeight: 520, overflowY: "auto" }}>{files[selFile]}</pre>
                    </div>
                  )}
                </div>
              </div>
            )}
            {Object.keys(files).length === 0 && !busy && (
              <div style={{ border: `1.5px dashed ${C.sheetEdge}`, borderRadius: 8, padding: "40px 20px", textAlign: "center", fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: C.inkSoft }}>
                Nine files, drafted from your finalized PRD, architecture, and interview answers.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ---------- SETTINGS DRAWER ---------- */}
      {settingsOpen && (
        <div onClick={() => setSettingsOpen(false)} style={{ position: "fixed", inset: 0, background: "#0E215866", zIndex: 20, display: "flex", justifyContent: "flex-end" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 360, background: "#FFF", height: "100%", padding: "28px 26px", boxSizing: "border-box", overflowY: "auto", boxShadow: "-8px 0 30px rgba(14,33,88,0.25)" }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 20, color: C.ink, marginBottom: 20 }}>Settings</div>
            <div style={{ display: "grid", gap: 20 }}>
              <div>
                <label style={label}>Anthropic API key</label>
                <input
                  type="password"
                  style={{ ...input, fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5 }}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-ant-…"
                />
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: C.inkSoft, marginTop: 6, lineHeight: 1.5 }}>
                  Kept in memory only — cleared on refresh, never sent anywhere except api.anthropic.com. Get a key at console.anthropic.com.
                </div>
              </div>
              <div>
                <label style={label}>Model</label>
                <select style={{ ...input }} value={model} onChange={(e) => setModel(e.target.value)}>
                  {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label style={label}>Target coding agent (anchor file)</label>
                <select style={{ ...input }} value={anchor} onChange={(e) => setAnchor(e.target.value)}>
                  {Object.entries(ANCHORS).map(([k, v]) => <option key={k} value={k}>{v.label} → {v.path}</option>)}
                </select>
              </div>
              <div>
                <label style={label}>Standing instructions</label>
                <textarea style={{ ...input, minHeight: 110, resize: "vertical", fontSize: 13 }} value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Applied to every generation. e.g. 'Default to TypeScript + Postgres. I ship solo, keep infra minimal. B2B SaaS pricing.'" />
              </div>
              <Btn onClick={() => setSettingsOpen(false)}>Done</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
