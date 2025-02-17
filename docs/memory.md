---
layout: default
title: "Chat Memory"
parent: "Paradigm"
nav_order: 5
---

# Chat Memory

Multi-turn conversations require memory management to maintain context while avoiding overwhelming the LLM.

### 1. Naive Approach: Full History

Sending the full chat history may overwhelm LLMs.

```python
class ChatNode(Node):
    def prep(self, shared):
        if "history" not in shared:
            shared["history"] = []
        user_input = input("You: ")
        return shared["history"], user_input

    def exec(self, inputs):
        history, user_input = inputs
        messages = [{"role": "system", "content": "You are a helpful assistant"}]
        for h in history:
            messages.append(h)
        messages.append({"role": "user", "content": user_input})
        response = call_llm(messages)
        return response

    def post(self, shared, prep_res, exec_res):
        shared["history"].append({"role": "user", "content": prep_res[1]})
        shared["history"].append({"role": "assistant", "content": exec_res})
        return "continue"

chat = ChatNode()
chat - "continue" >> chat
flow = Flow(start=chat)
```

### 2. Improved Memory Management

We can:
1. Limit the chat history to the most recent 4.
2. Use [vector search](./tool.md) to retrieve relevant exchanges beyond the last 4.

```python
class ChatWithMemory(Node):
    def prep(self, s):
        # Initialize shared dict
        s.setdefault("history", [])
        s.setdefault("memory_index", None)
        
        user_input = input("You: ")
        
        # Retrieve relevant past if we have enough history and an index
        relevant = []
        if len(s["history"]) > 8 and s["memory_index"]:
            idx, _ = search_index(s["memory_index"], get_embedding(user_input), top_k=2)
            relevant = [s["history"][i[0]] for i in idx]

        return {"user_input": user_input, "recent": s["history"][-8:], "relevant": relevant}

    def exec(self, c):
        messages = [{"role": "system", "content": "You are a helpful assistant."}]
        # Include relevant history if any
        if c["relevant"]:
            messages.append({"role": "system", "content": f"Relevant: {c['relevant']}"})
        # Add recent history and the current user input
        messages += c["recent"] + [{"role": "user", "content": c["user_input"]}]
        return call_llm(messages)

    def post(self, s, pre, ans):
        # Update chat history
        s["history"] += [
            {"role": "user", "content": pre["user_input"]},
            {"role": "assistant", "content": ans}
        ]
        
        # When first reaching 8 messages, create index
        if len(s["history"]) == 8:
            embeddings = []
            for i in range(0, 8, 2):
                e = s["history"][i]["content"] + " " + s["history"][i+1]["content"]
                embeddings.append(get_embedding(e))
            s["memory_index"] = create_index(embeddings)
            
        # Embed older exchanges once we exceed 8 messages
        elif len(s["history"]) > 8:
            pair = s["history"][-10:-8]
            embedding = get_embedding(pair[0]["content"] + " " + pair[1]["content"])
            s["memory_index"].add(np.array([embedding]).astype('float32'))
        
        print(f"Assistant: {ans}")
        return "continue"

chat = ChatWithMemory()
chat - "continue" >> chat
flow = Flow(start=chat)
flow.run({})
```
