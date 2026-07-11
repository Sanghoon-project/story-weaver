import { useCallback, useEffect, useState } from "react";

const USERS_KEY = "vn:users:v1";
const SESSION_KEY = "vn:session:v1";

export type User = { id: string; name: string; passHash: string; createdAt: number };

function uid(p = "u"): string {
  return `${p}_${Math.random().toString(36).slice(2, 10)}`;
}

// Simple non-cryptographic hash — this is a static site, no real security.
function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return String(h);
}

function loadUsers(): User[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveUsers(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function useAuth() {
  const [userId, setUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setUsers(loadUsers());
    setUserId(localStorage.getItem(SESSION_KEY));
    setHydrated(true);
  }, []);

  const current = users.find((u) => u.id === userId) || null;

  const signup = useCallback((name: string, pw: string): { ok: boolean; error?: string } => {
    const n = name.trim();
    if (!n || !pw) return { ok: false, error: "이름과 비밀번호를 입력하세요." };
    const list = loadUsers();
    if (list.some((u) => u.name === n)) return { ok: false, error: "이미 존재하는 이름입니다." };
    const u: User = { id: uid(), name: n, passHash: hash(pw), createdAt: Date.now() };
    const next = [...list, u];
    saveUsers(next);
    setUsers(next);
    setUserId(u.id);
    localStorage.setItem(SESSION_KEY, u.id);
    return { ok: true };
  }, []);

  const login = useCallback((name: string, pw: string): { ok: boolean; error?: string } => {
    const list = loadUsers();
    const u = list.find((x) => x.name === name.trim());
    if (!u || u.passHash !== hash(pw)) return { ok: false, error: "이름 또는 비밀번호가 올바르지 않습니다." };
    setUsers(list);
    setUserId(u.id);
    localStorage.setItem(SESSION_KEY, u.id);
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    setUserId(null);
    localStorage.removeItem(SESSION_KEY);
  }, []);

  return { hydrated, current, userId, signup, login, logout };
}
