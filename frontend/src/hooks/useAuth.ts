import { useState } from "react";
import { login } from "../services/authService";

export default function useAuth() {
  const [currentUser, setCurrentUser] = useState(
    JSON.parse(
      localStorage.getItem("currentUser") || "null"
    )
  );

  function signIn(
    email: string,
    password: string
  ) {
    const user = login(email, password);

    if (!user) {
      return false;
    }

    localStorage.setItem(
      "currentUser",
      JSON.stringify(user)
    );

    setCurrentUser(user);

    return true;
  }

  function signOut() {
    localStorage.removeItem("currentUser");
    setCurrentUser(null);
  }

  return {
    currentUser,
    signIn,
    signOut,
  };
}