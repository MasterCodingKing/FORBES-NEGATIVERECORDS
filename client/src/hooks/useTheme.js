import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContextObject";

export function useTheme() {
  return useContext(ThemeContext);
}
