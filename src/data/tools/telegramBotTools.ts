import type { Tool, ToolResult } from "@domain/services/tools/Tool";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LocalTaskRepository } from "@data/local/LocalTaskRepository";
import { LocalEventRepository } from "@data/local/LocalEventRepository";
import { CreateTaskUseCase } from "@domain/usecases/task/CreateTaskUseCase";
import { CreateEventUseCase } from "@domain/usecases/event/CreateEventUseCase";
import { taskEventBus } from "@data/local/taskEvents";
import { parseFlexibleDateTime } from "@data/tools/createEventTool";
import { toolSpecs } from "@data/tools/registry";
import { runTool } from "@data/tools/dispatcher";
import {
  interpretNoticesWithCloud,
  CLOUD_MAX_NOTICES,
} from "@data/tools/telegramCloud";
import {
  extractTelegramTexts,
  decideTelegramAction,
  type TelegramMatchCandidate,
  type CloudToolCall,
} from "@shared/utils/telegramParse";

const OFFSET_KEY = "TELEGRAM_LAST_UPDATE_ID";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const taskRepo = new LocalTaskRepository();
const eventRepo = new LocalEventRepository();
const createTaskUseCase = new CreateTaskUseCase(taskRepo);
const createEventUseCase = new CreateEventUseCase(eventRepo);

async function getStoredOffset(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(OFFSET_KEY);
    const parsed = raw ? Number(raw) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
  } catch {
    return 0;
  }
}

/**
 * Telegram notice sync: fetches only NEW bot updates (offset-tracked),
 * extracts notice texts, compares against uncompleted tasks + the next
 * 7 days of calendar events, then creates tasks/events or updates an
 * existing event. Re-running processes only newer messages (no duplicates).
 *
 * Decision chain (telegram tool only): cloud interpreter (Nemotron, full
 * tool list) -> deterministic decider per notice. Local on-device LLM is
 * never involved on this path.
 */
export const telegramBotTools: Tool = {
  name: "telegram_updates",
  description:
    "Fetch new Telegram bot notices and sync them: create tasks, create calendar events, or update matching events.",
  parameters: {
    type: "object",
    properties: {},
  },
  execute: async (): Promise<ToolResult> => {
    const token = process.env.EXPO_PUBLIC_TELEGRAM_BOT_TOKEN;
    if (!token) {
      return { ok: false, message: "Missing EXPO_PUBLIC_TELEGRAM_BOT_TOKEN in .env" };
    }

    try {
      // Stage 1: fetch new updates only.
      const offset = await getStoredOffset();
      const res = await fetch(
        `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&limit=50&timeout=0`
      );
      const json = await res.json();
      console.log(JSON.stringify(json, null, 2));

      if (!json?.ok) {
        return {
          ok: false,
          message: `Telegram error: ${json?.description ?? "unknown error"}`,
          data: json,
        };
      }

      const updates = Array.isArray(json.result) ? json.result : [];
      const lastId = updates[updates.length - 1]?.update_id;
      const nextOffset =
        updates.length > 0 && typeof lastId === "number" ? lastId + 1 : offset;

      // Stage 2: notice texts only.
      const texts = extractTelegramTexts(json);
      if (updates.length === 0) {
        return {
          ok: true,
          message: "No new Telegram update(s).",
          data: { updates: [], offset },
        };
      }

      // Stage 3 context: uncompleted tasks + next 7 days of events.
      const allTasks = await taskRepo.getTasks();
      const pendingTasks: TelegramMatchCandidate[] = allTasks
        .filter((t) => !t.completed)
        .slice(0, 50)
        .map((t) => ({ id: t.id, title: t.title }));

      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      const windowEnd = startOfToday.getTime() + SEVEN_DAYS_MS;
      const upcomingEvents: TelegramMatchCandidate[] = (await eventRepo.getEvents())
        .filter((e) => {
          const t = new Date(e.startTime).getTime();
          return !isNaN(t) && t >= startOfToday.getTime() && t <= windowEnd;
        })
        .slice(0, 50)
        .map((e) => ({ id: e.id, title: e.title, startTime: e.startTime }));

      // Stage 4: decide + apply. Cloud first (Nemotron, full tool list),
      // deterministic decider per notice as fallback. Local LLM never used.
      const lines: string[] = [];
      let created = 0;
      let updated = 0;
      let ignored = 0;
      let mirrored = 0;
      let cloudTier: "ok" | "fallback" | "skipped" = "skipped";
      // Events created/updated this sync — reconciled to tasks afterwards
      // so every Telegram event has a linked task regardless of tier/path.
      const touchedEventIds = new Set<string>();

      // Shared event-update applier (deterministic + cloud update_event).
      // targetId must come from the 7-day window the decider was shown.
      const applyEventUpdate = async (
        targetId: string,
        noticeText: string,
        startTimeText?: string
      ): Promise<void> => {
        if (!upcomingEvents.some((e) => e.id === targetId)) {
          ignored++;
          lines.push(`⏭️ Skipped (unknown event): "${noticeText.slice(0, 60)}"`);
          return;
        }
        const existing = await eventRepo.getEventById(targetId);
        if (!existing) {
          ignored++;
          lines.push(`⏭️ Skipped (event gone): "${noticeText.slice(0, 60)}"`);
          return;
        }
        if (startTimeText) {
          const { startIso, endIso } = parseFlexibleDateTime(startTimeText);
          await eventRepo.updateEvent({
            ...existing,
            startTime: startIso,
            endTime: endIso,
            description: noticeText,
          });
          lines.push(`✏️ Rescheduled: "${existing.title}"`);
        } else {
          await eventRepo.updateEvent({
            ...existing,
            description: existing.description
              ? `${existing.description}\n${noticeText}`
              : noticeText,
          });
          lines.push(`✏️ Updated: "${existing.title}"`);
        }
        taskEventBus.emit();
        updated++;
        touchedEventIds.add(existing.id);
      };

      const applyDeterministic = async (text: string): Promise<void> => {
        try {
          const decision = decideTelegramAction(text, pendingTasks, upcomingEvents);

          if (decision.action === "create_task") {
            const task = await createTaskUseCase.execute(
              decision.title,
              decision.priority,
              "Telegram"
            );
            taskEventBus.emit();
            created++;
            lines.push(`✅ Task: "${task.title}" [${task.priority}]`);
          } else if (decision.action === "create_event") {
            const { startIso, endIso } = parseFlexibleDateTime(text);
            const event = await createEventUseCase.execute(
              decision.title,
              startIso,
              endIso,
              undefined,
              text
            );
            taskEventBus.emit();
            created++;
            touchedEventIds.add(event.id);
            lines.push(`📅 Event: "${event.title}"`);
          } else if (decision.action === "update_event") {
            await applyEventUpdate(
              decision.targetId,
              decision.note ?? text,
              decision.hasDateTime && decision.reschedule ? text : undefined
            );
          } else {
            ignored++;
            lines.push(`⏭️ Ignored (${decision.reason}): "${text.slice(0, 60)}"`);
          }
        } catch (e: any) {
          ignored++;
          lines.push(`⚠️ Failed: "${text.slice(0, 60)}" (${e?.message ?? e})`);
        }
      };

      // Cloud tier: one batched call for the first notices. Self-calls are
      // dropped to prevent recursive syncs. Overflow goes deterministic.
      const cloudTexts = texts.slice(0, CLOUD_MAX_NOTICES);
      const overflowTexts = texts.slice(CLOUD_MAX_NOTICES);

      const applyCloudCalls = async (calls: CloudToolCall[]): Promise<void> => {
        for (const call of calls) {
          if (call.name === "telegram_updates") continue;
          if (call.name === "update_event") {
            const args = (call.args ?? {}) as Record<string, unknown>;
            const targetId =
              typeof args.targetId === "string" ? args.targetId : "";
            const startTime =
              typeof args.startTime === "string" && args.startTime.trim()
                ? args.startTime
                : undefined;
            const note =
              typeof args.note === "string" && args.note.trim()
                ? args.note
                : undefined;
            if (!targetId) {
              ignored++;
              lines.push(`☁️ update_event missing targetId, skipped.`);
              continue;
            }
            try {
              await applyEventUpdate(
                targetId,
                note ?? startTime ?? "(telegram notice)",
                startTime
              );
            } catch (e: any) {
              ignored++;
              lines.push(`☁️ update_event error: ${e?.message ?? e}`);
            }
            continue;
          }
          try {
            const result = await runTool(
              call.name,
              (call.args ?? {}) as Record<string, unknown> as Record<string, any>
            );
            if (result.ok) {
              created++;
              lines.push(`☁️ ${call.name}: ${result.message.split("\n")[0]}`);
              if (call.name === "create_event") {
                const id = (result.data as { id?: unknown } | undefined)?.id;
                if (typeof id === "string" && id) touchedEventIds.add(id);
              }
            } else {
              ignored++;
              lines.push(`☁️ ${call.name} failed: ${result.message.slice(0, 80)}`);
            }
          } catch (e: any) {
            ignored++;
            lines.push(`☁️ ${call.name} error: ${e?.message ?? e}`);
          }
        }
      };

      const cloudCalls = await interpretNoticesWithCloud({
        todayLabel: now.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        }),
        texts: cloudTexts,
        pendingTasks: pendingTasks.slice(0, 10),
        upcomingEvents: upcomingEvents.slice(0, 10),
        toolSpecs: toolSpecs(),
      });

      if (cloudCalls === null) {
        cloudTier = "fallback";
        for (const text of texts) {
          await applyDeterministic(text);
        }
      } else {
        cloudTier = "ok";
        // Quote attribution (never positional): an entry runs only against
        // the notice it quotes exactly. Unquoted/misquoted entries are
        // dropped and their notices fall back to deterministic below —
        // execution happens at most once per notice.
        const indexByQuote = new Map<string, number>();
        cloudTexts.forEach((t, i) => {
          if (!indexByQuote.has(t.trim())) indexByQuote.set(t.trim(), i);
        });
        const covered = new Array<boolean>(cloudTexts.length).fill(false);
        for (const decision of cloudCalls) {
          if (!decision) continue;
          const idx = indexByQuote.get(decision.notice.trim());
          if (idx === undefined || covered[idx]) {
            console.log(
              "[telegram_updates] unattributed cloud entry, falling back:",
              JSON.stringify(decision).slice(0, 300)
            );
            continue;
          }
          covered[idx] = true;
          await applyCloudCalls(decision.calls);
        }
        for (let i = 0; i < cloudTexts.length; i += 1) {
          if (!covered[i]) await applyDeterministic(cloudTexts[i]);
        }
        for (const text of overflowTexts) {
          await applyDeterministic(text);
        }
      }

      if (texts.length === 0) {
        lines.push("No text notices in these updates (non-text only).");
      }

      // Mirror reconcile: every touched event gets a linked pending task
      // (tagged event:<id>), updated or created. Also adopts same-title
      // untagged tasks (e.g. mirrored by the cloud itself) instead of
      // duplicating them. Per-event isolation: one bad id never blocks rest.
      for (const eventId of touchedEventIds) {
        try {
          const event = await eventRepo.getEventById(eventId);
          if (!event) continue;
          const tag = `event:${eventId}`;
          const tasks = await taskRepo.getTasks();
          const linked = tasks.find(
            (t) => !t.completed && t.description === tag
          );
          if (linked) {
            if (
              linked.title !== event.title ||
              linked.dueDate !== event.startTime
            ) {
              await taskRepo.updateTask({
                ...linked,
                title: event.title,
                dueDate: event.startTime,
              });
              mirrored++;
            }
          } else {
            const sameTitle = tasks.find(
              (t) =>
                !t.completed && t.title.trim() === event.title.trim()
            );
            if (sameTitle) {
              await taskRepo.updateTask({
                ...sameTitle,
                description: tag,
                dueDate: event.startTime,
              });
              mirrored++;
            } else {
              await createTaskUseCase.execute(
                event.title,
                "Medium",
                "Telegram",
                tag,
                event.startTime
              );
              mirrored++;
            }
          }
        } catch {
          // ignore single-event mirror failures
        }
      }
      if (mirrored > 0) {
        taskEventBus.emit();
        lines.push(`🔗 Mirrored ${mirrored} event(s) to tasks.`);
      }

      // Advance the offset only after processing was attempted.
      try {
        await AsyncStorage.setItem(OFFSET_KEY, String(nextOffset));
      } catch {
        // storage failure must not fail the sync itself
      }

      console.log(
        `[telegram_updates] tier=${cloudTier} processed=${texts.length} created=${created} updated=${updated} ignored=${ignored} mirrored=${mirrored}`
      );
      for (const line of lines.slice(0, 12)) {
        console.log(`[telegram_updates] ${line}`);
      }

      return {
        ok: true,
        message:
          `📨 Telegram sync (${cloudTier}): ${texts.length} notice(s) — ${created} created, ${updated} updated, ${ignored} ignored, ${mirrored} mirrored.\n` +
          lines.slice(0, 10).join("\n"),
        data: {
          updates,
          offset: nextOffset,
          created,
          updated,
          ignored,
          mirrored,
          tier: cloudTier,
        },
      };
    } catch (e: any) {
      return { ok: false, message: `Telegram fetch failed: ${e?.message ?? e}` };
    }
  },
};
