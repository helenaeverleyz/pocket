---
layout: default
title: "Home"
nav_order: 1
---

# Pocket Flow

A TypeScript framework for building **LLM-powered applications** with:
- 🤖 Intelligent Agents
- 🧩 Task Decomposition
- 📚 Retrieval Augmented Generation (RAG)
- And more...

## Architecture

We model LLM workflows as a **Nested Directed Graph** where:

- 🔹 **Nodes** handle atomic LLM tasks
- 🔗 **Actions** connect nodes (labeled edges) for agent behavior
- 🔄 **Flows** orchestrate node graphs for task decomposition
- 📦 **Nesting** allows flows to be used as nodes
- 📊 **Batch** processing for data-intensive tasks
- ⚡ **Async** support for parallel execution

<div align="center">
  <img src="https://github.com/the-pocket/PocketFlow/raw/main/assets/minillmflow.jpg?raw=true" width="400"/>
</div>

---

## Getting Started

- [Quick Start](./guide.md)
- [Setup Steps](./preparation.md)
- [Key Abstractions](./core_abstraction.md)

## Core Concepts

- [Agent Basics](./agent.md)
- [Node Fundamentals](./node.md)
- [Understanding Flows](./flow.md)
- [Data Structures](./structure.md)

## Features & Extensions

### Basic Features
- [Async Processing](./async.md)
- [Batch Operations](./batch.md)
- [Communication Patterns](./communication.md)
- [Task Decomposition](./decomp.md)

### Advanced Capabilities
- [Large Language Models](./llm.md)
- [MapReduce Workflows](./mapreduce.md)
- [Memory & Caching](./memory.md)
- [Multi-Agent Systems](./multi_agent.md)
- [Parallel Execution](./parallel.md)
- [Retrieval Augmented Generation](./rag.md)
- [Tool Integrations](./tool.md)

## Additional Resources

- [Sample Applications](./apps.md)
- [Conceptual Paradigms](./paradigm.md)
- [Visualizations](./viz.md)

---

<div align="center">
  <p><i>Built with TypeScript for production-grade LLM applications</i></p>
</div>

