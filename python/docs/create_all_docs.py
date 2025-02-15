import os

docs = {
    "index.md": "# Overview\n\nWelcome to Pocket Flow - a minimalist LLM Framework in 100 lines that enables LLMs to program themselves.",
    "agent.md": "# Agent\n\nDocumentation for the Agent component.",
    "core_abstraction.md": "# Core Abstraction\n\nDocumentation for core abstractions in Pocket Flow.",
    "llm.md": "# LLM\n\nDocumentation for LLM integration and usage.",
    "mapreduce.md": "# MapReduce\n\nDocumentation for MapReduce functionality.",
    "node.md": "# Node\n\nDocumentation for the Node component.",
    "paradigm.md": "# Paradigm\n\nDocumentation for Pocket Flow's programming paradigm.",
    "preparation.md": "# Preparation\n\nDocumentation for setup and preparation.",
    "rag.md": "# RAG\n\nDocumentation for Retrieval-Augmented Generation (RAG)."
}

# Get the directory where this script is located
current_dir = os.path.dirname(os.path.abspath(__file__))

for filename, content in docs.items():
    file_path = os.path.join(current_dir, filename)
    with open(file_path, 'w') as f:
        f.write(content)
    print(f"Created {filename}") 