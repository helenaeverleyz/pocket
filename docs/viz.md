---
layout: default
title: "Viz and Debug"
parent: "Details"
nav_order: 3
---

# Visualization and Debugging

Similar to LLM wrappers, we **don't** provide built-in visualization or debugging. Below are *minimal* examples that can serve as a starting point for your own tooling.

## 1. Visualization with Mermaid

The following TypeScript code *recursively* traverses your Nodes (and Flows, if you have them) to generate a **Mermaid** diagram syntax. It assigns unique IDs to each node, treats Flows as subgraphs, and creates edges (`-->`) between nodes.

```typescript
import { BaseNode, Flow } from "../src/pocket";

/**
 * buildMermaid
 *
 * Recursively walks through a Flow or Node hierarchy
 * and returns a Mermaid "graph LR" diagram in string form.
 *
 * Assumes each Node has a "successors" property (Map<string, BaseNode>)
 * and each Flow might have "start" and (optionally) "successors" or sub-Flows.
 */
export function buildMermaid(start: BaseNode | Flow): string {
  const lines: string[] = ["graph LR"];
  const visited = new Set<any>();
  const nodeIds = new Map<any, string>();
  let counter = 1;

  function getNodeId(obj: any): string {
    if (!nodeIds.has(obj)) {
      nodeIds.set(obj, `N${counter}`);
      counter++;
    }
    return nodeIds.get(obj)!;
  }

  // A small helper to record "A --> B" in the diagram
  function link(aId: string, bId: string): void {
    lines.push(`    ${aId} --> ${bId}`);
  }

  // Attempt to retrieve a name for object (Node or Flow)
  function getObjName(obj: any): string {
    return obj?.constructor?.name || "Unknown";
  }

  function walk(current: any, parentId?: string): void {
    if (visited.has(current)) {
      // Already visited, just link them if we have a parent
      if (parentId) {
        link(parentId, getNodeId(current));
      }
      return;
    }
    visited.add(current);

    if (current instanceof Flow) {
      // If it's a Flow, represent it as a subgraph
      const flowId = getNodeId(current);
      const flowName = getObjName(current);
      lines.push(`\n    subgraph sub_flow_${flowId}[${flowName}]`);

      // If the Flow has a "start" node, link from parent to start
      if (current.start) {
        if (parentId) {
          // Connect the parent to the start node
          link(parentId, getNodeId(current.start));
        }
        // Recursively visit the flow's start node
        walk(current.start, undefined);
      }

      // If the Flow has its own successors logic, handle that here
      // In many frameworks, a Flow might not have direct "successors"
      // but may embed sub-nodes or sub-flows. Adapt to your structure.

      // End subgraph
      lines.push(`    end\n`);
    } else if (current instanceof BaseNode) {
      // It's a Node
      const nodeId = getNodeId(current);
      const nodeName = getObjName(current);
      lines.push(`    ${nodeId}["${nodeName}"]`);

      // Link from parent
      if (parentId) {
        link(parentId, nodeId);
      }

      // Recursively traverse this node's successors
      // Assume a "successors" Map<string, BaseNode> on your Node
      if (current.successors) {
        for (const nxt of current.successors.values()) {
          walk(nxt, nodeId);
        }
      }
    } else {
      // Unrecognized node type
      // Might be an error or a data object
      // You could skip or throw an error
    }
  }

  walk(start);
  return lines.join("\n");
}
```

### Example Usage

```typescript
import { BaseNode, Flow } from "../src/pocket";
import { buildMermaid } from "./buildMermaidSnippet"; // your file location

class DataPrepBatchNode extends BaseNode {}
class ValidateDataNode extends BaseNode {}
class FeatureExtractionNode extends BaseNode {}
class TrainModelNode extends BaseNode {}
class EvaluateModelNode extends BaseNode {}
class ModelFlow extends Flow {}
class DataScienceFlow extends Flow {}

const featureNode = new FeatureExtractionNode();
const trainNode = new TrainModelNode();
const evaluateNode = new EvaluateModelNode();
featureNode.addSuccessor(trainNode, "default");
trainNode.addSuccessor(evaluateNode, "default");

const modelFlow = new ModelFlow(featureNode);

const dataPrepNode = new DataPrepBatchNode();
const validateNode = new ValidateDataNode();
dataPrepNode.addSuccessor(validateNode, "default");
validateNode.addSuccessor(modelFlow, "default");

const dataScienceFlow = new DataScienceFlow(dataPrepNode);

// Build a mermaid diagram
const mermaidSyntax = buildMermaid(dataScienceFlow);
console.log("Mermaid diagram:\n", mermaidSyntax);
```

You might get output like:

```
graph LR
    subgraph sub_flow_N1[DataScienceFlow]
    N2["DataPrepBatchNode"]
    N3["ValidateDataNode"]
    N2 --> N3
    subgraph sub_flow_N4[ModelFlow]
    N5["FeatureExtractionNode"]
    N6["TrainModelNode"]
    N5 --> N6
    N7["EvaluateModelNode"]
    N6 --> N7
    end

    N3 --> N4
    end
```

Which can be rendered as a **Mermaid** diagram.

## 2. Call Stack Debugging

In Node.js/TypeScript, you don't typically have direct access to Python's `inspect` module or frames. However, you *can* capture stack traces by creating an `Error` object and analyzing its `.stack` property, or simply log your Node transitions in `prepAsync`, `execAsync`, or `postAsync` with relevant info.

### Example Stack Capture

```typescript
/**
 * getNodeCallStack
 *
 * Minimal demonstration of capturing a call stack in Node.js.
 * This does NOT necessarily show each Node in the call chain,
 * but it can let you see the file and line references.
 */
export function getNodeCallStack(): string[] {
  // Create a new error to capture the stack
  const err = new Error("Stack capture");
  const lines = err.stack ? err.stack.split("\n").slice(2) : [];
  return lines.map((line) => line.trim());
}

// Example usage in a Node:
import { BaseNode } from "../src/pocket";

class EvaluateModelNode extends BaseNode {
  public async prepAsync(sharedState: any): Promise<void> {
    const stack = getNodeCallStack();
    console.log("Call stack lines:\n", stack.join("\n"));
  }
}
```

**Note**: This will show you the JS/TS call stack at the moment. If you want to track which Nodes have been called so far, a simpler approach is to maintain a **custom log** in `sharedState` (or a global logger) and push an entry each time a Node is `prep`-ed, `exec`-ed, or `post`-ed. Then you can see the node call chain in the order they were invoked.

## Summary

- **Mermaid Visualization**: The snippet above traverses flows and nodes to output a simple `graph LR` diagram. Customize it to reflect your actual Node/Flow structures or more advanced sub-flow logic.  
- **Call Stack Debugging**: In TypeScript, using `Error().stack` is one approach, though typically you might prefer structured logs or events to track your node transitions.  

Combined, these can help you better **understand and debug** complex multi-node flows in `pocket.ts`.




