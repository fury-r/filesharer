import React from 'react';
export type TMODE = 'cupcake' | 'dark';

export const ThemeContext = React.createContext<{
  theme: TMODE;
  changeTheme: (mode: TMODE) => void;
} | null>(null);
