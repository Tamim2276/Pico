# How Inference Works in Pico

This doc traces one user input from the moment it is typed until Pico's reply
reaches the screen, naming every function and state it passes through. It is a
map, not a transcript — the actual wiring lives in `AssistantScreen`,
`llm.tsx`, `toolExecutor.ts`, and the tool registry.

Architecture at a glance:

```
ChatInput ──► AssistantScreen.handleSend ──► buildToolAwarePrompt
        ──► LLMProvider.generate ──► llama.rn (llama.cpp) on device
        ──► raw text back ──► parseToolCallFromGemma?
                 ├── yes ──► executeToolCallFromGemma ──► runTool ──► Tool.execute ──► ToolResult.message
                 └── no  ──► sanitizeGemmaOutput
        ──► MessageBubble rendered in FlatList
```

---

## 1. User types and submits

- **File:** `src/presentation/components/ChatInput.tsx`
- The `TextInput` is a controlled component: its value is the `inputText`
  state owned by `AssistantScreen`. Typing calls `onChangeText` → `setInputText`.
- Submitting (keyboard return, `onSubmitEditing`) calls `onSend`, which is
  `handleSend` in `AssistantScreen`.

**State before submission:** `inputText` holds the raw string, `messages` is
the chat history, `gemmaLoading` is `false`.

---

## 2. `AssistantScreen.handleSend` — entry point

**File:** `src/presentation/screens/assistant/AssistantScreen.tsx:105`

Steps, in order:

1. **Guard:** if `inputText` is blank or `gemmaLoading` is already `true`,
   abort (prevents double-sends).
2. **Optimistic UI:** trims the text, creates a `userMessage`
   (`{ id, role: "user", text }`) and a placeholder `typing` message, and
   appends both to `messages`. This is what makes the bubble and the
   "Pico is thinking…" indicator appear instantly.
3. Clears `inputText` and sets `gemmaLoading = true`.

**State now:** two new messages in `messages`, `gemmaLoading = true`.

---

## 3. Prompt construction — `buildToolAwarePrompt`

**File:** `src/presentation/screens/assistant/AssistantScreen.tsx:42`

The user's raw text is not sent alone. It is wrapped in a **single-shot
tool-calling prompt**:

- A system role line: "You are Pico. Decide whether to call one tool."
- Instructions to return ONLY a JSON object like
  `{"name":"tool_name","args":{}}` — no markdown, no code fences.
- Five worked examples (one per tool).
- The full tool list serialized from `src/shared/utils/tool_list.json`
  (name, description, parameters).
- The actual user request as the final line.

This is the input that actually reaches the model. It is plain text — no
native tool/function-call API is used.

---

## 4. Provider selection — `createLLMProvider`

**File:** `src/shared/utils/llm.tsx:203`

```ts
const provider = createLLMProvider();
const result = await provider.generate(buildToolAwarePrompt(text));
```

`createLLMProvider` reads `Constants.expoConfig.extra.llmProvider`
(`app.json`, currently `"local"`) and returns one of two classes behind the
`LLMProvider` interface:

| Name | Class | Behavior |
|------|-------|----------|
| `"local"` | `LocalProvider` (llm.tsx:157) | `generate` → `ensureLocalContext` → `context.completion` |
| `"existing"` | `ExistingProvider` (llm.tsx:127) | `generate` → `testGemma`, which does the same thing |

Both end up calling `context.completion(...)` on the llama context, so the
inference path below is shared.

---

## 5. Model load (lazy, cached) — `ensureLocalContext`

**File:** `src/shared/utils/llm.tsx:55`

The model is **not** loaded at app start. The first `generate` call triggers a
lazy load, memoized at module scope so subsequent calls reuse it:

- **`getLocalModelPath`** (llm.tsx:41) — checks
  `RNFS.ExternalDirectoryPath/gguf/gemma_3_1b_it_q4_k_m.gguf` exists on the
  device; throws if the GGUF was never copied there.
- **`initLlama`** (from `llama.rn`) creates the native context with:
  `use_mlock: true`, `n_ctx: 2048`, `n_gpu_layers: 0` (pure CPU).
- The promise is stashed in `localContextPromise` so concurrent calls await
  the same load; `localContext` + `localModelLoaded` short-circuit future
  calls. On failure everything is reset so a later call can retry.

**State:** one in-flight or cached native context for the whole app lifetime.

---

## 6. Token generation — `context.completion`

**File:** `src/shared/utils/llm.tsx:160` (LocalProvider) / `:106` (testGemma)

```ts
const result = await context.completion({
  messages: [{ role: "user", content: prompt }],
  n_predict: 160,        // max tokens to generate
  temperature: 0.7,      // sampling temperature
  stop: STOP_WORDS,      // ['</s>', '<|eot_id|>', '<|end_of_turn|>', '<|endoftext|>']
});
```

This is the actual inference: `llama.rn` feeds the prompt through the
Gemma-3-1B model running locally via llama.cpp, samples tokens one at a time
up to `n_predict`, and stops on the first stop word. The full generated text
is returned in `result.text` (generation is not streamed to the UI in this
path).

---

## 7. Interpreting the output — parse or fall through

**File:** `src/presentation/screens/assistant/AssistantScreen.tsx:135`

The raw string comes back and is checked for a tool call:

```ts
const toolCall = parseToolCallFromGemma(raw);
```

### 7a. If a tool call was detected → `executeToolCallFromGemma`

**File:** `src/shared/utils/toolExecutor.ts:133`

- `parseToolCallFromGemma` (toolExecutor.ts:113):
  - Strips Gemma's function-call tokens (`<start_function_call>`,
    `<escape>`, and any other angle-bracket tags).
  - `extractJsonObject` (toolExecutor.ts:79) finds the first `{...}` JSON:
    tries a fenced block, then a plain substring, then a
    brace-balanced scan (`extractFirstBalancedJsonObject`, toolExecutor.ts:16).
  - Reads `name`, and `normalizeArgsForTool` (toolExecutor.ts:55) sanitizes
    args — dropping a echoed parameter *schema* and only keeping a real
    `state` for `toggle_flashlight`.
- `runTool` (`src/data/tools/dispatcher.ts:14`) looks the name up in the
  registry via `getTool` (`src/data/tools/registry.ts:22`) and calls
  `tool.execute(args)`. Each tool returns a
  `ToolResult { ok, message }` (contract in `src/domain/services/tools/Tool.ts`).

**Tool side effects** vary by tool:
- `toggle_flashlight` writes `torchStore` (`src/data/device/torchStore.ts`);
  `TorchProvider` subscribes and flips a hidden `<CameraView enableTorch>`
  (flashlightTool.ts).
- `battery_status` reads `expo-battery`, `read_calendar` reads
  `expo-calendar`, `current_location` reads `expo-location`,
  `fire_notification` posts a local notification whose Yes/No taps are routed
  back into the chat via `rescheduleBus`.

The `ToolResult.message` becomes Pico's reply verbatim.

### 7b. If no tool call → `sanitizeGemmaOutput`

**File:** `src/presentation/screens/assistant/AssistantScreen.tsx:31`

- Collapses repeated `<start_function_call>` tags, extracts the content
  between `start_function_call` and `<escape>` if present, otherwise strips
  all angle-bracket tags. This keeps stray tool tokens out of the chat.
- Falls back to `"Gemma returned no text."` if the model produced nothing.

---

## 8. Rendering back to the user

**File:** `src/presentation/screens/assistant/AssistantScreen.tsx:136-170`

- The `typing` placeholder message is filtered out and a real `assistant`
  message (either the tool's `message` or the sanitized model text) is
  appended to `messages`.
- `gemmaLoading` is set back to `false` (in `finally`), re-enabling input.
- A `useEffect` watches `messages` and calls
  `flatListRef.current?.scrollToEnd()` so the newest bubble is visible.
- Each message renders through `MessageBubble`
  (`src/presentation/components/MessageBubble.tsx`): `role === "user"` gets a
  right-aligned blue bubble, `role === "assistant"` a left-aligned dark
  bubble. The `typing` role renders `TypingIndicator` instead.

**State after:** the reply is the last item in `messages`, the FlatList has
re-rendered and scrolled, and the UI is idle awaiting the next input.

---

## Two paths that bypass the LLM

These share the tool half of the pipeline but never touch the model:

1. **Tool menu** — `ToolMenu` (`src/presentation/components/ToolMenu.tsx`)
   calls `runTool(...)` directly (e.g. it decides flashlight on/off from the
   live `torchStore` state) and pushes the result via
   `pushAssistantMessage` → `setMessages`.
2. **Notification buttons** — tapping Yes/No on the reschedule notification
   emits on `rescheduleBus`; a listener in `AssistantScreen` pushes a canned
   assistant message.

The full model + tool path is therefore: user text → prompt wrap → llama
inference → JSON-or-text decision → tool execution (optional) → sanitize →
bubble in the FlatList.
