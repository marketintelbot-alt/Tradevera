import { useEffect, useMemo, useState } from "react";
import type { Project, Task } from "@tradevera/shared";
import { CalendarClock, CheckCircle2, FolderKanban, ListChecks, Plus, Rocket, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { useToast } from "@/components/common/ToastProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { useAuth } from "@/context/AuthContext";
import { ApiError, api } from "@/lib/api";

type TaskStatusFilter = "all" | "todo" | "in_progress" | "done";

const PROJECT_COLORS = ["#2CD5A4", "#F2B84B", "#5B8CFF", "#EE6A5D", "#7A5AF8", "#14B8A6"];
const TASK_TEMPLATES = [
  "Pre-market checklist + bias map",
  "Post-session execution review",
  "Risk audit and sizing reset",
  "Weekly playbook refresh",
  "Screenshot A+ setups for library",
  "Tag top 3 mistakes from recent losses"
];

function dueDateToInput(iso: string | null): string {
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function inputDateToIso(value: string): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(`${value}T23:59:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function priorityTone(priority: Task["priority"]): "neutral" | "warning" | "accent" {
  if (priority === "critical" || priority === "high") {
    return "warning";
  }
  if (priority === "medium") {
    return "accent";
  }
  return "neutral";
}

function statusBadgeTone(status: Task["status"]): "neutral" | "success" | "warning" {
  if (status === "done") {
    return "success";
  }
  if (status === "in_progress") {
    return "warning";
  }
  return "neutral";
}

export function ProjectsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"" | Task["priority"]>("");
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0]!);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDetails, setNewTaskDetails] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<Task["priority"]>("medium");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskProjectId, setNewTaskProjectId] = useState<"none" | string>("none");
  const [savingProject, setSavingProject] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDetails, setEditDetails] = useState("");
  const [editPriority, setEditPriority] = useState<Task["priority"]>("medium");
  const [editStatus, setEditStatus] = useState<Task["status"]>("todo");
  const [editDueDate, setEditDueDate] = useState("");
  const [editProjectId, setEditProjectId] = useState<"none" | string>("none");
  const [editEstimate, setEditEstimate] = useState("");

  const loadAll = async () => {
    setLoading(true);
    try {
      const [projectResponse, taskResponse] = await Promise.all([api.listProjects(), api.listTasks()]);
      setProjects(projectResponse.projects);
      setTasks(taskResponse.tasks);
      setNewTaskProjectId(projectResponse.projects[0]?.id ?? "none");
    } catch (error) {
      toast({
        title: "Failed to load workspace",
        description: error instanceof Error ? error.message : "Unexpected error",
        tone: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll().catch((error) => console.error(error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const projectTaskMap = useMemo(() => {
    const map = new Map<string, { total: number; done: number; open: number }>();
    for (const project of projects) {
      map.set(project.id, { total: 0, done: 0, open: 0 });
    }
    for (const task of tasks) {
      if (!task.project_id) {
        continue;
      }
      const stats = map.get(task.project_id);
      if (!stats) {
        continue;
      }
      stats.total += 1;
      if (task.status === "done") {
        stats.done += 1;
      } else {
        stats.open += 1;
      }
    }
    return map;
  }, [projects, tasks]);

  const metrics = useMemo(() => {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endToday = startToday + 24 * 60 * 60 * 1000;
    const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;

    const open = tasks.filter((task) => task.status !== "done").length;
    const inProgress = tasks.filter((task) => task.status === "in_progress").length;
    const dueToday = tasks.filter((task) => {
      if (!task.due_at || task.status === "done") {
        return false;
      }
      const due = new Date(task.due_at).getTime();
      return due >= startToday && due < endToday;
    }).length;
    const overdue = tasks.filter((task) => {
      if (!task.due_at || task.status === "done") {
        return false;
      }
      return new Date(task.due_at).getTime() < startToday;
    }).length;
    const completedThisWeek = tasks.filter((task) => task.completed_at && new Date(task.completed_at).getTime() >= weekAgo).length;
    const completionRate = tasks.length ? Math.round((tasks.filter((task) => task.status === "done").length / tasks.length) * 100) : 0;

    return {
      open,
      inProgress,
      dueToday,
      overdue,
      completedThisWeek,
      completionRate
    };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const projectMatch =
        activeProjectId === "all" ||
        (activeProjectId === "none" ? task.project_id === null : task.project_id === activeProjectId);
      const statusMatch = statusFilter === "all" || task.status === statusFilter;
      const priorityMatch = priorityFilter.length === 0 || task.priority === priorityFilter;
      const searchMatch =
        search.trim().length === 0 ||
        task.title.toLowerCase().includes(search.trim().toLowerCase()) ||
        (task.details ?? "").toLowerCase().includes(search.trim().toLowerCase());
      return projectMatch && statusMatch && priorityMatch && searchMatch;
    });
  }, [activeProjectId, priorityFilter, search, statusFilter, tasks]);

  const createProject = async () => {
    const name = newProjectName.trim();
    if (!name) {
      toast({ title: "Project name is required", tone: "error" });
      return;
    }

    setSavingProject(true);
    try {
      const response = await api.createProject({
        name,
        description: newProjectDescription.trim() || null,
        color: newProjectColor
      });
      setProjects((current) => [response.project, ...current]);
      setNewProjectName("");
      setNewProjectDescription("");
      toast({ title: "Project created", tone: "success" });
      if (activeProjectId === "all") {
        setActiveProjectId(response.project.id);
      }
    } catch (error) {
      toast({
        title: "Project creation failed",
        description: error instanceof Error ? error.message : "Unexpected error",
        tone: "error"
      });
    } finally {
      setSavingProject(false);
    }
  };

  const updateProjectStatus = async (project: Project, status: Project["status"]) => {
    try {
      const response = await api.updateProject(project.id, { status });
      setProjects((current) => current.map((item) => (item.id === project.id ? response.project : item)));
      toast({ title: "Project updated", tone: "success" });
    } catch (error) {
      toast({
        title: "Project update failed",
        description: error instanceof Error ? error.message : "Unexpected error",
        tone: "error"
      });
    }
  };

  const deleteProject = async (project: Project) => {
    const confirmed = window.confirm(`Delete project "${project.name}"? Tasks will move to Inbox.`);
    if (!confirmed) {
      return;
    }

    try {
      await api.deleteProject(project.id);
      setProjects((current) => current.filter((item) => item.id !== project.id));
      setTasks((current) => current.map((task) => (task.project_id === project.id ? { ...task, project_id: null } : task)));
      if (activeProjectId === project.id) {
        setActiveProjectId("all");
      }
      toast({ title: "Project deleted", tone: "success" });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unexpected error",
        tone: "error"
      });
    }
  };

  const createTask = async (overrides?: Partial<{ title: string; details: string | null; priority: Task["priority"] }>) => {
    const title = (overrides?.title ?? newTaskTitle).trim();
    if (!title) {
      toast({ title: "Task title is required", tone: "error" });
      return;
    }

    setSavingTask(true);
    try {
      const response = await api.createTask({
        project_id: newTaskProjectId === "none" ? null : newTaskProjectId,
        title,
        details: overrides?.details ?? (newTaskDetails.trim() || null),
        priority: overrides?.priority ?? newTaskPriority,
        due_at: inputDateToIso(newTaskDueDate)
      });
      setTasks((current) => [response.task, ...current]);
      if (!overrides) {
        setNewTaskTitle("");
        setNewTaskDetails("");
        setNewTaskDueDate("");
      }
      toast({ title: "Task added", tone: "success" });
    } catch (error) {
      if (error instanceof ApiError && error.status === 402) {
        toast({
          title: "Free plan expired",
          description: "Free plan access is capped at 50 days. Upgrade to Pro to continue creating tasks.",
          tone: "error"
        });
        return;
      }
      toast({
        title: "Task creation failed",
        description: error instanceof Error ? error.message : "Unexpected error",
        tone: "error"
      });
    } finally {
      setSavingTask(false);
    }
  };

  const addTemplateTasks = async () => {
    if (TASK_TEMPLATES.length === 0) {
      return;
    }
    setSavingTask(true);
    try {
      const created: Task[] = [];
      for (const template of TASK_TEMPLATES) {
        const response = await api.createTask({
          project_id: newTaskProjectId === "none" ? null : newTaskProjectId,
          title: template,
          priority: "medium"
        });
        created.push(response.task);
      }
      setTasks((current) => [...created, ...current]);
      toast({ title: "Template sprint loaded", description: `${created.length} tasks added.`, tone: "success" });
    } catch (error) {
      toast({
        title: "Template import failed",
        description: error instanceof Error ? error.message : "Unexpected error",
        tone: "error"
      });
    } finally {
      setSavingTask(false);
    }
  };

  const updateTask = async (task: Task, patch: Partial<Task>) => {
    try {
      const response = await api.updateTask(task.id, {
        project_id: patch.project_id === undefined ? undefined : patch.project_id,
        title: patch.title,
        details: patch.details,
        status: patch.status,
        priority: patch.priority,
        due_at: patch.due_at,
        estimate_minutes: patch.estimate_minutes
      });
      setTasks((current) => current.map((item) => (item.id === task.id ? response.task : item)));
    } catch (error) {
      toast({
        title: "Task update failed",
        description: error instanceof Error ? error.message : "Unexpected error",
        tone: "error"
      });
    }
  };

  const removeTask = async (task: Task) => {
    const confirmed = window.confirm(`Delete task "${task.title}"?`);
    if (!confirmed) {
      return;
    }

    try {
      await api.deleteTask(task.id);
      setTasks((current) => current.filter((item) => item.id !== task.id));
      toast({ title: "Task deleted", tone: "success" });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unexpected error",
        tone: "error"
      });
    }
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDetails(task.details ?? "");
    setEditPriority(task.priority);
    setEditStatus(task.status);
    setEditDueDate(dueDateToInput(task.due_at));
    setEditProjectId(task.project_id ?? "none");
    setEditEstimate(task.estimate_minutes ? String(task.estimate_minutes) : "");
  };

  const saveEditTask = async () => {
    if (!editingTask) {
      return;
    }

    try {
      const response = await api.updateTask(editingTask.id, {
        title: editTitle.trim(),
        details: editDetails.trim() || null,
        priority: editPriority,
        status: editStatus,
        due_at: inputDateToIso(editDueDate),
        project_id: editProjectId === "none" ? null : editProjectId,
        estimate_minutes: editEstimate.trim() ? Number(editEstimate) : null
      });
      setTasks((current) => current.map((item) => (item.id === editingTask.id ? response.task : item)));
      setEditingTask(null);
      toast({ title: "Task saved", tone: "success" });
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Unexpected error",
        tone: "error"
      });
    }
  };

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const project of projects) {
      map.set(project.id, project.name);
    }
    return map;
  }, [projects]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Projects & Tasks"
          subtitle="Execution operating system for goals, projects, and actionable tasks. Available on Free and Pro."
          action={
            <div className="flex items-center gap-2">
              <Badge tone="neutral">{projects.length} projects</Badge>
              <Badge tone="neutral">{tasks.length} tasks</Badge>
            </div>
          }
        />
        <p className="text-sm text-ink-700">
          Build project-based routines, run recurring checklists, and track daily execution quality in one place.
          {user?.plan === "free" && user.freeDaysRemaining !== null
            ? ` Free plan currently has ${user.freeDaysRemaining} day${user.freeDaysRemaining === 1 ? "" : "s"} remaining and a 50-trade cap.`
            : ""}
        </p>
      </Card>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Card>
          <p className="text-xs uppercase tracking-[0.12em] text-ink-700">Open</p>
          <p className="mt-2 text-2xl font-semibold text-ink-900">{metrics.open}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.12em] text-ink-700">In progress</p>
          <p className="mt-2 text-2xl font-semibold text-ink-900">{metrics.inProgress}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.12em] text-ink-700">Due today</p>
          <p className="mt-2 text-2xl font-semibold text-ink-900">{metrics.dueToday}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.12em] text-ink-700">Overdue</p>
          <p className="mt-2 text-2xl font-semibold text-ink-900">{metrics.overdue}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.12em] text-ink-700">Completed 7d</p>
          <p className="mt-2 text-2xl font-semibold text-ink-900">{metrics.completedThisWeek}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.12em] text-ink-700">Completion</p>
          <p className="mt-2 text-2xl font-semibold text-ink-900">{metrics.completionRate}%</p>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[360px,1fr]">
        <Card>
          <CardHeader title="Projects" subtitle="Group tasks by objective and timeline." />
          <div className="space-y-3">
            <Input
              label="New project name"
              value={newProjectName}
              onChange={(event) => setNewProjectName(event.target.value)}
              placeholder="Q2 consistency sprint"
            />
            <Input
              label="Description"
              value={newProjectDescription}
              onChange={(event) => setNewProjectDescription(event.target.value)}
              placeholder="Define objective, constraints, and target behavior."
            />

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-ink-800">Color</span>
              <div className="flex flex-wrap gap-2">
                {PROJECT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="h-8 w-8 rounded-full border-2"
                    style={{
                      backgroundColor: color,
                      borderColor: newProjectColor === color ? "#111A2E" : "rgba(17,26,46,0.12)"
                    }}
                    onClick={() => setNewProjectColor(color)}
                    aria-label={`Select ${color}`}
                  />
                ))}
              </div>
            </label>

            <Button onClick={createProject} loading={savingProject} className="w-full gap-2">
              <Plus className="h-4 w-4" /> Create project
            </Button>
          </div>

          <div className="mt-5 space-y-2">
            <button
              type="button"
              onClick={() => setActiveProjectId("all")}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                activeProjectId === "all" ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-white text-ink-900"
              }`}
            >
              All projects
            </button>

            {projects.length === 0 ? (
              <p className="rounded-lg border border-dashed border-ink-200 p-3 text-sm text-ink-700">
                No projects yet. Start with one main objective, then break it into tasks.
              </p>
            ) : (
              projects.map((project) => {
                const stats = projectTaskMap.get(project.id) ?? { total: 0, done: 0, open: 0 };
                const progress = stats.total === 0 ? 0 : Math.round((stats.done / stats.total) * 100);
                return (
                  <div
                    key={project.id}
                    className={`rounded-xl border p-3 ${activeProjectId === project.id ? "border-ink-900 bg-ink-100/70" : "border-ink-200 bg-white"}`}
                  >
                    <button type="button" className="w-full text-left" onClick={() => setActiveProjectId(project.id)}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: project.color }} />
                          <p className="text-sm font-semibold text-ink-900">{project.name}</p>
                        </div>
                        <Badge tone={project.status === "active" ? "success" : "neutral"}>{project.status}</Badge>
                      </div>
                      {project.description ? <p className="mt-1 text-xs text-ink-700">{project.description}</p> : null}
                    </button>

                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-ink-700">
                        <span>{stats.done}/{stats.total} done</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-ink-100">
                        <div className="h-1.5 rounded-full" style={{ width: `${progress}%`, backgroundColor: project.color }} />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <select
                        className="h-8 flex-1 rounded-lg border border-ink-200 bg-white px-2 text-xs text-ink-900"
                        value={project.status}
                        onChange={(event) => updateProjectStatus(project, event.target.value as Project["status"])}
                      >
                        <option value="active">active</option>
                        <option value="paused">paused</option>
                        <option value="completed">completed</option>
                        <option value="archived">archived</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => deleteProject(project)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-ink-700 hover:bg-ink-100"
                        aria-label={`Delete ${project.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Task Command Center" subtitle="Capture, prioritize, execute, and review." />
            <div className="grid gap-3 lg:grid-cols-[1.2fr,1fr,0.8fr,0.8fr,auto]">
              <Input
                label="Task title"
                value={newTaskTitle}
                onChange={(event) => setNewTaskTitle(event.target.value)}
                placeholder="Define invalidation before entry"
              />

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-ink-800">Project</span>
                <select
                  className="h-11 rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900"
                  value={newTaskProjectId}
                  onChange={(event) => setNewTaskProjectId(event.target.value as "none" | string)}
                >
                  <option value="none">Inbox</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-ink-800">Priority</span>
                <select
                  className="h-11 rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900"
                  value={newTaskPriority}
                  onChange={(event) => setNewTaskPriority(event.target.value as Task["priority"])}
                >
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                  <option value="critical">critical</option>
                </select>
              </label>

              <Input label="Due date" type="date" value={newTaskDueDate} onChange={(event) => setNewTaskDueDate(event.target.value)} />

              <div className="flex items-end">
                <Button loading={savingTask} onClick={() => createTask()} className="w-full gap-2 lg:w-auto">
                  <Plus className="h-4 w-4" /> Add task
                </Button>
              </div>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-[1fr,auto]">
              <Input
                label="Details (optional)"
                value={newTaskDetails}
                onChange={(event) => setNewTaskDetails(event.target.value)}
                placeholder="Add acceptance criteria, checklist, or context."
              />
              <div className="flex items-end">
                <Button variant="secondary" onClick={addTemplateTasks} loading={savingTask} className="w-full gap-2 lg:w-auto">
                  <Rocket className="h-4 w-4" />
                  Load template sprint
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Task Board" subtitle="Filter by status, project, priority, and text search." />

            <div className="flex flex-wrap items-center gap-3">
              <Tabs
                tabs={[
                  { key: "all", label: "All" },
                  { key: "todo", label: "To Do" },
                  { key: "in_progress", label: "In Progress" },
                  { key: "done", label: "Done" }
                ]}
                activeKey={statusFilter}
                onChange={(key) => setStatusFilter(key as TaskStatusFilter)}
              />
              <select
                className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900"
                value={activeProjectId}
                onChange={(event) => setActiveProjectId(event.target.value)}
              >
                <option value="all">All projects</option>
                <option value="none">Inbox only</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <select
                className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900"
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value as "" | Task["priority"])}
              >
                <option value="">All priorities</option>
                <option value="critical">critical</option>
                <option value="high">high</option>
                <option value="medium">medium</option>
                <option value="low">low</option>
              </select>
            </div>

            <div className="mt-3">
              <Input
                label="Search tasks"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Find by title or details"
              />
            </div>

            <div className="mt-4 space-y-2">
              {filteredTasks.length === 0 ? (
                <EmptyState
                  title="No matching tasks"
                  description="Create a task, loosen filters, or load templates to kickstart your process system."
                  actionLabel="Add starter task"
                  onAction={() => createTask({ title: "Define top 3 execution priorities for tomorrow", priority: "high", details: null })}
                />
              ) : (
                filteredTasks.map((task) => {
                  const dueMs = task.due_at ? new Date(task.due_at).getTime() : null;
                  const overdue = dueMs !== null && dueMs < new Date().setHours(0, 0, 0, 0) && task.status !== "done";
                  return (
                    <div
                      key={task.id}
                      className={`rounded-xl border p-3 ${
                        task.status === "done"
                          ? "border-mint-500/30 bg-mint-100/30"
                          : overdue
                            ? "border-coral-500/40 bg-coral-100/30"
                            : "border-ink-200 bg-white"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1">
                          <button
                            type="button"
                            className="text-left text-sm font-semibold text-ink-900 underline-offset-4 hover:underline"
                            onClick={() => openEditTask(task)}
                          >
                            {task.title}
                          </button>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={statusBadgeTone(task.status)}>{task.status.replace("_", " ")}</Badge>
                            <Badge tone={priorityTone(task.priority)}>{task.priority}</Badge>
                            <Badge tone="neutral">{task.project_id ? projectNameById.get(task.project_id) ?? "Unknown project" : "Inbox"}</Badge>
                            {task.due_at ? (
                              <span className={`inline-flex items-center gap-1 text-xs ${overdue ? "text-coral-500" : "text-ink-700"}`}>
                                <CalendarClock className="h-3.5 w-3.5" />
                                {new Date(task.due_at).toLocaleDateString()}
                              </span>
                            ) : null}
                            {task.estimate_minutes ? <span className="text-xs text-ink-700">{task.estimate_minutes} min</span> : null}
                          </div>
                          {task.details ? <p className="text-xs text-ink-700">{task.details}</p> : null}
                        </div>

                        <div className="flex items-center gap-2">
                          {task.status !== "done" ? (
                            <Button size="sm" variant="secondary" className="gap-2" onClick={() => updateTask(task, { status: "done" })}>
                              <CheckCircle2 className="h-4 w-4" />
                              Done
                            </Button>
                          ) : (
                            <Button size="sm" variant="secondary" onClick={() => updateTask(task, { status: "todo" })}>
                              Reopen
                            </Button>
                          )}
                          {task.status === "todo" ? (
                            <Button size="sm" onClick={() => updateTask(task, { status: "in_progress" })} className="gap-2">
                              <ListChecks className="h-4 w-4" />
                              Start
                            </Button>
                          ) : null}
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-ink-700 hover:bg-ink-100"
                            onClick={() => removeTask(task)}
                            aria-label={`Delete ${task.title}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </section>

      <Modal open={Boolean(editingTask)} onClose={() => setEditingTask(null)} title="Edit task">
        <div className="space-y-4">
          <Input label="Title" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
          <Input label="Details" value={editDetails} onChange={(event) => setEditDetails(event.target.value)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-ink-800">Status</span>
              <select
                className="h-11 rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900"
                value={editStatus}
                onChange={(event) => setEditStatus(event.target.value as Task["status"])}
              >
                <option value="todo">todo</option>
                <option value="in_progress">in_progress</option>
                <option value="done">done</option>
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-ink-800">Priority</span>
              <select
                className="h-11 rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900"
                value={editPriority}
                onChange={(event) => setEditPriority(event.target.value as Task["priority"])}
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
                <option value="critical">critical</option>
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Input label="Due date" type="date" value={editDueDate} onChange={(event) => setEditDueDate(event.target.value)} />
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-ink-800">Project</span>
              <select
                className="h-11 rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900"
                value={editProjectId}
                onChange={(event) => setEditProjectId(event.target.value as "none" | string)}
              >
                <option value="none">Inbox</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="Estimate (min)"
              type="number"
              min={1}
              max={1440}
              value={editEstimate}
              onChange={(event) => setEditEstimate(event.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditingTask(null)}>
              Cancel
            </Button>
            <Button onClick={saveEditTask} className="gap-2">
              <FolderKanban className="h-4 w-4" />
              Save task
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
