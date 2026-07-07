export interface AtlasCompany {
  name: string;
  goal: string;
  mrr?: number;
  mrrTarget?: number;
  revenueRate?: number;
  metricLabel?: string;
  metricScale?: number;
}

export interface AtlasAgent {
  id: string;
  name: string;
  role: string;
  parentId?: string | null;
  adapter?: string;
  budget?: number;
  spent?: number;
  beatEvery?: number;
  status?: "running" | "paused" | "stopped";
  glyph?: string;
  revenue?: boolean;
}

export interface AtlasTask {
  id: string;
  title: string;
  ownerId: string | null;
  parentId?: string | null;
  status?: "active" | "review" | "blocked" | "done";
  progress?: number;
}

export interface AtlasModel {
  company: AtlasCompany;
  agents: AtlasAgent[];
  tasks: AtlasTask[];
}

export type AtlasAction =
  | { type: "reorg"; agentId: string; newManagerId: string | null }
  | { type: "hire"; managerId: string; agent: Partial<AtlasAgent> }
  | { type: "fire"; agentId: string }
  | { type: "pause"; agentId: string }
  | { type: "resume"; agentId: string }
  | { type: "beat"; agentId: string }
  | { type: "budget"; agentId: string; budget: number };

export type AtlasEvent =
  | { type: "beat"; agentId: string; cost?: number }
  | { type: "agent"; agentId: string; patch: Partial<AtlasAgent> }
  | { type: "task"; task: AtlasTask; agentId?: string }
  | { type: "taskDone"; taskId: string }
  | { type: "company"; patch: Partial<AtlasCompany> }
  | { type: "feed"; icon?: string; html: string; agentId?: string };

export interface AtlasInstance {
  applyEvent(evt: AtlasEvent): void;
  destroy(): void;
  drill(agentId: string | null): void;
  popout(): Promise<void>;
  fit(): void;
  select(agentId: string): void;
  setLayout(mode: "tree" | "radial"): void;
  getAgents(): Array<{
    id: string;
    name: string;
    role: string;
    status: string;
    parentId: string | null;
    spent: number;
    budget: number;
  }>;
}

export interface AtlasOptions {
  model: AtlasModel;
  simulate?: boolean;
  layout?: "tree" | "radial";
  onAction?: (action: AtlasAction) => void;
}

export function mountAtlas(rootEl: HTMLElement, opts: AtlasOptions): AtlasInstance;
export default mountAtlas;
