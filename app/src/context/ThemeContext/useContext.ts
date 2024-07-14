import { useContext } from "react";
import { ThemeContext } from "./Context";

export const useThemeContext = () => useContext(ThemeContext)!;
