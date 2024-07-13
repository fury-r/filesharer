'use client';
import { ReactNode, useState, useEffect, useMemo } from 'react';
import { ThemeContext, TMODE } from './Context';

export const CustomThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<TMODE>((localStorage.getItem('theme') as TMODE) || 'dark');
  const changeTheme = (mode: TMODE) => {
    setTheme(mode);

    localStorage.setItem('theme', mode);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      changeTheme
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
