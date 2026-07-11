import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-store";
import {
  useProjects,
  usePath,
  draftOps,
  findPathTo,
  compareSceneNames,
  type Project,
  type Draft,
  type SceneNode,
} from "@/lib/vn-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "비주얼 노벨 시나리오 에디터" },
      { name: "description", content: "분기점 기반 비주얼 노벨 시나리오 설계 도구" },
    ],
  }),
  component: App,
});

function App() {
  const auth = useAuth();
  const nav = useNavigate();
  const projects = useProjects(auth.userId);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (auth.hydrated && !auth.current) nav({ to: "/auth" });
  }, [auth.hydrated, auth.current, nav]);

  if (!auth.hydrated || !auth.current) return <div className="min-h-screen bg-cream" />;

  const active = projects.projects.find((p) => p.id === activeId) || null;

  return (
    <div className="min-h-screen bg-cream text-ink">
      <TopBar
        userName={auth.current.name}
        onLogout={() => { auth.logout(); nav({ to: "/auth" }); }}
        onHome={() => setActiveId(null)}
        activeName={active?.name}
      />
      {active ? (
        <ProjectEditor
          key={active.id}
          project={active}
          store={projects}
          onExit={() => setActiveId(null)}
        />
      ) : (
        <ProjectDashboard store={projects} onOpen={(id) => setActiveId(id)} />
      )}
    </div>
  );
}

/* --------------------------------- TopBar --------------------------------- */

function TopBar({
  userName,
  onLogout,
  onHome,
  activeName,
}: {
  userName: string;
  onLogout: () => void;
  onHome: () => void;
  activeName?: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-hairline/60 bg-cream/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <button onClick={onHome} className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground font-bold shadow-pin">V</span>
          <span className="font-display font-semibold tracking-tight">
            비주얼 노벨 에디터
          </span>
          {activeName && (
            <>
              <span className="mx-1 text-ink-muted">/</span>
              <span className="text-ink-muted text-sm">{activeName}</span>
            </>
          )}
        </button>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-ink-muted">
            {userName}
          </span>
          <button
            onClick={onLogout}
            className="rounded-full border border-hairline px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-muted"
          >
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}

/* ----------------------------- Project Dashboard --------------------------- */

const PIN_COLORS = ["bg-blush", "bg-sand", "bg-mint", "bg-sky", "bg-lavender", "bg-peach"];

function ProjectDashboard({
  store,
  onOpen,
}: {
  store: ReturnType<typeof useProjects>;
  onOpen: (id: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const create = () => {
    const p = store.createProject(name || "새 프로젝트");
    setCreating(false);
    setName("");
    onOpen(p.id);
  };

  const onImportPick = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const arr: unknown[] = Array.isArray(data) ? data : [data];
      let ok = 0;
      for (const raw of arr) {
        if (store.importProject(raw)) ok++;
      }
      alert(`${ok}개 프로젝트를 가져왔습니다.`);
    } catch {
      alert("JSON 파일을 읽을 수 없습니다.");
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-6 pt-10 pb-24">
      <div className="flex items-end justify-between mb-8 gap-3 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">내 프로젝트</h1>
          <p className="mt-2 text-ink-muted">이야기 하나마다 폴더 하나. 자유롭게 만들어보세요.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImportPick(f);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-full border border-hairline px-4 py-2.5 text-xs font-medium text-ink hover:bg-muted"
          >
            JSON 불러오기
          </button>
          <button
            onClick={() => setCreating(true)}
            className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-pin hover:opacity-90"
          >
            + 새 프로젝트
          </button>
        </div>
      </div>

      {store.projects.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-hairline bg-card/60 p-16 text-center">
          <p className="text-ink-muted">아직 프로젝트가 없어요. 첫 이야기를 시작해보세요.</p>
          <button
            onClick={() => setCreating(true)}
            className="mt-4 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white"
          >
            프로젝트 만들기
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {store.projects.map((p, i) => (
            <ProjectCard
              key={p.id}
              project={p}
              tint={PIN_COLORS[i % PIN_COLORS.length]}
              onOpen={() => onOpen(p.id)}
              onDelete={() => {
                if (confirm(`"${p.name}" 프로젝트를 삭제할까요?`)) store.deleteProject(p.id);
              }}
              onRename={(n) => store.renameProject(p.id, n)}
            />
          ))}
        </div>
      )}

      {creating && (
        <Modal onClose={() => setCreating(false)}>
          <h2 className="text-xl font-bold">새 프로젝트</h2>
          <p className="text-sm text-ink-muted mt-1">첫 번째 버전이 자동으로 만들어집니다.</p>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            placeholder="프로젝트 이름"
            className="mt-4 w-full rounded-xl border border-hairline bg-cream px-4 py-3 outline-none focus:border-primary focus:bg-card"
          />
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setCreating(false)} className="rounded-full px-4 py-2 text-sm text-ink-muted hover:bg-muted">취소</button>
            <button onClick={create} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">만들기</button>
          </div>
        </Modal>
      )}
    </main>
  );
}

function ProjectCard({
  project,
  tint,
  onOpen,
  onDelete,
  onRename,
}: {
  project: Project;
  tint: string;
  onOpen: () => void;
  onDelete: () => void;
  onRename: (n: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const nodeCount = Object.keys(project.draft.nodes).length;
  const preview = project.draft.nodes[project.draft.rootId]?.scenario || "";

  return (
    <div className="group rounded-3xl bg-card shadow-pin hover:shadow-pin-lg transition overflow-hidden">
      <button onClick={onOpen} className={`block w-full ${tint} p-6 text-left`}>
        <div className="h-32 overflow-hidden">
          <p className="font-write text-[13px] leading-relaxed text-ink/70 line-clamp-5">
            {preview || "빈 이야기…"}
          </p>
        </div>
      </button>
      <div className="p-5">
        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => { onRename(name || project.name); setEditing(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") { onRename(name || project.name); setEditing(false); } }}
            className="w-full rounded-lg border border-hairline bg-cream px-3 py-1.5 text-sm outline-none focus:border-primary"
          />
        ) : (
          <h3 className="font-semibold text-[17px] truncate">{project.name}</h3>
        )}
        <div className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
          <span>{nodeCount}개 장면</span>
          <span>·</span>
          <span>{project.versions.length}개 버전</span>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={onOpen} className="flex-1 rounded-full bg-ink py-2 text-xs font-medium text-white hover:opacity-90">
            열기
          </button>
          <button onClick={() => setEditing(true)} className="rounded-full border border-hairline px-3 py-2 text-xs text-ink-muted hover:bg-muted">
            이름
          </button>
          <button onClick={onDelete} className="rounded-full border border-hairline px-3 py-2 text-xs text-ink-muted hover:bg-blush/40">
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Project Editor ------------------------------ */

type MenuView = null | "versions" | "flow";

function ProjectEditor({
  project,
  store,
  onExit,
}: {
  project: Project;
  store: ReturnType<typeof useProjects>;
  onExit: () => void;
}) {
  const draft = project.draft;
  const path = usePath(draft);
  const [menu, setMenu] = useState<MenuView>(null);
  const [savedTick, setSavedTick] = useState(0);
  const [zoom, setZoom] = useState(100); // 50-200

  const update = (u: (d: Draft) => Draft) => store.updateDraft(project.id, u);

  const focusScene = (id: string) => {
    const idx = path.path.indexOf(id);
    if (idx >= 0) path.goto(idx);
    else path.push(id);
  };

  // From any scene (past or current), follow one of its choices.
  // If scene is a past scene, truncate path first so this becomes current.
  const followFromIndex = (i: number, node: SceneNode, cid: string) => {
    const c = node.choices.find((x) => x.id === cid);
    if (!c) return;
    // Truncate to this node
    path.goto(i);
    if (c.targetId) {
      path.push(c.targetId);
    } else {
      const { draft: nd, newId } = draftOps.createLinked(draft, node.id, cid);
      store.updateDraft(project.id, () => nd);
      setTimeout(() => path.push(newId), 0);
    }
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/[^\p{L}\p{N}_-]+/gu, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative">
      {/* Action bar */}
      <div className="sticky top-16 z-20 border-b border-hairline/60 bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3 gap-2 flex-wrap">
          <button onClick={onExit} className="text-sm text-ink-muted hover:text-ink">← 프로젝트 목록</button>
          <div className="flex items-center gap-2">
            {savedTick > 0 && (
              <span className="text-xs text-ink-muted">저장됨</span>
            )}
            <button
              onClick={exportJSON}
              className="rounded-full border border-hairline px-3 py-2 text-xs font-medium text-ink hover:bg-muted"
              title="JSON으로 백업"
            >
              내보내기
            </button>
            <button
              onClick={() => { store.saveOverVersion(project.id); setSavedTick(Date.now()); }}
              className="rounded-full border border-hairline px-4 py-2 text-xs font-medium text-ink hover:bg-muted"
              title="현재 버전에 덮어쓰기"
            >
              저장
            </button>
            <button
              onClick={() => setMenu("versions")}
              className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-white hover:opacity-90"
            >
              버전
            </button>
            <button
              onClick={() => setMenu("flow")}
              className="rounded-full border border-hairline px-4 py-2 text-xs font-medium text-ink hover:bg-muted"
            >
              전체 흐름
            </button>
          </div>
        </div>
      </div>

      {/* Scroll stack */}
      <main className="mx-auto max-w-4xl px-6 py-10 space-y-6">
        {path.stack.map((node, i) => {
          const isCurrent = i === path.stack.length - 1;
          const chosenNext = i < path.stack.length - 1 ? path.stack[i + 1] : null;
          const chosenChoice = chosenNext
            ? node.choices.find((c) => c.targetId === chosenNext.id)
            : null;
          return (
            <SceneCard
              key={`${node.id}-${i}`}
              node={node}
              index={i}
              total={path.stack.length}
              draft={draft}
              isCurrent={isCurrent}
              zoom={zoom}
              chosenChoiceId={chosenChoice?.id ?? null}
              onGoto={() => path.goto(i)}
              onUpdate={(patch) => update((d) => draftOps.updateNode(d, node.id, patch))}
              onUpdateChoice={(cid, patch) =>
                update((d) => draftOps.updateChoice(d, node.id, cid, patch))
              }
              onAddChoice={() => update((d) => draftOps.addChoice(d, node.id))}
              onRemoveChoice={(cid) => update((d) => draftOps.removeChoice(d, node.id, cid))}
              onFollowChoice={(cid) => followFromIndex(i, node, cid)}
              onLinkChoice={(cid, targetId) =>
                update((d) => draftOps.updateChoice(d, node.id, cid, { targetId }))
              }
            />
          );
        })}
      </main>

      {/* Word-style zoom bar */}
      <div className="fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-full bg-card px-4 py-2 shadow-pin-lg border border-hairline">
        <span className="text-[11px] text-ink-muted">글 크기</span>
        <button
          onClick={() => setZoom((z) => Math.max(50, z - 10))}
          className="grid h-6 w-6 place-items-center rounded-full hover:bg-muted text-sm"
          aria-label="축소"
        >−</button>
        <input
          type="range"
          min={50}
          max={200}
          step={5}
          value={zoom}
          onChange={(e) => setZoom(parseInt(e.target.value, 10))}
          className="w-32 accent-[color:var(--primary)]"
        />
        <button
          onClick={() => setZoom((z) => Math.min(200, z + 10))}
          className="grid h-6 w-6 place-items-center rounded-full hover:bg-muted text-sm"
          aria-label="확대"
        >+</button>
        <button
          onClick={() => setZoom(100)}
          className="min-w-[42px] rounded-full px-2 py-0.5 text-[11px] font-medium text-ink-muted hover:bg-muted"
        >
          {zoom}%
        </button>
      </div>

      {menu === "versions" && (
        <VersionsPanel
          project={project}
          store={store}
          onClose={() => setMenu(null)}
        />
      )}
      {menu === "flow" && (
        <FlowPanel
          draft={draft}
          currentId={path.currentId}
          onClose={() => setMenu(null)}
          onSelect={(id) => {
            path.setFullPath(findPathTo(draft, id));
            setMenu(null);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------- Scene Card -------------------------------- */

function SceneCard({
  node,
  index,
  total,
  draft,
  isCurrent,
  zoom,
  chosenChoiceId,
  onGoto,
  onUpdate,
  onUpdateChoice,
  onAddChoice,
  onRemoveChoice,
  onFollowChoice,
  onLinkChoice,
}: {
  node: SceneNode;
  index: number;
  total: number;
  draft: Draft;
  isCurrent: boolean;
  zoom: number;
  chosenChoiceId: string | null;
  onGoto: () => void;
  onUpdate: (patch: Partial<SceneNode>) => void;
  onUpdateChoice: (cid: string, patch: Partial<{ label: string; targetId: string | null }>) => void;
  onAddChoice: () => void;
  onRemoveChoice: (cid: string) => void;
  onFollowChoice: (cid: string) => void;
  onLinkChoice: (cid: string, targetId: string | null) => void;
}) {
  const dim = !isCurrent;
  const fontSize = Math.round(16 * (zoom / 100));

  return (
    <section
      className={`rounded-3xl bg-card shadow-pin transition ${dim ? "opacity-70 hover:opacity-100" : ""}`}
    >
      <div className="flex items-center justify-between border-b border-hairline/60 px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-primary text-xs font-bold">
            {index + 1}
          </span>
          <span className="text-xs font-medium text-ink-muted">
            {index === 0 ? "시작" : `${index}단계`} · {index === total - 1 ? "현재 편집" : "지나온 장면 · 더블클릭해서 돌아가기"}
          </span>
        </div>
      </div>

      <div className="p-6">
        <input
          value={node.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          disabled={!isCurrent}
          placeholder="장면 제목"
          className="w-full bg-transparent text-2xl font-semibold tracking-tight outline-none placeholder:text-ink/25 disabled:cursor-default"
          onDoubleClick={!isCurrent ? onGoto : undefined}
        />
        <textarea
          value={node.scenario}
          onChange={(e) => onUpdate({ scenario: e.target.value })}
          disabled={!isCurrent}
          onDoubleClick={!isCurrent ? onGoto : undefined}
          placeholder="여기에 대사와 내레이션을 적어보세요…"
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
          className="font-write mt-4 min-h-[280px] w-full resize-y bg-cream/50 rounded-2xl p-5 outline-none placeholder:text-ink/25 focus:bg-cream disabled:bg-transparent disabled:cursor-default"
          title={!isCurrent ? "더블클릭하면 이 시점으로 돌아갑니다" : undefined}
        />

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {node.choices.map((c, i) => {
            const isChosen = chosenChoiceId === c.id;
            const target = c.targetId ? draft.nodes[c.targetId] : null;
            return (
              <div
                key={c.id}
                className={`rounded-2xl border p-4 transition ${
                  isChosen
                    ? "border-primary bg-primary/5"
                    : "border-hairline bg-cream/40 hover:bg-cream"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-ink-muted">
                    선택지 {String.fromCharCode(65 + i)}
                  </span>
                  {isCurrent && node.choices.length > 2 && (
                    <button
                      onClick={() => onRemoveChoice(c.id)}
                      className="text-[11px] text-ink-muted hover:text-primary"
                    >
                      삭제
                    </button>
                  )}
                </div>
                <input
                  value={c.label}
                  onChange={(e) => onUpdateChoice(c.id, { label: e.target.value })}
                  disabled={!isCurrent}
                  placeholder="선택지 문구"
                  className="w-full bg-transparent text-[15px] font-medium outline-none placeholder:text-ink/25"
                />
                {isCurrent ? (
                  <div className="mt-3 flex items-center gap-2">
                    <ScenePicker
                      draft={draft}
                      value={c.targetId}
                      excludeId={node.id}
                      onChange={(id) => onLinkChoice(c.id, id)}
                    />
                    <button
                      onClick={() => onFollowChoice(c.id)}
                      className="rounded-full bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground hover:opacity-90 whitespace-nowrap"
                    >
                      {target ? "따라가기 →" : "+ 새 장면"}
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="text-[11px] text-ink-muted truncate">
                      {target ? `→ ${target.title}` : "연결 없음"}
                    </div>
                    <button
                      onClick={() => onFollowChoice(c.id)}
                      className={`rounded-full px-3 py-1.5 text-[12px] font-semibold whitespace-nowrap ${
                        isChosen
                          ? "bg-muted text-ink-muted hover:bg-blush/40"
                          : "bg-primary text-primary-foreground hover:opacity-90"
                      }`}
                    >
                      {isChosen ? "선택됨" : target ? "이 선택지로 →" : "+ 새 장면"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {isCurrent && (
            <button
              onClick={onAddChoice}
              className="rounded-2xl border-2 border-dashed border-hairline p-4 text-sm text-ink-muted hover:border-primary hover:text-primary"
            >
              + 선택지 추가
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ Scene Picker ------------------------------ */

function ScenePicker({
  draft,
  value,
  excludeId,
  onChange,
}: {
  draft: Draft;
  value: string | null;
  excludeId: string;
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const options = useMemo(() => {
    const all = Object.values(draft.nodes).filter((n) => n.id !== excludeId);
    const sorted = [...all].sort((a, b) => compareSceneNames(a.title, b.title));
    const query = q.trim().toLowerCase();
    if (!query) return sorted;
    return sorted.filter(
      (n) =>
        n.title.toLowerCase().includes(query) ||
        n.scenario.toLowerCase().includes(query),
    );
  }, [draft, excludeId, q]);

  const current = value ? draft.nodes[value] : null;

  return (
    <div ref={rootRef} className="relative flex-1 min-w-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full truncate rounded-lg border border-hairline bg-card px-2 py-1.5 text-left text-[12px] outline-none hover:border-primary"
      >
        {current ? current.title : <span className="text-ink-muted">— 연결할 장면 선택 —</span>}
      </button>
      {open && (
        <div className="absolute z-40 mt-1 w-full max-h-72 overflow-hidden rounded-xl border border-hairline bg-card shadow-pin-lg">
          <div className="p-2 border-b border-hairline">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="장면 검색…"
              className="w-full rounded-lg bg-cream px-2 py-1.5 text-[12px] outline-none focus:bg-white"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            <li>
              <button
                onClick={() => { onChange(null); setOpen(false); }}
                className="block w-full px-3 py-1.5 text-left text-[12px] text-ink-muted hover:bg-muted"
              >
                — 연결 없음 —
              </button>
            </li>
            {options.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => { onChange(n.id); setOpen(false); setQ(""); }}
                  className={`block w-full px-3 py-1.5 text-left text-[12px] hover:bg-muted truncate ${
                    n.id === value ? "bg-primary/10 text-primary font-semibold" : ""
                  }`}
                >
                  {n.title}
                </button>
              </li>
            ))}
            {options.length === 0 && (
              <li className="px-3 py-3 text-center text-[11px] text-ink-muted">
                일치하는 장면이 없어요
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Versions Panel ----------------------------- */

function VersionsPanel({
  project,
  store,
  onClose,
}: {
  project: Project;
  store: ReturnType<typeof useProjects>;
  onClose: () => void;
}) {
  const [label, setLabel] = useState("");
  return (
    <SidePanel title="버전 관리" onClose={onClose}>
      <div className="rounded-2xl bg-cream/60 p-4">
        <p className="text-sm text-ink-muted mb-3">
          <span className="text-ink">저장</span> 은 최신 버전을 덮어쓰고, <span className="text-ink">새 버전 생성</span> 은 별도 스냅샷을 만듭니다.
        </p>
        <div className="flex gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="버전 이름 (예: 1장 완성)"
            className="flex-1 rounded-xl border border-hairline bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={() => { store.createVersion(project.id, label); setLabel(""); }}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            새 버전 생성
          </button>
        </div>
      </div>

      <ul className="mt-6 space-y-3">
        {project.versions.map((v, i) => (
          <li key={v.id} className="rounded-2xl bg-card shadow-pin p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold">{v.label}</span>
                  {i === 0 && (
                    <span className="rounded-full bg-mint px-2 py-0.5 text-[10px] font-medium">최신</span>
                  )}
                </div>
                <div className="mt-1 text-xs text-ink-muted">
                  {new Date(v.createdAt).toLocaleString("ko-KR")} · {Object.keys(v.draft.nodes).length}개 장면
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (confirm(`"${v.label}" 로 편집본을 되돌릴까요? 현재 편집본은 사라집니다.`))
                      store.restoreVersion(project.id, v.id);
                  }}
                  className="rounded-full border border-hairline px-3 py-1.5 text-xs hover:bg-muted"
                >
                  복원
                </button>
                <button
                  onClick={() => store.deleteVersion(project.id, v.id)}
                  className="rounded-full px-3 py-1.5 text-xs text-ink-muted hover:bg-blush/40 hover:text-primary"
                >
                  삭제
                </button>
              </div>
            </div>
          </li>
        ))}
        {project.versions.length === 0 && (
          <li className="rounded-2xl border-2 border-dashed border-hairline p-8 text-center text-sm text-ink-muted">
            아직 저장된 버전이 없습니다.
          </li>
        )}
      </ul>
    </SidePanel>
  );
}

/* -------------------------------- Flow Panel ------------------------------- */

type FlowLayout = {
  positions: Record<string, { x: number; y: number; w: number; h: number }>;
  width: number;
  height: number;
  edges: { from: string; to: string; fromIdx: number; total: number }[];
  levels: string[][];
};

function computeLayout(draft: Draft): FlowLayout {
  // Assign each reachable node a level = longest path from root (so shared descendants sit below all parents).
  const nodes = draft.nodes;
  const rootId = draft.rootId;
  const level: Record<string, number> = {};
  // Topological-ish: iterative relaxation
  const ids = Object.keys(nodes);
  ids.forEach((id) => (level[id] = 0));
  level[rootId] = 0;
  for (let pass = 0; pass < ids.length + 5; pass++) {
    let changed = false;
    for (const id of ids) {
      const n = nodes[id];
      for (const c of n.choices) {
        if (!c.targetId || !nodes[c.targetId]) continue;
        if (c.targetId === id) continue;
        const cand = level[id] + 1;
        if (cand > (level[c.targetId] ?? 0)) {
          level[c.targetId] = cand;
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  // Reachability from root only
  const reachable = new Set<string>();
  const dfs = (id: string) => {
    if (reachable.has(id) || !nodes[id]) return;
    reachable.add(id);
    nodes[id].choices.forEach((c) => c.targetId && dfs(c.targetId));
  };
  dfs(rootId);

  const levels: string[][] = [];
  reachable.forEach((id) => {
    const l = level[id] ?? 0;
    (levels[l] ||= []).push(id);
  });
  // Fill gaps
  for (let i = 0; i < levels.length; i++) levels[i] ||= [];

  // Sort each level: try to keep siblings grouped by their parent's position.
  // Multi-pass barycenter-like sort.
  for (let pass = 0; pass < 3; pass++) {
    for (let l = 1; l < levels.length; l++) {
      const parentIdx: Record<string, number> = {};
      levels[l - 1].forEach((pid, i) => (parentIdx[pid] = i));
      const score: Record<string, number> = {};
      for (const id of levels[l]) {
        // find parents in previous level
        const parents: number[] = [];
        for (const pid of levels[l - 1]) {
          const p = nodes[pid];
          if (!p) continue;
          p.choices.forEach((c, ci) => {
            if (c.targetId === id) parents.push(parentIdx[pid] * 10 + ci);
          });
        }
        score[id] = parents.length ? parents.reduce((a, b) => a + b, 0) / parents.length : 999;
      }
      levels[l].sort((a, b) => score[a] - score[b]);
    }
  }

  // Positions
  const NODE_W = 220;
  const NODE_H = 72;
  const H_GAP = 32;
  const V_GAP = 90;
  const maxCols = Math.max(1, ...levels.map((l) => l.length));
  const width = Math.max(600, maxCols * (NODE_W + H_GAP));
  const positions: Record<string, { x: number; y: number; w: number; h: number }> = {};
  levels.forEach((row, li) => {
    const rowWidth = row.length * NODE_W + (row.length - 1) * H_GAP;
    const startX = (width - rowWidth) / 2;
    row.forEach((id, ci) => {
      positions[id] = {
        x: startX + ci * (NODE_W + H_GAP),
        y: li * (NODE_H + V_GAP),
        w: NODE_W,
        h: NODE_H,
      };
    });
  });
  const height = levels.length * (NODE_H + V_GAP);

  const edges: FlowLayout["edges"] = [];
  reachable.forEach((id) => {
    const n = nodes[id];
    if (!n) return;
    n.choices.forEach((c, i) => {
      if (c.targetId && positions[c.targetId]) {
        edges.push({ from: id, to: c.targetId, fromIdx: i, total: n.choices.length });
      }
    });
  });

  return { positions, width, height, edges, levels };
}

function FlowPanel({
  draft,
  currentId,
  onClose,
  onSelect,
}: {
  draft: Draft;
  currentId: string;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const layout = useMemo(() => computeLayout(draft), [draft]);
  const orphans = useMemo(() => {
    return Object.values(draft.nodes).filter((n) => !layout.positions[n.id]);
  }, [draft, layout]);

  // Ensure layout re-measures on mount (no-op ref)
  const svgRef = useRef<SVGSVGElement>(null);
  useLayoutEffect(() => { /* trigger */ }, [layout]);

  return (
    <SidePanel title="전체 시나리오 흐름" onClose={onClose} wide>
      <p className="text-sm text-ink-muted mb-4">
        여러 갈래가 한 장면으로 모이면 하나의 노드로 합쳐 표시됩니다. 노드를 누르면 그 장면으로 이동합니다 (분기점에서는 왼쪽 선택지 기준).
      </p>

      <div className="rounded-2xl bg-card border border-hairline p-4 overflow-auto">
        <div className="relative mx-auto" style={{ width: layout.width, height: layout.height }}>
          <svg
            ref={svgRef}
            className="absolute inset-0 pointer-events-none"
            width={layout.width}
            height={layout.height}
          >
            {layout.edges.map((e, i) => {
              const from = layout.positions[e.from];
              const to = layout.positions[e.to];
              if (!from || !to) return null;
              // Anchor x on parent: distribute along bottom based on choice index
              const fx = from.x + (from.w * (e.fromIdx + 1)) / (e.total + 1);
              const fy = from.y + from.h;
              const tx = to.x + to.w / 2;
              const ty = to.y;
              const mid = (fy + ty) / 2;
              const d = `M ${fx} ${fy} C ${fx} ${mid}, ${tx} ${mid}, ${tx} ${ty}`;
              return (
                <path
                  key={i}
                  d={d}
                  fill="none"
                  stroke="rgba(0,0,0,0.35)"
                  strokeWidth={1.25}
                />
              );
            })}
          </svg>
          {Object.entries(layout.positions).map(([id, p]) => {
            const n = draft.nodes[id];
            if (!n) return null;
            return (
              <button
                key={id}
                onClick={() => onSelect(id)}
                style={{ left: p.x, top: p.y, width: p.w, height: p.h }}
                className={`absolute rounded-md border bg-[#d9d9d9] px-3 py-2 text-left transition hover:bg-[#c8c8c1] ${
                  id === currentId ? "ring-2 ring-primary border-primary" : "border-stone-400"
                }`}
              >
                <div className="text-[12px] font-semibold text-ink truncate">{n.title || "(제목 없음)"}</div>
                <div className="text-[10px] text-ink-muted truncate mt-0.5">
                  {n.scenario || "(비어 있음)"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {orphans.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-2 text-sm font-semibold text-ink-muted">
            연결되지 않은 장면 ({orphans.length})
          </h3>
          <ul className="grid grid-cols-2 gap-2">
            {orphans.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => onSelect(n.id)}
                  className="w-full rounded-xl border border-dashed border-hairline bg-card p-3 text-left hover:border-primary"
                >
                  <span className="text-sm font-medium">{n.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SidePanel>
  );
}

/* --------------------------------- Shared --------------------------------- */

function SidePanel({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-40 flex" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" />
      <div
        className={`relative ml-auto flex h-full w-full ${wide ? "max-w-5xl" : "max-w-2xl"} flex-col bg-cream shadow-pin-lg`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-3xl bg-card p-6 shadow-pin-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
