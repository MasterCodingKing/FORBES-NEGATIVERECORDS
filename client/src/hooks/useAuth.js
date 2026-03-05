import { useContext } from "react";
import { AuthContext } from "../context/AuthContextObject";

export function useAuth() {
  return useContext(AuthContext);
}
