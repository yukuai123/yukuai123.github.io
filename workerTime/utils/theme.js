export const DEFAULT_THEME_MODE = "light";

export async function getThemeSettings(storage = chrome.storage.local) {
  const { themeMode } = await storage.get(["themeMode"]);

  return {
    themeMode: themeMode || DEFAULT_THEME_MODE,
  };
}

export function applyThemeToDocument(
  doc = document,
  { themeMode = DEFAULT_THEME_MODE } = {},
) {
  const target = doc.body || doc.documentElement;
  if (!target) {
    return;
  }

  target.dataset.themeMode = themeMode;
}
