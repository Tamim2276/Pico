/**
 * Dynamic Expo config: layers local secrets into `extra` WITHOUT inlining
 * them into JS (no EXPO_PUBLIC_ prefix anywhere here).
 *
 * - `extra.nvidiaApiKey` comes from `.env.local` (gitignored) in dev, or
 *   from EAS Secrets / build-time env in CI (`NVIDIA_API_KEY`).
 * - Absent key -> empty string -> cloud tier is skipped at runtime.
 * - `config` already contains everything from app.json; we only add `extra`.
 */
module.exports = function ({ config }) {
  return {
    ...config,
    extra: {
      ...(config.extra ?? {}),
      nvidiaApiKey: process.env.NVIDIA_API_KEY ?? "",
    },
  };
};
