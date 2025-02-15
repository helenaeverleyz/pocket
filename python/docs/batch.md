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

A **BatchNode** processes items in batches. The key methods work differently from regular nodes:

### Python Implementation
```python
class MapSummaries(BatchNode):
    def prep(self, shared):
        # Suppose we have a big file; chunk it
        content = shared["data"].get("large_text.txt", "")
        chunk_size = 10000
        chunks = [content[i:i+chunk_size] for i in range(0, len(content), chunk_size)]
        return chunks

    def exec(self, chunk):
        prompt = f"Summarize this chunk in 10 words: {chunk}"
        summary = call_llm(prompt)
        return summary

    def post(self, shared, prep_res, exec_res_list):
        combined = "\n".join(exec_res_list)
        shared["summary"]["large_text.txt"] = combined
        return "default"

map_summaries = MapSummaries()
flow = Flow(start=map_summaries)
flow.run(shared)
```

### TypeScript Implementation
```typescript
interface SharedState {
    data: { [key: string]: string };
    summary: { [key: string]: string };
}

class MapSummaries extends AsyncBatchNode<SharedState> {
    async prepAsync(shared: SharedState): Promise<string[]> {
        // Suppose we have a big file; chunk it
        const content = shared.data["large_text.txt"] || "";
        const chunkSize = 10000;
        const chunks: string[] = [];
        
        for (let i = 0; i < content.length; i += chunkSize) {
            chunks.push(content.slice(i, i + chunkSize));
        }
        return chunks;
    }

    async execAsync(chunk: string): Promise<string> {
        const prompt = `Summarize this chunk in 10 words: ${chunk}`;
        const summary = await callLLM(prompt);
        return summary;
    }

    async postAsync(shared: SharedState, _: string[], execResList: string[]): Promise<string> {
        const combined = execResList.join("\n");
        shared.summary["large_text.txt"] = combined;
        return "default";
    }
}

const mapSummaries = new MapSummaries();
const flow = new AsyncFlow(mapSummaries);
await flow.runAsync(shared);
```

## 2. BatchFlow

A **BatchFlow** runs a **Flow** multiple times with different parameters.

### Python Implementation
```python
class SummarizeAllFiles(BatchFlow):
    def prep(self, shared):
        # Return a list of param dicts (one per file)
        filenames = list(shared["data"].keys())
        return [{"filename": fn} for fn in filenames]

# Suppose we have a per-file Flow
summarize_file = SummarizeFile(start=load_file)

# Wrap that flow into a BatchFlow:
summarize_all_files = SummarizeAllFiles(start=summarize_file)
summarize_all_files.run(shared)
```

### TypeScript Implementation
```typescript
interface FileParams {
    filename: string;
}

class SummarizeAllFiles extends AsyncBatchFlow<SharedState> {
    async prepAsync(shared: SharedState): Promise<FileParams[]> {
        // Return a list of param objects (one per file)
        const filenames = Object.keys(shared.data);
        return filenames.map(filename => ({ filename }));
    }
}

// Suppose we have a per-file Flow
const summarizeFile = new AsyncFlow(loadFile);

// Wrap that flow into a BatchFlow:
const summarizeAllFiles = new SummarizeAllFiles(summarizeFile);
await summarizeAllFiles.runAsync(shared);
```

## 3. Nested or Multi-Level Batches

You can nest BatchFlows for hierarchical processing. Here's how it works in both languages:

### Python Implementation
```python
class FileBatchFlow(BatchFlow):
    def prep(self, shared):
        directory = self.params["directory"]
        files = [f for f in os.listdir(directory) if f.endswith(".txt")]
        return [{"filename": f} for f in files]

class DirectoryBatchFlow(BatchFlow):
    def prep(self, shared):
        directories = ["/path/to/dirA", "/path/to/dirB"]
        return [{"directory": d} for d in directories]

inner_flow = FileBatchFlow(start=MapSummaries())
outer_flow = DirectoryBatchFlow(start=inner_flow)
```

### TypeScript Implementation
```typescript
interface DirectoryParams {
    directory: string;
}

class FileBatchFlow extends AsyncBatchFlow<SharedState> {
    async prepAsync(shared: SharedState): Promise<FileParams[]> {
        const directory = this.params["directory"] as string;
        const files = await listFiles(directory);
        return files
            .filter(f => f.endsWith(".txt"))
            .map(filename => ({ filename }));
    }
}

class DirectoryBatchFlow extends AsyncBatchFlow<SharedState> {
    async prepAsync(shared: SharedState): Promise<DirectoryParams[]> {
        const directories = ["/path/to/dirA", "/path/to/dirB"];
        return directories.map(directory => ({ directory }));
    }
}

const innerFlow = new FileBatchFlow(new MapSummaries());
const outerFlow = new DirectoryBatchFlow(innerFlow);
```

In both implementations:
- BatchNodes process items in parallel or sequence
- BatchFlows run a flow multiple times with different parameters
- Nested BatchFlows allow hierarchical processing
- Type safety in TypeScript helps prevent errors
- Both support async operations for I/O-heavy tasks