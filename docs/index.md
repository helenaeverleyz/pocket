---
layout: default
title: "Home"
nav_order: 1
---

# Pocket Flow

An (https://github.com/helenaeverleyz/pocket) LLM framework for *Agents, Task Decomposition, RAG, etc*.


We model the LLM workflow as a **Nested Directed Graph**:
- **Nodes** handle simple (LLM) tasks.
- Nodes connect through **Actions** (labeled edges) for *Agents*.  
- **Flows** orchestrate a directed graph of Nodes for *Task Decomposition*.
- A Flow can be used as a Node (for **Nesting**).
- **Batch** Nodes/Flows for data-intensive tasks.
- **Async** Nodes/Flows allow waits or **Parallel** execution


<div align="center">
  <img src="https://github.com/the-pocket/PocketFlow/raw/main/assets/minillmflow.jpg?raw=true" width="400"/>
</div>

## Core Abstraction

- [Node](./node.md)
- [Flow](./flow.md)
- [Communication](./communication.md)
- [Batch](./batch.md)
- [(Advanced) Async](./async.md)
- [(Advanced) Parallel](./parallel.md)

## Low-Level Details

- [LLM Wrapper](./llm.md)
- [Tool](./tool.md)
- [Viz and Debug](./viz.md)
- Chunking

## High-Level Paradigm

- [Structured Output](./structure.md)
- [Task Decomposition](./decomp.md)
- [Map Reduce](./mapreduce.md)
- [RAG](./rag.md)
- [Chat Memory](./memory.md)
- [Agent](./agent.md)
- [(Advanced) Multi-Agents](./multi_agent.md)

## Example LLM Apps

[LLM System Design Guidance](./guide.md)

