import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import type { AppUser, UserRole } from "@/types";
import { supabase } from "@/integrations/supabase/client";

interface LocalAuthContextType {
  user: AppUser | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, role: UserRole) => { error: string | null };
  signIn: (email: string, password: string) => { error: string | null };
  signOut: () => void;
}

const LocalAuthContext = createContext<LocalAuthContextType | undefined>(undefined);

const USERS_KEY = "judgemate_users";
const SESSION_KEY = "judgemate_session";

interface StoredUser extends AppUser {
  password: string;
}

function getUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getSession(): AppUser | null {
  try {
    const s = localStorage.getItem(SESSION_KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

export function LocalAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getSession();
    setUser(session);
    setLoading(false);
  }, []);

  const signUp = (email: string, password: string, name: string, role: UserRole) => {
    const users = getUsers();
    if (users.find((u) => u.email === email.toLowerCase())) {
      return { error: "An account with this email already exists." };
    }
    const newUser: StoredUser = {
      id: crypto.randomUUID(),
      email: email.toLowerCase(),
      password,
      name,
      role,
      createdAt: new Date().toISOString(),
    };
    saveUsers([...users, newUser]);
    const { password: _, ...sessionUser } = newUser;
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    setUser(sessionUser);

    // Mirror to Supabase auth (fire-and-forget — enables RLS reads)
    supabase.auth.signUp({ email: email.toLowerCase(), password }).catch(() => {});

    return { error: null };
  };

  const signIn = (email: string, password: string) => {
    const users = getUsers();
    const found = users.find((u) => u.email === email.toLowerCase() && u.password === password);
    if (!found) {
      return { error: "Invalid email or password." };
    }
    const { password: _, ...sessionUser } = found;
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    setUser(sessionUser);

    // Mirror to Supabase auth (fire-and-forget — enables RLS reads)
    supabase.auth.signInWithPassword({ email: email.toLowerCase(), password }).catch(() => {});
    return { error: null };
  };

  const signOut = () => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    supabase.auth.signOut().catch(() => {});
  };

  return (
    <LocalAuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </LocalAuthContext.Provider>
  );
}

export function useLocalAuth() {
  const context = useContext(LocalAuthContext);
  if (!context) throw new Error("useLocalAuth must be used within LocalAuthProvider");
  return context;
}
