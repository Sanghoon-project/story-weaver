import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth-store";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "로그인 · 비주얼 노벨 에디터" },
      { name: "description", content: "개인 계정으로 로그인하고 프로젝트를 관리하세요." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const auth = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);

  if (!auth.hydrated) return <div className="min-h-screen bg-cream" />;
  if (auth.current) {
    // Already signed in — bounce home
    setTimeout(() => nav({ to: "/" }), 0);
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const res = mode === "login" ? auth.login(name, pw) : auth.signup(name, pw);
    if (!res.ok) setErr(res.error || "실패했습니다.");
    else nav({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-2xl font-bold shadow-pin-lg">
            V
          </div>
          <h1 className="mt-4 text-3xl font-bold text-ink">비주얼 노벨 에디터</h1>
          <p className="mt-2 text-sm text-ink-muted">
            나만의 이야기를 분기별로 설계하세요.
          </p>
        </div>

        <div className="rounded-3xl bg-card p-8 shadow-pin-lg">
          <div className="flex gap-1 rounded-full bg-muted p-1 mb-6">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setErr(null); }}
                className={`flex-1 rounded-full py-2 text-sm font-medium transition ${
                  mode === m ? "bg-card text-ink shadow-pin" : "text-ink-muted"
                }`}
              >
                {m === "login" ? "로그인" : "회원가입"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-ink-muted">이름</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="사용자 이름"
                autoComplete="username"
                className="mt-1 w-full rounded-xl border border-hairline bg-cream px-4 py-3 text-[15px] outline-none focus:border-primary focus:bg-card"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-muted">비밀번호</label>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="mt-1 w-full rounded-xl border border-hairline bg-cream px-4 py-3 text-[15px] outline-none focus:border-primary focus:bg-card"
              />
            </div>
            {err && (
              <div className="rounded-xl bg-blush/50 px-4 py-3 text-sm text-primary">{err}</div>
            )}
            <button
              type="submit"
              className="w-full rounded-full bg-primary py-3 text-[15px] font-semibold text-primary-foreground shadow-pin hover:opacity-90 transition"
            >
              {mode === "login" ? "로그인" : "가입하고 시작하기"}
            </button>
          </form>
          <p className="mt-6 text-center text-xs text-ink-muted">
            데이터는 이 브라우저에만 저장됩니다.
          </p>
        </div>
        <div className="mt-6 text-center">
          <Link to="/" className="text-xs text-ink-muted hover:text-ink">
            ← 홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}
