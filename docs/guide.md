---
layout: default
title: "Design Guidance"
parent: "Apps"
nav_order: 1
---

# LLM System Design Guidance

{: .important }
> Leverage LLMs to help with design and implementation wherever possible, including Node-based flows managed by `pocket.ts`.

1. **Understand Requirements**  
   - Clarify the app's tasks and overall workflow.  
   - Determine how data will be accessed (e.g., from files, APIs, or databases).  
   - Specify the type definitions/interfaces you will need in TypeScript.

2. **High-Level Flow Design**  
   - Represent the process as a *Directed Graph of Nodes* (or sub-Flows) in TypeScript.  
     - For instance, define each step as a class extending `BaseNode` from `pocket.ts`.  
   - Identify branching logic based on the **Action** returned from each Node's `postAsync()`.  
   - Use *Batch* or *Async* flows when dealing with large data sets or asynchronous calls, respectively.

3. **Shared Memory Structure**  
   - Decide how you will store and mutate data within `sharedState`.  
   - For small apps, an in-memory JavaScript/TypeScript object is sufficient.  
   - For larger or persistent requirements, integrate a database driver or external service.  
   - Clearly define your data schema or object structure (TypeScript interfaces or types can help).

4. **Implementation**  
   - Use LLMs for coding tasks (e.g., generating Node classes, writing prompts, or building TypeScript types).  
   - Start with a **Flow** that orchestrates your nodes.  
   - Keep code minimal and straightforward initially:
     ```typescript
     import { BaseNode, Flow, DEFAULT_ACTION } from "../src/pocket";

     class ExampleNode extends BaseNode {
       public async prepAsync(sharedState: any): Promise<void> {
         // Prepare data or transform sharedState here
       }
       public async execAsync(_: void): Promise<void> {
         // Actual Node logic or external API call
       }
       public async postAsync(sharedState: any, prepResult: any, execResult: any): Promise<string> {
         // Decide which Action to return
         return DEFAULT_ACTION;
       }
     }

     const nodeA = new ExampleNode();
     const nodeB = new ExampleNode();
     nodeA.addSuccessor(nodeB, DEFAULT_ACTION);

     const flow = new Flow(nodeA);
     flow.runAsync({ /* initial shared state */ })
         .then(() => console.log("Flow completed"))
         .catch(err => console.error("Flow error:", err));
     ```

5. **Optimization**  
   - **Prompt Engineering**: Provide clear instructions, inputs, and examples to the LLM for more reliable responses.  
   - **Task Decomposition**: If tasks grow complex, break them down into more Node classes or sub-Flows. Each Node can handle a smaller part of the overall process.

6. **Reliability**  
   - **Structured Output**: Ensure you validate the LLM's structured output (e.g., JSON or YAML). Consider libraries like `js-yaml` or `ajv` for robust parsing or validation.  
   - **Test Cases**: Create tests that run each Node independently (`node.runAsync()`) and/or run entire flows (`flow.runAsync()`) with well-defined inputs to confirm correctness.  
   - **Self-Evaluation**: For ambiguous or critical tasks, insert a Node that calls the LLM to review or check prior results within `sharedState` before continuing to the next stage.
