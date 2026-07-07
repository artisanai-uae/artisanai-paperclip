import { useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { agentsApi } from "../api/agents";
import { issuesApi } from "../api/issues";
import { goalsApi } from "../api/goals";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { PageSkeleton } from "../components/PageSkeleton";
import { AGENT_ROLE_LABELS, type Agent, type Issue } from "@paperclipai/shared";
import {
  mountAtlas,
  type AtlasAction,
  type AtlasInstance,
  type AtlasModel,
} from "../lib/pc-atlas/atlas";

const POLL_MS = 5000;

function mapAgentStatus(a: Agent): "running" | "paused" | "stopped" {
  switch (a.status) {
    case "paused":
    case "pending_approval":
      return "paused";
    case "error":
      return "stopped";
    default:
      return "running";
  }
}

function mapIssueStatus(s: Issue["status"]): "active" | "review" | "blocked" | "done" {
  if (s === "done") return "done";
  if (s === "in_review") return "review";
  if (s === "blocked") return "blocked";
  return "active";
}

function buildModel(
  companyName: string,
  goalTitle: string,
  spentCents: number,
  budgetCents: number,
  agents: Agent[],
  issues: Issue[],
): AtlasModel {
  const live = agents.filter((a) => a.status !== "terminated");
  const liveIds = new Set(live.map((a) => a.id));
  const issueIds = new Set(issues.map((i) => i.id));
  return {
    company: {
      name: companyName,
      goal: goalTitle,
      mrr: spentCents / 100,
      mrrTarget: Math.max(1, budgetCents / 100),
      metricLabel: "spent / mo",
      metricScale: 1,
    },
    agents: live.map((a) => ({
      id: a.id,
      name: a.name,
      role: a.title || AGENT_ROLE_LABELS[a.role] || a.role,
      parentId: a.reportsTo && liveIds.has(a.reportsTo) ? a.reportsTo : null,
      adapter: a.adapterType,
      budget: Math.max(1, a.budgetMonthlyCents / 100),
      spent: a.spentMonthlyCents / 100,
      beatEvery: 60,
      status: mapAgentStatus(a),
    })),
    tasks: issues
      .filter((i) => i.status !== "cancelled")
      .map((i) => ({
        id: i.id,
        title: i.title,
        ownerId: i.assigneeAgentId && liveIds.has(i.assigneeAgentId) ? i.assigneeAgentId : null,
        parentId: i.parentId && issueIds.has(i.parentId) ? i.parentId : null,
        status: mapIssueStatus(i.status),
      })),
  };
}

/** Structural fingerprint: when this changes, remount instead of patching. */
function orgShape(model: AtlasModel): string {
  return model.agents
    .map((a) => `${a.id}>${a.parentId ?? ""}`)
    .sort()
    .join("|");
}

/**
 * Atlas org view: the whole company as a living hierarchy — agents with
 * budget rings and heartbeats, tasks tracing their why-chain to the goal.
 * Data comes from the same react-query endpoints as the rest of the board;
 * scalar changes stream onto the map as animated deltas, structural changes
 * remount.
 */
export function OrgAtlas() {
  const { selectedCompanyId, selectedCompany } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();

  useEffect(() => {
    setBreadcrumbs([{ label: "Org Atlas" }]);
  }, [setBreadcrumbs]);

  const { data: agents, isLoading: agentsLoading } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: POLL_MS,
  });

  const { data: issues } = useQuery({
    queryKey: ["atlas-issues", selectedCompanyId],
    queryFn: () =>
      issuesApi.list(selectedCompanyId!, { limit: 200, sortField: "updated", sortDir: "desc" }),
    enabled: !!selectedCompanyId,
    refetchInterval: POLL_MS,
  });

  const { data: goals } = useQuery({
    queryKey: ["atlas-goals", selectedCompanyId],
    queryFn: () => goalsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const model = useMemo(() => {
    if (!selectedCompany || !agents) return null;
    const topGoal =
      goals?.find((g) => !g.parentId && g.status === "active") ?? goals?.find((g) => !g.parentId);
    return buildModel(
      selectedCompany.name,
      topGoal?.title || selectedCompany.description || "Set a company goal",
      selectedCompany.spentMonthlyCents ?? 0,
      selectedCompany.budgetMonthlyCents ?? 0,
      agents,
      issues ?? [],
    );
  }, [selectedCompany, agents, issues, goals]);

  const invalidate = useCallback(() => {
    if (!selectedCompanyId) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.agents.list(selectedCompanyId) });
    void queryClient.invalidateQueries({ queryKey: ["atlas-issues", selectedCompanyId] });
  }, [queryClient, selectedCompanyId]);

  const onAction = useCallback(
    async (action: AtlasAction) => {
      const companyId = selectedCompanyId ?? undefined;
      try {
        switch (action.type) {
          case "reorg":
            await agentsApi.update(action.agentId, { reportsTo: action.newManagerId }, companyId);
            break;
          case "budget":
            await agentsApi.update(
              action.agentId,
              { budgetMonthlyCents: Math.round(action.budget * 100) },
              companyId,
            );
            break;
          case "pause":
            await agentsApi.pause(action.agentId, companyId);
            break;
          case "resume":
            await agentsApi.resume(action.agentId, companyId);
            break;
          case "beat":
            await agentsApi.wakeup(
              action.agentId,
              { source: "on_demand", triggerDetail: "manual", reason: "Atlas: beat now" },
              companyId,
            );
            break;
          case "fire":
            await agentsApi.remove(action.agentId, companyId);
            break;
          case "hire":
            // Hiring needs adapter configuration; route to the full flow.
            window.location.assign("/agents/new");
            return;
        }
        invalidate();
      } catch (err) {
        console.warn(`[org-atlas] ${action.type} failed; next poll re-syncs:`, err);
        invalidate();
      }
    },
    [selectedCompanyId, invalidate],
  );
  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;

  const hostRef = useRef<HTMLDivElement | null>(null);
  const atlasRef = useRef<AtlasInstance | null>(null);
  const shapeRef = useRef<string>("");
  const prevRef = useRef<AtlasModel | null>(null);

  useEffect(() => {
    if (!model || !hostRef.current) return;
    const shape = orgShape(model);

    if (!atlasRef.current || shape !== shapeRef.current) {
      atlasRef.current?.destroy();
      atlasRef.current = mountAtlas(hostRef.current, {
        model,
        simulate: false,
        onAction: (a) => onActionRef.current(a),
      });
      shapeRef.current = shape;
      prevRef.current = model;
      return;
    }

    // Same structure: stream scalar deltas onto the live map.
    const atlas = atlasRef.current;
    const prev = prevRef.current;
    if (prev) {
      const prevAgents = new Map(prev.agents.map((a) => [a.id, a]));
      for (const a of model.agents) {
        const was = prevAgents.get(a.id);
        if (!was) continue;
        if ((a.spent ?? 0) > (was.spent ?? 0)) {
          atlas.applyEvent({ type: "beat", agentId: a.id, cost: (a.spent ?? 0) - (was.spent ?? 0) });
        }
        if (a.status !== was.status || a.budget !== was.budget) {
          atlas.applyEvent({
            type: "agent",
            agentId: a.id,
            patch: { status: a.status, budget: a.budget, spent: a.spent },
          });
        }
      }
      const prevTasks = new Map(prev.tasks.map((t) => [t.id, t]));
      for (const t of model.tasks) {
        const was = prevTasks.get(t.id);
        if (!was) atlas.applyEvent({ type: "task", task: t });
        else if (t.status === "done" && was.status !== "done") {
          atlas.applyEvent({ type: "taskDone", taskId: t.id });
        } else if (t.status !== was.status) atlas.applyEvent({ type: "task", task: t });
      }
      if (model.company.mrr !== prev.company.mrr) {
        atlas.applyEvent({ type: "company", patch: { mrr: model.company.mrr } });
      }
    }
    prevRef.current = model;
  }, [model]);

  useEffect(
    () => () => {
      atlasRef.current?.destroy();
      atlasRef.current = null;
    },
    [],
  );

  if (agentsLoading && !model) return <PageSkeleton />;

  return <div ref={hostRef} style={{ position: "relative", width: "100%", height: "100%", minHeight: 480 }} data-testid="org-atlas" />;
}

export default OrgAtlas;
