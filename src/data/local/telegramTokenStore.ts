import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Runtime store for the user-provided Telegram bot token.
 *
 * Why SecureStore and not `.env`:
 * - `EXPO_PUBLIC_*` vars are inlined by Metro at bundle time from the dev
 *   machine's `.env`. There is no `.env` file inside the installed Android
 *   app to edit, so a Profile-page key must live in on-device storage.
 * - SecureStore is encrypted (Keystore-backed on Android); AsyncStorage is
 *   not, so the secret never goes there. Only the non-secret sync offset
 *   (`TELEGRAM_LAST_UPDATE_ID`) uses AsyncStorage.
 *
 * Priority: Profile-saved key wins, build-time `.env` value is fallback.
 */

const TELEGRAM_BOT_TOKEN_KEY = "PICO_TELEGRAM_BOT_TOKEN";
const TELEGRAM_OFFSET_KEY = "TELEGRAM_LAST_UPDATE_ID";

function buildTimeToken(): string {
  const token = process.env.EXPO_PUBLIC_TELEGRAM_BOT_TOKEN;
  return typeof token === "string" ? token.trim() : "";
}

/** Resolves the effective token: SecureStore first, `.env` fallback. */
export async function getTelegramBotToken(): Promise<string> {
  try {
    const stored = await SecureStore.getItemAsync(TELEGRAM_BOT_TOKEN_KEY);
    if (stored && stored.trim()) return stored.trim();
  } catch {
    // SecureStore read failure -> fall through to build-time value.
  }
  return buildTimeToken();
}

/** True when the user has saved a token via the Profile page. */
export async function hasCustomTelegramToken(): Promise<boolean> {
  try {
    const stored = await SecureStore.getItemAsync(TELEGRAM_BOT_TOKEN_KEY);
    return Boolean(stored && stored.trim());
  } catch {
    return false;
  }
}

/** True when any token (custom or build-time fallback) is available. */
export async function hasTelegramToken(): Promise<boolean> {
  const token = await getTelegramBotToken();
  return token.length > 0;
}

export async function saveTelegramBotToken(token: string): Promise<void> {
  const cleaned = token.trim();
  if (!cleaned) {
    throw new Error("Token is empty. Paste a valid bot token.");
  }
  await SecureStore.setItemAsync(TELEGRAM_BOT_TOKEN_KEY, cleaned);
}

/**
 * Clears the saved token and resets the sync offset so the next sync
 * with a new token starts fresh instead of resuming the old position.
 */
export async function deleteTelegramBotToken(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(TELEGRAM_BOT_TOKEN_KEY).catch(() => {}),
    AsyncStorage.removeItem(TELEGRAM_OFFSET_KEY).catch(() => {}),
  ]);
}
