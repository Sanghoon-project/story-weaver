import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactElement } from "react";
import { useVNStore, type SceneNode } from "@/lib/vn-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "비주얼 노벨 시나리오 에디터" },
      { name: "description", content: "분기점 기반 비주얼 노벨 시나리오 설계 도구" },
      { property: "og:title", content: "비주얼 노벨 시나리오 에디터" },
      { property: "og:description", content: "분기점 기반 비주얼 노벨 시나리오 설계 도구" },
    ],
  }),
  component: Editor,
});

type MenuView = null | "projects" | "versions" | "flow";

function Editor() {
  const s = useVNStore();
  const [menu, setMenu] = useState<MenuView>(null);

  if (!s.hydrated || !s.current) {
    return <div className="min-h-screen bg-parchment" />;
  }

  return (
    <div className="min-h-screen bg-parchment text-ink">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-hairline bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenu("projects")}
              className="rounded-md bg-ink px-4 py-2 text-[13px] font-medium text-white transition hover:opacity-90"
            >
              메뉴
            </button>
            <span className="text-[13px] text-ink/60">시나리오 에디터</span>
          </div>
          <div className="flex items-center gap-2 text-[12px] text-ink/50">
            <span>현재 장면</span>
            <span className="rounded-md bg-parchment px-2 py-1 font-mono text-ink/80">
              {s.current.id}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-8">
        {/* Title */}
        <input
          value={s.current.title}
          onChange={(e) => s.updateCurrent({ title: e.target.value })}
          placeholder="장면 제목"
          className="w-full bg-transparent text-[34px] font-semibold tracking-tight text-ink outline-none placeholder:text-ink/25"
        />

        {/* Main scenario canvas */}
        <section className="mt-4 rounded-lg border border-hairline bg-canvas shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between border-b border-hairline px-6 py-3">
            <span className="text-[13px] font-semibold text-ink/70">시나리오</span>
            <span className="text-[12px] text-ink/40">
              대사 · 내레이션을 자유롭게 작성하세요
            </span>
          </div>
          <textarea
            value={s.current.scenario}
            onChange={(e) => s.updateCurrent({ scenario: e.target.value })}
            placeholder="여기에 시나리오를 입력하세요..."
            className="min-h-[520px] w-full resize-y bg-transparent p-6 text-[17px] leading-[1.7] text-ink outline-none placeholder:text-ink/25"
          />
        </section>

        {/* Choices */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {s.current.choices.map((choice, i) => {
            const target = choice.targetId ? s.project.nodes[choice.targetId] : null;
            return (
              <div
                key={choice.id}
                className="rounded-lg border border-hairline bg-canvas p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-ink/70">
                    선택지 {String.fromCharCode(65 + i)}
                  </span>
                  {target && (
                    <button
                      onClick={() => s.setCurrentId(target.id)}
                      className="text-[13px] font-medium text-primary hover:underline"
                    >
                      다음 장면으로 →
                    </button>
                  )}
                </div>
                <input
                  value={choice.label}
                  onChange={(e) =>
                    s.updateChoice(choice.id, { label: e.target.value })
                  }
                  placeholder="선택지 문구"
                  className="w-full border-b border-hairline bg-transparent pb-2 text-[17px] text-ink outline-none focus:border-primary placeholder:text-ink/25"
                />
                <div className="mt-4 flex items-center gap-2">
                  <select
                    value={choice.targetId ?? ""}
                    onChange={(e) =>
                      s.updateChoice(choice.id, {
                        targetId: e.target.value || null,
                      })
                    }
                    className="flex-1 rounded-md border border-hairline bg-pearl px-3 py-2 text-[13px] text-ink outline-none focus:border-primary"
                  >
                    <option value="">— 연결된 장면 없음 —</option>
                    {Object.values(s.project.nodes)
                      .filter((n) => n.id !== s.currentId)
                      .map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.title}
                        </option>
                      ))}
                  </select>
                  {!target && (
                    <button
                      onClick={() => s.createLinkedScene(choice.id)}
                      className="rounded-full bg-primary px-4 py-2 text-[13px] font-medium text-white transition hover:opacity-90"
                    >
                      + 새 장면
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {menu && <MenuPanel view={menu} onClose={() => setMenu(null)} setView={setMenu} store={s} />}
    </div>
  );
}

function MenuPanel({
  view,
  setView,
  onClose,
  store,
}: {
  view: MenuView;
  setView: (v: MenuView) => void;
  onClose: () => void;
  store: ReturnType<typeof useVNStore>;
}) {
  return (
    <div className="fixed inset-0 z-30 flex" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative ml-auto flex h-full w-full max-w-3xl flex-col bg-canvas shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
          <div className="flex gap-1">
            {(
              [
                ["projects", "장면 관리"],
                ["versions", "버전 관리"],
                ["flow", "전체 흐름"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setView(k)}
                className={`rounded-md px-4 py-2 text-[13px] font-medium transition ${
                  view === k
                    ? "bg-ink text-white"
                    : "text-ink/60 hover:bg-parchment"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-ink/50 hover:bg-parchment hover:text-ink"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {view === "projects" && <ProjectsView store={store} onClose={onClose} />}
          {view === "versions" && <VersionsView store={store} />}
          {view === "flow" && <FlowView store={store} onSelect={(id) => { store.setCurrentId(id); onClose(); }} />}
        </div>
      </div>
    </div>
  );
}

function ProjectsView({
  store,
  onClose,
}: {
  store: ReturnType<typeof useVNStore>;
  onClose: () => void;
}) {
  const nodes = Object.values(store.project.nodes);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[22px] font-semibold tracking-tight">장면 목록</h2>
        <button
          onClick={() => {
            if (confirm("프로젝트를 초기화할까요? (버전 기록은 유지됩니다)")) {
              store.resetProject();
              onClose();
            }
          }}
          className="rounded-md border border-hairline px-3 py-2 text-[13px] text-ink/70 hover:bg-parchment"
        >
          프로젝트 초기화
        </button>
      </div>
      <ul className="divide-y divide-hairline overflow-hidden rounded-lg border border-hairline">
        {nodes.map((n) => (
          <li
            key={n.id}
            className="flex items-center justify-between px-4 py-3 hover:bg-pearl"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[15px] font-medium">{n.title}</span>
                {n.id === store.project.rootId && (
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                    시작
                  </span>
                )}
              </div>
              <p className="mt-1 line-clamp-1 text-[13px] text-ink/50">
                {n.scenario || "(비어 있음)"}
              </p>
            </div>
            <button
              onClick={() => {
                store.setCurrentId(n.id);
                onClose();
              }}
              className="ml-4 text-[13px] font-medium text-primary hover:underline"
            >
              열기 →
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function VersionsView({ store }: { store: ReturnType<typeof useVNStore> }) {
  const [label, setLabel] = useState("");
  return (
    <div className="space-y-4">
      <h2 className="text-[22px] font-semibold tracking-tight">버전 관리</h2>
      <div className="flex gap-2 rounded-lg border border-hairline bg-pearl p-3">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="버전 이름 (예: 1장 완성)"
          className="flex-1 rounded-md border border-hairline bg-canvas px-3 py-2 text-[14px] outline-none focus:border-primary"
        />
        <button
          onClick={() => {
            store.saveVersion(label.trim());
            setLabel("");
          }}
          className="rounded-full bg-primary px-5 py-2 text-[13px] font-medium text-white hover:opacity-90"
        >
          현재 저장
        </button>
      </div>
      {store.versions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-hairline p-8 text-center text-[13px] text-ink/50">
          저장된 버전이 없습니다.
        </p>
      ) : (
        <ul className="divide-y divide-hairline overflow-hidden rounded-lg border border-hairline">
          {store.versions.map((v) => (
            <li key={v.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-[15px] font-medium">{v.label}</div>
                <div className="text-[12px] text-ink/50">
                  {new Date(v.createdAt).toLocaleString("ko-KR")} ·{" "}
                  {Object.keys(v.project.nodes).length}개 장면
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (confirm(`"${v.label}" 버전으로 복원할까요?`)) {
                      store.restoreVersion(v.id);
                    }
                  }}
                  className="rounded-md border border-hairline px-3 py-1.5 text-[13px] hover:bg-parchment"
                >
                  복원
                </button>
                <button
                  onClick={() => store.deleteVersion(v.id)}
                  className="rounded-md px-3 py-1.5 text-[13px] text-destructive hover:bg-destructive/10"
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FlowView({
  store,
  onSelect,
}: {
  store: ReturnType<typeof useVNStore>;
  onSelect: (id: string) => void;
}) {
  const rendered = useMemo(() => {
    const visited = new Set<string>();
    const walk = (id: string, depth: number): JSX.Element | null => {
      const node = store.project.nodes[id];
      if (!node) return null;
      const seen = visited.has(id);
      visited.add(id);
      return (
        <div key={`${id}-${depth}`} className="relative" style={{ marginLeft: depth * 20 }}>
          <button
            onClick={() => onSelect(id)}
            className={`group flex w-full items-start gap-3 rounded-md border border-hairline bg-canvas p-3 text-left transition hover:border-primary ${
              id === store.currentId ? "border-primary ring-1 ring-primary/30" : ""
            }`}
          >
            <span className="mt-0.5 rounded bg-parchment px-2 py-0.5 font-mono text-[11px] text-ink/60">
              {id}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-medium">{node.title}</div>
              <div className="mt-0.5 line-clamp-1 text-[12px] text-ink/50">
                {node.scenario || "(비어 있음)"}
              </div>
            </div>
          </button>
          {!seen && node.choices.length > 0 && (
            <div className="mt-2 space-y-2 border-l-2 border-hairline pl-4">
              {node.choices.map((c) => (
                <div key={c.id}>
                  <div className="mb-1 text-[12px] text-ink/60">
                    ↳ <span className="text-primary">{c.label || "(빈 선택지)"}</span>
                  </div>
                  {c.targetId ? (
                    walk(c.targetId, depth + 1)
                  ) : (
                    <div className="ml-4 rounded-md border border-dashed border-hairline p-2 text-[12px] text-ink/40">
                      연결된 장면 없음
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {seen && (
            <div className="ml-4 text-[11px] italic text-ink/40">
              ↺ 이미 방문한 장면 ({node.title})
            </div>
          )}
        </div>
      );
    };
    return walk(store.project.rootId, 0);
  }, [store.project, store.currentId, onSelect]);

  const orphans = Object.values(store.project.nodes).filter((n) => {
    const reachable = new Set<string>();
    const dfs = (id: string) => {
      if (reachable.has(id)) return;
      reachable.add(id);
      store.project.nodes[id]?.choices.forEach(
        (c) => c.targetId && dfs(c.targetId),
      );
    };
    dfs(store.project.rootId);
    return !reachable.has(n.id);
  });

  return (
    <div className="space-y-4">
      <h2 className="text-[22px] font-semibold tracking-tight">전체 시나리오 흐름</h2>
      <div className="space-y-2">{rendered}</div>
      {orphans.length > 0 && (
        <div>
          <h3 className="mb-2 mt-6 text-[13px] font-semibold text-ink/60">
            연결되지 않은 장면 ({orphans.length})
          </h3>
          <ul className="space-y-2">
            {orphans.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => onSelect(n.id)}
                  className="w-full rounded-md border border-dashed border-hairline bg-canvas p-3 text-left hover:border-primary"
                >
                  <span className="text-[14px] font-medium">{n.title}</span>
                  <span className="ml-2 font-mono text-[11px] text-ink/40">{n.id}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

declare global {
  namespace JSX {
    interface Element {}
  }
}
