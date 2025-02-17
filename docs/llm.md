---
layout: default
title: "LLM Wrapper"
parent: "Details"
nav_order: 1
---

# LLM Wrappers

We **don't** provide built-in LLM wrappers. Instead, please implement your own by calling an LLM service from TypeScript (for example, the [OpenAI Node.js library](https://www.npmjs.com/package/openai)). You could also ask a ChatGPT-like assistant to "implement a `callLLM` function that takes a prompt and returns the LLM response."

Below is a **TypeScript** example using **OpenAI**:

```typescript
import { Configuration, OpenAIApi } from "openai";

/**
 * callLLM
 * 
 * An example function that sends a prompt to OpenAI's API and returns the response text.
 * Make sure to store your API key in an environment variable like OPENAI_API_KEY.
 */
export async function callLLM(prompt: string): Promise<string> {
  const config = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(config);

  const response = await openai.createChatCompletion({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
  });

  // Safely handle the response
  return response.data.choices?.[0]?.message?.content ?? "";
}

/**
 * Example usage
 */
// (async () => {
//   const reply = await callLLM("How are you?");
//   console.log("LLM reply:", reply);
// })();
```

> Always store the API key in a secure environment variable (e.g., `OPENAI_API_KEY`) rather than hardcoding it.  
{: .note }

## Improvements

Feel free to enhance your `callLLM` function as needed. Below are some common patterns:

### 1. Handling Chat History

Rather than a single `prompt`, you might pass an array of messages:

```typescript
import { Configuration, OpenAIApi, ChatCompletionRequestMessage } from "openai";

export async function callLLMWithHistory(messages: ChatCompletionRequestMessage[]): Promise<string> {
  const config = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(config);

  const response = await openai.createChatCompletion({
    model: "gpt-4",
    messages: messages,
  });

  return response.data.choices?.[0]?.message?.content ?? "";
}
```

### 2. Adding In-Memory Caching

Using the [lru-cache](https://www.npmjs.com/package/lru-cache) or a similar library, you can cache responses to avoid repeating identical calls. Below is a sketch:

```typescript
import LRU from "lru-cache";
import { Configuration, OpenAIApi } from "openai";

const llmCache = new LRU<string, string>({ max: 1000 });

export async function cachedCallLLM(prompt: string, useCache: boolean): Promise<string> {
  // If caching is enabled and a cached value exists, return it
  if (useCache && llmCache.has(prompt)) {
    return llmCache.get(prompt) as string;
  }

  // Otherwise, call the LLM
  const config = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(config);

  const response = await openai.createChatCompletion({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.data.choices?.[0]?.message?.content ?? "";

  // Cache the result if desired
  if (useCache) {
    llmCache.set(prompt, text);
  }
  return text;
}
```

> ⚠️ Caching conflicts with Node retries, since retries yield the same result.  
> You could only use cached results on the first attempt and bypass the cache on subsequent retries.  
{: .warning }

### 3. Enabling Logging

Use your logging framework (e.g., [winston](https://www.npmjs.com/package/winston), [pino](https://www.npmjs.com/package/pino), or Node.js `console`) to track prompts and responses:

```typescript
export async function callLLMWithLogging(prompt: string): Promise<string> {
  console.info(`Prompt: ${prompt}`);
  // ...Perform the call as shown above
  // Example:
  const reply = await callLLM(prompt);
  console.info(`Response: ${reply}`);
  return reply;
}
```

## Why Not Provide Built-in LLM Wrappers?

It's considered **bad practice** to bundle specific LLM implementations inside a generic framework, for reasons such as:

- **Frequent API Changes**: LLM providers evolve their APIs rapidly. Hardcoding them makes maintenance difficult.  
- **Flexibility**: You might switch vendors (OpenAI, Anthropic, or local models) or need to fine-tune your own models.  
- **Optimizations**: You may need caching, request batching, or streaming—custom solutions are often essential.
