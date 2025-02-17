![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
[![Docs](https://img.shields.io/badge/docs-latest-blue)](https://helenaeverleyz.github.io/pocket/)

# Pocket: A Human-AI Co-Design Platform for AI Systems

> Build enterprise-ready AI systems—fast, modular, and vendor-agnostic.

A [typescript](pocket/src/pocket.ts) LLM framework for [Multi-Agents](https://helenaeverleyz.github.io/pocket/multi_agent/), [Agents](https://helenaeverleyz.github.io/pocket/agent/), [Prompt Chaining](https://the-pocket.github.io/PocketFlow/decomp.html), [RAG](https://helenaeverleyz.github.io/pocket/rag/), etc.
- Install via  ```pip install pocket```, or just copy the [source codes](pocket/src/pocket.ts)
---

## Why Pocket?
Modern enterprises need automation—yet a single LLM call rarely cuts it. Complex tasks require multiple AI calls, external APIs, and iterative refinement. Traditional “all-in-one” AI frameworks often lock you in or can’t handle evolving requirements. **The Pocket** focuses on **human-AI co-design**: 
- **Humans** specify goals, constraints, and domain expertise.
- **AI** does the heavy lifting (workflow design, optimization, and integration).

---

## Pocket Features
- **Nested Directed Graph**  
  Each “node” is a simple, reusable unit. Chain them to create complex workflows like multi-agent orchestration or retrieval-augmented generation.
- **No Vendor Lock-In**  
  Integrate any LLM or API without specialized wrappers or config. 
- **Built for Debuggability**  
  Visualize workflows, add logs, handle state persistence, and incorporate human feedback loops.

---

## Human-AI Co-Design Flow
1. **Requirements**: Humans define tasks, success criteria, and target APIs.  
2. **System Design**: AI drafts architecture (nodes, workflows), then checks in for feedback.  
3. **Prototyping & Evaluation**: AI builds a quick prototype; humans provide sample inputs & judge outputs.  
4. **Optimization**: AI refines the system, integrates domain-specific logic, and extends components as needed.  
5. **Deployment**: AI helps write error-handling code, set up monitoring, and ensure the system runs reliably in production.

---

## Why Not Full Automation?
- **Limited Search Space**: Fully automated optimizers can’t easily handle custom tools, new APIs, or fuzzy requirements.  
- **Ambiguity is Real**: Business goals often shift mid-project. Human insight is crucial to keep AI systems on track.

---

| Framework      | Computation Models | Communication Models | App-Specific Models                                    | Vendor-Specific Models                                   | Lines Of Codes            | Package + Dependency Size         |
|:--------------:|:------------------:|:--------------------:|:-------------------------------------------------------:|:--------------------------------------------------------:|:-----------------:|:---------------------------:|
| LangChain      | Agent, Chain       | Message              | Many                       | Many                          | *405K*            | *+166MB*                    |
| CrewAI         | Agent, Chain       | Message, Shared      | Many              | Many               | *18K*             | *+173MB*                    |
| SmolAgent      | Agent              | Message              | Some              | Some              | *8K*              | *+198MB*                    |
| LangGraph      | Agent, Graph       | Message, Shared      | Some                          | Some                  | *37K*             | *+51MB*                     |
| AutoGen        | Agent              | Message              | Some                   | Many             | *7K*  | *+26MB*         |
| **PocketFlow** | **Graph**          | **Shared**           | **None**                                                | **None**                                                | **100**           | **+56KB**                   |

---

## Get Started
1. **Clone the Repo**  
   ```bash
   git clone https://github.com/helenaeverleyz/pocket.git
   cd pocket
