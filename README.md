# brainchild_

**idea → PRD → architecture → interview → context kit**

You have a messy idea. Brainchild turns it into the documents an AI coding agent actually needs to build the thing — without you writing a spec from scratch.

Dump use cases the way you would in a late-night chat. Brainchild drafts a PRD, designs the architecture, interviews you on the decisions that still matter, then writes a [mex](https://github.com/mex-memory/mex)-style wiki you can drop into a repo and start shipping.

```
  SPARK ──► PRD ──► ARCHITECTURE ──► INTERVIEW ──► CONTEXT KIT
  notes     spec     system design     close gaps    CLAUDE.md + .mex/
```

## What you get

Five sheets, one sitting:

| Stage | What happens |
| --- | --- |
| **Spark** | Name, one-line pitch, raw use-case notes. Messy is the point. |
| **PRD** | A full product requirements doc — goals, non-goals, personas, MUST/SHOULD/COULD, metrics, risks. |
| **Architecture** | Stack, components, ASCII diagram, data model, API surface, tradeoffs. Opinionated on purpose. |
| **Interview** | Five questions the design cannot answer for you. Your answers fold back into both docs. |
| **Context kit** | A small always-loaded anchor plus a routed `.mex/` wiki. Agents must log completed work and keep those files current. |

The kit is written for agents, not humans. Declarative. High signal per token. No `[insert here]`.

### The kit

Pick your coding agent in Settings. Brainchild writes the matching anchor and routes everything else through `.mex/`:

```
CLAUDE.md                  (or .cursorrules / AGENTS.md / …)
.mex/
  AGENTS.md
  ROUTER.md
  context/
    architecture.md
    stack.md
    setup.md
    decisions.md
    conventions.md
    changelog.md
  patterns/
    INDEX.md
```

The kit tells agents that a task is not finished until context is current: append `.mex/context/changelog.md`, then update any architecture, stack, setup, decisions, conventions, or patterns the work made stale. Major tasks (features, API or data-model changes, infra) always require write-back.

Download the install script, run it from your project root, and the files land in place. Optionally follow with `npx mex-agent setup` if you want graph + drift checks on top.

Anchors supported: Claude Code, Cursor, Codex, Windsurf, GitHub Copilot.

## Run it

```bash
npm install
npm run dev
```

Open the app, go to **Settings**, paste an [Anthropic API key](https://console.anthropic.com). It lives in memory only — cleared on refresh, never written to disk, sent only to `api.anthropic.com`.

Then start with the raw idea.

```bash
npm run build     # production bundle
npm run preview   # serve the build
npm run lint      # oxlint
```

## How a session feels

1. Write the product name, a sentence of pitch, and the use cases you already have in your head.
2. Draft the PRD. Edit anything that came out wrong. Regenerate if the whole take is off.
3. Design the architecture from that PRD. Same: edit or regenerate.
4. Answer the interview — or skip a question and keep the assumption.
5. Generate the kit. Copy a file, download one, or take the install script for all of them.

**Save project** writes a `.brainchild.json` you can reopen later. The API key is never in that file.

Standing instructions in Settings (stack preferences, solo-founder constraints, pricing model) apply to every generation.

## Stack

React 19 + Vite. One component, no backend. Claude does the writing; the browser holds the session.

Default model is Claude Sonnet 4.6. Opus if you want it deeper. Haiku if you want it cheap.

## Why this exists

A good coding agent is only as good as the context you give it. Most of us start with a paragraph and a hope. Brainchild is the missing hour between “I have an idea” and “the agent knows the product.”

Sheet no. 00 / 05 · Rev A
