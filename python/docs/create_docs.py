import os

# Get the directory where this script is located
current_dir = os.path.dirname(os.path.abspath(__file__))

pages = [
    "index.md",
    "agent.md",
    "async.md",
    "batch.md",
    "communication.md",
    "decomp.md",
    "flow.md",
    "guide.md",
    "llm.md",
    "mapreduce.md",
    "memory.md",
    "multi_agent.md",
    "node.md",
    "parallel.md",
    "rag.md",
    "structure.md",
    "tool.md",
    "viz.md"
]

for page in pages:
    file_path = os.path.join(current_dir, page)
    if not os.path.exists(file_path):
        title = page.replace('.md', '').replace('_', ' ').title()
        content = f"""# {title}

## Overview

{title} documentation. This page is under construction.

## Features

- Feature 1
- Feature 2
- Feature 3

## Usage

Example usage will be documented here.

## API Reference

Coming soon...
"""
        with open(file_path, 'w') as f:
            f.write(content)
        print(f"Created {page}")
    else:
        print(f"File {page} already exists") 