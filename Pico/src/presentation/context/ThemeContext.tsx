import React, { createContext, useContext, useMemo, useState } from "react";
import { COLORS, DARK_COLORS } from "@shared/constants/data";

type ThemeColors = typeof COLORS;

interface ThemeContextValue {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  const value = useMemo<ThemeContextValue>(
    () => ({
      isDarkMode,
      toggleDarkMode,
      colors: isDarkMode ? DARK_COLORS : COLORS,
    }),
    [isDarkMode]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
