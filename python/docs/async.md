---
layout: default
title: "(Advanced) Async"
parent: "Core Abstraction"
nav_order: 5
---

# (Advanced) Async

**Async** Nodes implement async methods for handling asynchronous operations. This is useful for:

1. **Preparation**  
   - For *fetching/reading data (files, APIs, DB)* in an I/O-friendly way.

2. **Execution**  
   - Typically used for async LLM calls.

3. **Post-processing**  
   - For *awaiting user feedback*, *coordinating across multi-agents* or any additional async steps.

### Python Implementation

```python
class SummarizeThenVerify(AsyncNode):
    async def prep_async(self, shared):
        # Example: read a file asynchronously
        doc_text = await read_file_async(shared["doc_path"])
        return doc_text

    async def exec_async(self, prep_res):
        # Example: async LLM call
        summary = await call_llm_async(f"Summarize: {prep_res}")
        return summary

    async def post_async(self, shared, prep_res, exec_res):
        # Example: wait for user feedback
        decision = await gather_user_feedback(exec_res)
        if decision == "approve":
            shared["summary"] = exec_res
            return "approve"
        return "deny"

summarize_node = SummarizeThenVerify()
final_node = Finalize()

# Define transitions
summarize_node - "approve" >> final_node
summarize_node - "deny"    >> summarize_node  # retry

flow = AsyncFlow(start=summarize_node)

async def main():
    shared = {"doc_path": "document.txt"}
    await flow.run_async(shared)
    print("Final Summary:", shared.get("summary"))

asyncio.run(main())
```

### TypeScript Implementation

```typescript
interface SharedState {
    doc_path: string;
    summary?: string;
}

class SummarizeThenVerify extends AsyncNode<SharedState> {
    async prepAsync(shared: SharedState): Promise<string> {
        // Example: read a file asynchronously
        const docText = await readFileAsync(shared.doc_path);
        return docText;
    }

    async execAsync(prepRes: string): Promise<string> {
        // Example: async LLM call
        const summary = await callLLMAsync(`Summarize: ${prepRes}`);
        return summary;
    }

    async postAsync(shared: SharedState, _: string, execRes: string): Promise<string> {
        // Example: wait for user feedback
        const decision = await gatherUserFeedback(execRes);
        if (decision === "approve") {
            shared.summary = execRes;
            return "approve";
        }
        return "deny";
    }
}

class Finalize extends AsyncNode<SharedState> {
    async execAsync(): Promise<void> {
        // Final processing
    }
}

const summarizeNode = new SummarizeThenVerify();
const finalNode = new Finalize();

// Define transitions
summarizeNode.connect("approve", finalNode);
summarizeNode.connect("deny", summarizeNode);  // retry

const flow = new AsyncFlow(summarizeNode);

async function main() {
    const shared: SharedState = { doc_path: "document.txt" };
    await flow.runAsync(shared);
    console.log("Final Summary:", shared.summary);
}

main().catch(console.error);
```

**Note**: 
- In Python, `AsyncNode` must be wrapped in `AsyncFlow`. 
- In TypeScript, nodes extend `AsyncNode<T>` with a generic type for type-safe shared state.
- Both implementations support async operations with proper error handling and retries.
- `AsyncFlow` can include both async and regular (sync) nodes in both languages.