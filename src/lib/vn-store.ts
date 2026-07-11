import { useCallback, useEffect, useState } from "react";

export type Choice = {
  id: string;
  label: string;
  targetId: string | null;
};

export type SceneNode = {
  id: string;
  title: string;
  scenario: string;
  choices: Choice[];
};

export type Project = {
  nodes: Record<string, SceneNode>;
  rootId: string;
};

export type Version = {
  id: string;
  label: string;
  createdAt: number;
  project: Project;
};

const STORAGE_KEY = "vn-editor:project:v1";
const VERSIONS_KEY = "vn-editor:versions:v1";

function uid(prefix = "n"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function createInitialProject(): Project {
  const rootId = uid("s");
  return {
    rootId,
    nodes: {
      [rootId]: {
        id: rootId,
        title: "시작 장면",
        scenario:
          "비 내리는 밤, 낡은 카페의 문이 조용히 열린다.\n\n주인공은 창가 자리에 앉은 누군가를 발견한다. 다가갈지, 돌아설지 결정해야 한다.",
        choices: [
          { id: uid("c"), label: "다가가서 말을 건다", targetId: null },
          { id: uid("c"), label: "조용히 자리를 뜬다", targetId: null },
        ],
      },
    },
  };
}

function loadProject(): Project {
  if (typeof window === "undefined") return createInitialProject();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialProject();
    return JSON.parse(raw) as Project;
  } catch {
    return createInitialProject();
  }
}

function loadVersions(): Version[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(VERSIONS_KEY);
    return raw ? (JSON.parse(raw) as Version[]) : [];
  } catch {
    return [];
  }
}

export function useVNStore() {
  const [project, setProject] = useState<Project>(() => createInitialProject());
  const [currentId, setCurrentId] = useState<string>("");
  const [versions, setVersions] = useState<Version[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const p = loadProject();
    setProject(p);
    setCurrentId(p.rootId);
    setVersions(loadVersions());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  }, [project, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(VERSIONS_KEY, JSON.stringify(versions));
  }, [versions, hydrated]);

  const current = project.nodes[currentId];

  const updateCurrent = useCallback(
    (patch: Partial<SceneNode>) => {
      setProject((p) => ({
        ...p,
        nodes: { ...p.nodes, [currentId]: { ...p.nodes[currentId], ...patch } },
      }));
    },
    [currentId],
  );

  const updateChoice = useCallback(
    (choiceId: string, patch: Partial<Choice>) => {
      setProject((p) => {
        const node = p.nodes[currentId];
        return {
          ...p,
          nodes: {
            ...p.nodes,
            [currentId]: {
              ...node,
              choices: node.choices.map((c) =>
                c.id === choiceId ? { ...c, ...patch } : c,
              ),
            },
          },
        };
      });
    },
    [currentId],
  );

  const createLinkedScene = useCallback(
    (choiceId: string) => {
      const newId = uid("s");
      setProject((p) => {
        const parent = p.nodes[currentId];
        const choice = parent.choices.find((c) => c.id === choiceId);
        const newNode: SceneNode = {
          id: newId,
          title: `장면 · ${choice?.label || "새 장면"}`.slice(0, 40),
          scenario: "",
          choices: [
            { id: uid("c"), label: "선택지 A", targetId: null },
            { id: uid("c"), label: "선택지 B", targetId: null },
          ],
        };
        return {
          ...p,
          nodes: {
            ...p.nodes,
            [newId]: newNode,
            [currentId]: {
              ...parent,
              choices: parent.choices.map((c) =>
                c.id === choiceId ? { ...c, targetId: newId } : c,
              ),
            },
          },
        };
      });
      setCurrentId(newId);
    },
    [currentId],
  );

  const saveVersion = useCallback(
    (label: string) => {
      const v: Version = {
        id: uid("v"),
        label: label || new Date().toLocaleString("ko-KR"),
        createdAt: Date.now(),
        project: JSON.parse(JSON.stringify(project)),
      };
      setVersions((vs) => [v, ...vs]);
    },
    [project],
  );

  const restoreVersion = useCallback((id: string) => {
    setVersions((vs) => {
      const v = vs.find((x) => x.id === id);
      if (v) {
        setProject(v.project);
        setCurrentId(v.project.rootId);
      }
      return vs;
    });
  }, []);

  const deleteVersion = useCallback((id: string) => {
    setVersions((vs) => vs.filter((v) => v.id !== id));
  }, []);

  const resetProject = useCallback(() => {
    const p = createInitialProject();
    setProject(p);
    setCurrentId(p.rootId);
  }, []);

  return {
    project,
    current,
    currentId,
    setCurrentId,
    updateCurrent,
    updateChoice,
    createLinkedScene,
    versions,
    saveVersion,
    restoreVersion,
    deleteVersion,
    resetProject,
    hydrated,
  };
}
