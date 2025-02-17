---
layout: default
title: "Batch"
parent: "Core Abstraction"
nav_order: 4
---

# Batch

**Batch** makes it easier to handle large inputs in one Node or **rerun** a Flow multiple times. Handy for:
- **Chunk-based** processing (e.g., splitting large texts).
- **Multi-file** processing.
- **Iterating** over lists of params (e.g., user queries, documents, URLs).

## 1. BatchNode

A **BatchNode** extends `BaseNode` but changes `prepAsync()` and `execAsync()`:

- **`prepAsync(shared)`**: returns an **iterable** (e.g., array, generator).
- **`execAsync(item)`**: called **once** per item in that iterable.
- **`postAsync(shared, prepResult, execResultList)`**: after all items are processed, receives a **list** of results (`execResultList`) and returns an **Action**.

### Example: Summarize a Large File

```typescript
import { BaseNode, Flow, DEFAULT_ACTION } from "../src/pocket";

// Placeholder for an asynchronous file read
async function readFileAsync(filePath: string): Promise<string> {
  const fs = await import('fs/promises');
  return await fs.readFile(filePath, 'utf-8');
}

// Placeholder for an asynchronous LLM call
async function callLLMAsync(prompt: string): Promise<string> {
  // Example function to call a Large Language Model asynchronously
  // Replace with actual implementation
  return `Summary: ${prompt.substring(0, 50)}...`;
}

export class MapSummaries extends BaseNode {
  // The 'prepAsync' method asynchronously prepares chunks of the large text
  public async prepAsync(sharedState: any): Promise<string[]> {
    const content = sharedState.data["large_text.txt"] || "";
    const chunkSize = 10000;
    const chunks = [];
    for (let i = 0; i < content.length; i += chunkSize) {
      chunks.push(content.substring(i, i + chunkSize));
    }
    return chunks;
  }

  // The 'execAsync' method asynchronously summarizes each chunk
  public async execAsync(chunk: string): Promise<string> {
    const prompt = `Summarize this chunk in 10 words: ${chunk}`;
    const summary = await callLLMAsync(prompt);
    return summary;
  }

  // The 'postAsync' method combines all summaries and updates the shared state
  public async postAsync(sharedState: any, prepResult: string[], execResultList: string[]): Promise<string> {
    const combined = execResultList.join("\n");
    sharedState.summary["large_text.txt"] = combined;
    return DEFAULT_ACTION;
  }
}

// Instantiate the node
const mapSummaries = new MapSummaries();

// Create a Flow starting with the BatchNode
const flow = new Flow(mapSummaries);

// Run the flow with initial shared state
flow.run({
  data: {
    "large_text.txt": "Your very large text content goes here..."
  },
  summary: {}
});
```

---

## 2. BatchFlow

A **BatchFlow** runs a **Flow** multiple times, each time with different `params`. Think of it as a loop that replays the Flow for each parameter set.

### Example: Summarize Many Files

```typescript
import { BaseNode, BatchFlow, Flow, DEFAULT_ACTION } from "../src/pocket";

// Placeholder for loading a file
async function loadFileAsync(filename: string): Promise<string> {
  const fs = await import('fs/promises');
  return await fs.readFile(filename, 'utf-8');
}

// Placeholder for an asynchronous summarization
async function summarizeAsync(content: string): Promise<string> {
  // Replace with actual summarization logic
  return `Summary of ${content.substring(0, 20)}...`;
}

export class LoadFile extends BaseNode {
  public async prepAsync(sharedState: any): Promise<string> {
    return sharedState.filename;
  }

  public async execAsync(filename: string): Promise<string> {
    const content = await loadFileAsync(filename);
    return content;
  }

  public async postAsync(sharedState: any, prepResult: string, execResult: string): Promise<string> {
    sharedState.currentContent = execResult;
    return "summarize";
  }
}

export class SummarizeFile extends BaseNode {
  public async prepAsync(sharedState: any): Promise<string> {
    return sharedState.currentContent;
  }

  public async execAsync(content: string): Promise<string> {
    const summary = await summarizeAsync(content);
    return summary;
  }

  public async postAsync(sharedState: any, prepResult: string, execResult: string): Promise<string> {
    sharedState.summaries[sharedState.filename] = execResult;
    return DEFAULT_ACTION;
  }
}

// Define the per-file Flow
const loadFileNode = new LoadFile();
const summarizeFileNode = new SummarizeFile();

loadFileNode.addSuccessor(summarizeFileNode, "summarize");
const fileFlow = new Flow(loadFileNode);

// Define the BatchFlow that iterates over each file
export class SummarizeAllFiles extends BatchFlow {
  public async prepAsync(sharedState: any): Promise<{ filename: string }[]> {
    const filenames = Object.keys(sharedState.data);
    return filenames.map(fn => ({ filename: fn }));
  }

  public async execAsync(params: { filename: string }): Promise<void> {
    // Merge current params with shared state
    const mergedState = { ...sharedState, ...params };
    await fileFlow.run(mergedState);
    // Update shared state with summaries
    sharedState.summaries = sharedState.summaries || {};
    sharedState.summaries[params.filename] = mergedState.summaries[params.filename];
  }

  public async postAsync(sharedState: any, prepResult: { filename: string }[], execResultList: void[]): Promise<string> {
    console.log("All files summarized.");
    return DEFAULT_ACTION;
  }
}

// Instantiate the BatchFlow
const summarizeAllFiles = new SummarizeAllFiles();

// Run the BatchFlow with initial shared state
summarizeAllFiles.run({
  data: {
    "file1.txt": "Content of file 1...",
    "file2.txt": "Content of file 2...",
    // Add more files as needed
  },
  summaries: {}
});
```

### Under the Hood

1. **`prepAsync(shared)`** returns a list of parameter objects—e.g., `[{ filename: "file1.txt" }, { filename: "file2.txt" }, ...]`.
2. The **BatchFlow** iterates through each parameter set. For each one:
   - It merges the parameter with the BatchFlow’s own `sharedState`.
   - It executes the `fileFlow` (which loads and summarizes the file).
3. After processing all files, the **`postAsync`** method logs that all files have been summarized.

---

## 3. Nested or Multi-Level Batches

You can nest a **BatchFlow** within another **BatchFlow**. For example:
- **Outer BatchFlow**: Processes directories, returning parameter sets like `{"directory": "/pathA"}`, `{"directory": "/pathB"}`, etc.
- **Inner BatchFlow**: Processes files within each directory, returning parameter sets like `{"filename": "file1.txt"}`, `{"filename": "file2.txt"}`, etc.

At each level, **BatchFlow** merges its own parameters with the parent’s. By the time you reach the innermost node, the final `params` are a merged result of **all** parent parameter sets, allowing the flow to maintain the entire context (e.g., directory + filename) seamlessly.

```typescript
import { BaseNode, BatchFlow, Flow, DEFAULT_ACTION } from "../src/pocket";

// Reuse LoadFile and SummarizeFile from the previous example

// New BatchFlow for processing directories
export class DirectoryBatchFlow extends BatchFlow {
  public async prepAsync(sharedState: any): Promise<{ directory: string }[]> {
    // Example directories; replace with actual logic to list directories
    const directories = ["/path/to/dirA", "/path/to/dirB"];
    return directories.map(dir => ({ directory: dir }));
  }

  public async execAsync(params: { directory: string }): Promise<void> {
    // Merge current params with shared state
    const mergedState = { ...sharedState, ...params };
    // Here you could instantiate another BatchFlow for files within the directory
    // For simplicity, let's assume files are statically defined
    mergedState.data = {
      "file1.txt": "Content of file1 in dirA...",
      "file2.txt": "Content of file2 in dirA...",
      // Add more files as needed
    };
    const summarizeAllFiles = new SummarizeAllFiles();
    await summarizeAllFiles.run(mergedState);
    // Update shared state with summaries
    sharedState.summaries = { ...sharedState.summaries, ...mergedState.summaries };
  }

  public async postAsync(sharedState: any, prepResult: { directory: string }[], execResultList: void[]): Promise<string> {
    console.log("All directories processed.");
    return DEFAULT_ACTION;
  }
}

// Instantiate the outer BatchFlow
const directoryBatchFlow = new DirectoryBatchFlow();

// Run the nested BatchFlow with initial shared state
directoryBatchFlow.run({
  summaries: {}
});
```

**Explanation:**
- **`DirectoryBatchFlow`**:
  - **`prepAsync(shared)`**: Provides a list of directories to process.
  - **`execAsync(params)`**: For each directory, it sets up the files to summarize and invokes the **`SummarizeAllFiles`** BatchFlow.
  - **`postAsync(shared, prepResult, execResultList)`**: Logs completion after all directories are processed.

- This nested approach allows you to manage complex processing tasks efficiently, maintaining context across multiple levels of batching.

---

# Summary

By converting your Python-based batch processing examples to TypeScript, you can leverage the strong typing and modern JavaScript features inherent to TypeScript. The provided examples demonstrate how to implement **BatchNode** and **BatchFlow** classes, handle asynchronous operations, and manage nested batch processes within your `pocket.ts` framework.

**Key Points:**
- **BatchNode**: Handles iterable data inputs, processing each item individually.
- **BatchFlow**: Manages the execution of a Flow multiple times with different parameters.
- **Nested Batches**: Enables multi-level batching for complex workflows.

**Next Steps:**
- **Implement Actual Logic**: Replace placeholder functions like `callLLMAsync` and `summarizeAsync` with real implementations.
- **Error Handling**: Enhance robustness by adding comprehensive error handling.
- **Testing**: Write tests to ensure your batch processes work as expected.
- **Documentation**: Continue documenting other aspects of your framework similarly for consistency.

Feel free to further customize these examples to fit your project's specific needs. If you have any questions or need additional assistance, don't hesitate to ask!