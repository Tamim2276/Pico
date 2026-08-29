# Pico Tool-Calling Pipeline (Manual Tool -> Model Tool)

Use this when a tool already works from manual trigger (hamburger menu), and now you want Gemma to call it from chat.

## Goal

Turn this:
- user types message
- Gemma replies text

Into this:
- user types message
- Gemma emits tool call JSON
- app parses JSON
- app executes real tool function
- app posts tool result to chat

---

## 0) Precondition

Before wiring model-calling, confirm the tool already runs manually and returns a clean `ToolResult` message.

If manual path is broken, fix that first.

---

## 1) Implement the tool in data layer

Create a tool file in `src/data/tools/` and implement the domain `Tool` interface:

- `name`: unique snake_case identifier (this is what model emits)
- `description`: short and specific
- `parameters`: JSON-schema-like args definition
- `execute(args)`: do real work and return `{ ok, message, data? }`

Rules:
- Keep `name` stable once released.
- Return user-facing `message` strings.
- Validate incoming args in `execute`.

---

## 2) Register the tool

Add the tool to the central registry array in `src/data/tools/registry.ts`.

If it is not in registry, model cannot execute it through dispatcher.

---

## 3) Add tool to model-facing list

Update `src/shared/utils/tool_list.json` with a matching entry:

- same `name` as registry tool
- clear `description`
- minimal `parameters`

Important:
- Keep this list aligned with registry.
- If names mismatch, execution fails with unknown tool.

---

## 4) Normalize/validate model args

Update arg normalization in `src/shared/utils/toolExecutor.ts`.

Why:
- Local models can hallucinate schema-like args (`type`, `properties`, `required`).
- You should sanitize args before calling business logic.

Recommended pattern:
- tools with no args -> force `{}`
- tools with args -> allow only known keys and known value domains
- fallback invalid args -> safe default or validation failure

---

## 5) Keep prompt strict

In assistant prompt builder (`AssistantScreen`):

- tell model to return ONE JSON object only
- forbid markdown/code fences/extra text
- forbid schema keys in args
- include valid examples per tool

Good response shape:

```json
{"name":"tool_name","args":{}}
```

for flashlight:

```json
{"name":"toggle_flashlight","args":{"state":"on"}}
```

---

## 6) Parse + execute in chat pipeline

In send handler:

1. call Gemma with tool-aware prompt
2. parse tool call JSON from model output
3. if tool-call found: execute through tool executor
4. post tool result message to chat
5. else: treat output as normal assistant text

This keeps a safe fallback when model chooses not to call tools.

---

## 7) (Optional) Keep manual trigger for debugging

Do not remove hamburger/manual route immediately.

Manual route is useful to isolate:
- native permission problems
- device-specific API issues
- model formatting problems

If manual works but model path fails, the bug is usually in prompt/parser/args normalization.

---

## 8) Test checklist (fast)

For each new tool, test 4 cases:

1. Manual button path returns expected message.
2. Chat asks directly for tool action and executes tool.
3. Model returns malformed JSON (extra brace/fence) and parser still handles gracefully.
4. Invalid args are rejected or normalized safely.

Also verify permission-based tools on real device/dev build.

---

## 9) Common failure patterns

1. Tool not in registry -> unknown tool.
2. Name mismatch between registry and tool_list.json -> unknown tool.
3. Model copies schema into args -> sanitize args.
4. Permission not granted or missing in Android manifest -> tool says permission denied.
5. Testing in stale install after permission changes -> rebuild/reinstall.

---

## 10) Minimal template for adding next tool

1. Create `src/data/tools/myTool.ts` implementing `Tool`.
2. Add `myTool` to `toolRegistry`.
3. Add JSON entry to `tool_list.json`.
4. Add arg normalization rule in `toolExecutor.ts`.
5. Add one valid prompt example in assistant prompt.
6. Verify manual path.
7. Verify model path.

If all 7 pass, the new tool is production-ready for model calling.
