import { useCallback, useEffect, useMemo, useState } from "react";

export type Choice = { id: string; label: string; targetId: string | null };
export type SceneNode = { id: string; title: string; scenario: string; choices: Choice[] };
export type SceneMap = Record<string, SceneNode>;
export type Draft = { rootId: string; nodes: SceneMap };
export type Version = { id: string; label: string; createdAt: number; draft: Draft };
export type Project = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  draft: Draft;
  versions: Version[];
};

const PROJECTS_KEY = (uid: string) => `vn:projects:${uid}:v1`;

function id(p: string) {
  return `${p}_${Math.random().toString(36).slice(2, 9)}`;
}

function starterDraft(): Draft {
  const root = id("s");
  return {
    rootId: root,
    nodes: {
      [root]: {
        id: root,
        title: "시작 장면",
        scenario:
          "이곳에 첫 장면의 대사와 내레이션을 적어보세요.\n\n독자가 어떤 상황에 놓였는지, 무엇을 보고 듣는지 자유롭게 서술해도 좋아요.",
        choices: [
          { id: id("c"), label: "선택지 A", targetId: null },
          { id: id("c"), label: "선택지 B", targetId: null },
        ],
      },
    },
  };
}

function loadProjects(uid: string): Project[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(PROJECTS_KEY(uid)) || "[]");
  } catch {
    return [];
  }
}

export function useProjects(userId: string | null) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!userId) {
      setProjects([]);
      setHydrated(true);
      return;
    }
    setProjects(loadProjects(userId));
    setHydrated(true);
  }, [userId]);

  useEffect(() => {
    if (!hydrated || !userId) return;
    localStorage.setItem(PROJECTS_KEY(userId), JSON.stringify(projects));
  }, [projects, userId, hydrated]);

  const createProject = useCallback((name: string): Project => {
    const draft = starterDraft();
    const v1: Version = {
      id: id("v"),
      label: "v1 · 초기 버전",
      createdAt: Date.now(),
      draft: JSON.parse(JSON.stringify(draft)),
    };
    const p: Project = {
      id: id("p"),
      name: name.trim() || "새 프로젝트",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      draft,
      versions: [v1],
    };
    setProjects((ps) => [p, ...ps]);
    return p;
  }, []);

  const deleteProject = useCallback((pid: string) => {
    setProjects((ps) => ps.filter((p) => p.id !== pid));
  }, []);

  const renameProject = useCallback((pid: string, name: string) => {
    setProjects((ps) => ps.map((p) => (p.id === pid ? { ...p, name, updatedAt: Date.now() } : p)));
  }, []);

  const updateDraft = useCallback((pid: string, updater: (d: Draft) => Draft) => {
    setProjects((ps) =>
      ps.map((p) => (p.id === pid ? { ...p, draft: updater(p.draft), updatedAt: Date.now() } : p)),
    );
  }, []);

  // 저장: 현재 드래프트를 가장 최신 버전에 덮어쓴다
  const saveOverVersion = useCallback((pid: string) => {
    setProjects((ps) =>
      ps.map((p) => {
        if (p.id !== pid) return p;
        const versions = [...p.versions];
        if (versions.length === 0) {
          versions.push({
            id: id("v"),
            label: "v1",
            createdAt: Date.now(),
            draft: JSON.parse(JSON.stringify(p.draft)),
          });
        } else {
          versions[0] = {
            ...versions[0],
            createdAt: Date.now(),
            draft: JSON.parse(JSON.stringify(p.draft)),
          };
        }
        return { ...p, versions, updatedAt: Date.now() };
      }),
    );
  }, []);

  // 새 버전 생성: 드래프트 스냅샷을 새 버전으로 추가
  const createVersion = useCallback((pid: string, label: string) => {
    setProjects((ps) =>
      ps.map((p) => {
        if (p.id !== pid) return p;
        const v: Version = {
          id: id("v"),
          label: label.trim() || `v${p.versions.length + 1}`,
          createdAt: Date.now(),
          draft: JSON.parse(JSON.stringify(p.draft)),
        };
        return { ...p, versions: [v, ...p.versions], updatedAt: Date.now() };
      }),
    );
  }, []);

  const restoreVersion = useCallback((pid: string, vid: string) => {
    setProjects((ps) =>
      ps.map((p) => {
        if (p.id !== pid) return p;
        const v = p.versions.find((x) => x.id === vid);
        if (!v) return p;
        return { ...p, draft: JSON.parse(JSON.stringify(v.draft)), updatedAt: Date.now() };
      }),
    );
  }, []);

  const deleteVersion = useCallback((pid: string, vid: string) => {
    setProjects((ps) =>
      ps.map((p) => (p.id === pid ? { ...p, versions: p.versions.filter((v) => v.id !== vid) } : p)),
    );
  }, []);

  const importProject = useCallback((raw: unknown): Project | null => {
    try {
      const src = raw as Partial<Project>;
      if (!src || !src.draft || !(src.draft as Draft).nodes) return null;
      const p: Project = {
        id: id("p"),
        name: (src.name || "가져온 프로젝트").toString(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        draft: JSON.parse(JSON.stringify(src.draft)),
        versions: Array.isArray(src.versions)
          ? src.versions.map((v) => ({
              id: id("v"),
              label: v.label || "가져온 버전",
              createdAt: v.createdAt || Date.now(),
              draft: JSON.parse(JSON.stringify(v.draft)),
            }))
          : [],
      };
      if (p.versions.length === 0) {
        p.versions = [{
          id: id("v"),
          label: "v1 · 가져옴",
          createdAt: Date.now(),
          draft: JSON.parse(JSON.stringify(p.draft)),
        }];
      }
      setProjects((ps) => [p, ...ps]);
      return p;
    } catch {
      return null;
    }
  }, []);

  return {
    hydrated,
    projects,
    createProject,
    deleteProject,
    renameProject,
    updateDraft,
    saveOverVersion,
    createVersion,
    restoreVersion,
    deleteVersion,
    importProject,
  };
}

// ---- Draft-level helpers (pure) ----
export const draftOps = {
  makeChoiceId: () => id("c"),
  makeSceneId: () => id("s"),
  updateNode(d: Draft, nodeId: string, patch: Partial<SceneNode>): Draft {
    return { ...d, nodes: { ...d.nodes, [nodeId]: { ...d.nodes[nodeId], ...patch } } };
  },
  updateChoice(d: Draft, nodeId: string, choiceId: string, patch: Partial<Choice>): Draft {
    const n = d.nodes[nodeId];
    return {
      ...d,
      nodes: {
        ...d.nodes,
        [nodeId]: {
          ...n,
          choices: n.choices.map((c) => (c.id === choiceId ? { ...c, ...patch } : c)),
        },
      },
    };
  },
  addChoice(d: Draft, nodeId: string): Draft {
    const n = d.nodes[nodeId];
    return {
      ...d,
      nodes: {
        ...d.nodes,
        [nodeId]: {
          ...n,
          choices: [...n.choices, { id: id("c"), label: "새 선택지", targetId: null }],
        },
      },
    };
  },
  removeChoice(d: Draft, nodeId: string, choiceId: string): Draft {
    const n = d.nodes[nodeId];
    return {
      ...d,
      nodes: {
        ...d.nodes,
        [nodeId]: { ...n, choices: n.choices.filter((c) => c.id !== choiceId) },
      },
    };
  },
  createLinked(d: Draft, nodeId: string, choiceId: string): { draft: Draft; newId: string } {
    const newId = id("s");
    const parent = d.nodes[nodeId];
    const choice = parent.choices.find((c) => c.id === choiceId);
    const label = choice?.label || "새 장면";
    const newNode: SceneNode = {
      id: newId,
      title: label.slice(0, 30),
      scenario: "",
      choices: [
        { id: id("c"), label: "선택지 A", targetId: null },
        { id: id("c"), label: "선택지 B", targetId: null },
      ],
    };
    return {
      newId,
      draft: {
        ...d,
        nodes: {
          ...d.nodes,
          [newId]: newNode,
          [nodeId]: {
            ...parent,
            choices: parent.choices.map((c) =>
              c.id === choiceId ? { ...c, targetId: newId } : c,
            ),
          },
        },
      },
    };
  },
};

export function usePath(draft: Draft | undefined) {
  const [path, setPath] = useState<string[]>([]);

  useEffect(() => {
    if (!draft) return;
    setPath((prev) => {
      if (prev.length > 0 && prev.every((id) => draft.nodes[id])) return prev;
      return [draft.rootId];
    });
  }, [draft?.rootId, draft]);

  const push = useCallback((sceneId: string) => {
    setPath((p) => [...p, sceneId]);
  }, []);
  const goto = useCallback((index: number) => {
    setPath((p) => p.slice(0, index + 1));
  }, []);
  const reset = useCallback(() => {
    if (draft) setPath([draft.rootId]);
  }, [draft]);
  const setFullPath = useCallback((ids: string[]) => {
    setPath(ids.length > 0 ? ids : draft ? [draft.rootId] : []);
  }, [draft]);

  const currentId = path[path.length - 1];
  const stack = useMemo(
    () => (draft ? path.map((id) => draft.nodes[id]).filter(Boolean) : []),
    [path, draft],
  );

  return { path, stack, currentId, push, goto, reset, setFullPath };
}

/** Path from root to targetId via BFS (leftmost tie-break). */
export function findPathTo(draft: Draft, targetId: string): string[] {
  if (targetId === draft.rootId) return [draft.rootId];
  const parent: Record<string, string> = {};
  const q: string[] = [draft.rootId];
  const seen = new Set<string>([draft.rootId]);
  while (q.length) {
    const id = q.shift()!;
    const n = draft.nodes[id];
    if (!n) continue;
    for (const c of n.choices) {
      if (!c.targetId || seen.has(c.targetId)) continue;
      seen.add(c.targetId);
      parent[c.targetId] = id;
      q.push(c.targetId);
    }
  }
  if (!parent[targetId] && targetId !== draft.rootId) return [targetId];
  const out: string[] = [targetId];
  let cur = targetId;
  while (parent[cur]) {
    cur = parent[cur];
    out.unshift(cur);
  }
  return out;
}

/** Comparator: numeric prefix first, then Korean/others by locale. */
export function compareSceneNames(a: string, b: string): number {
  const na = /^\s*(\d+)/.exec(a);
  const nb = /^\s*(\d+)/.exec(b);
  if (na && nb) {
    const d = parseInt(na[1], 10) - parseInt(nb[1], 10);
    if (d !== 0) return d;
    return a.localeCompare(b, "ko");
  }
  if (na && !nb) return -1;
  if (!na && nb) return 1;
  return a.localeCompare(b, "ko");
}
