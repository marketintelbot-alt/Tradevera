import { projectSchema, projectUpdateSchema, taskListQuerySchema, taskSchema, taskUpdateSchema } from "@tradevera/shared";
import type { Hono } from "hono";
import type { AppEnv } from "./types";
import { requireAuth } from "./auth";
import { normalizeNullableNumber, normalizeNullableString, nowIso } from "./utils/security";

interface ProjectRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  status: "active" | "paused" | "completed" | "archived";
  created_at: string;
  updated_at: string;
}

interface TaskRow {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  details: string | null;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high" | "critical";
  due_at: string | null;
  completed_at: string | null;
  estimate_minutes: number | null;
  created_at: string;
  updated_at: string;
}

function serializeProject(row: ProjectRow) {
  return row;
}

function serializeTask(row: TaskRow) {
  return row;
}

async function projectExistsForUser(db: D1Database, projectId: string, userId: string): Promise<boolean> {
  const row = await db
    .prepare("SELECT id FROM projects WHERE id = ? AND user_id = ? LIMIT 1")
    .bind(projectId, userId)
    .first<{ id: string }>();
  return Boolean(row?.id);
}

async function getProjectById(db: D1Database, projectId: string, userId: string): Promise<ProjectRow | null> {
  const row = await db
    .prepare("SELECT * FROM projects WHERE id = ? AND user_id = ? LIMIT 1")
    .bind(projectId, userId)
    .first<ProjectRow>();
  return row ?? null;
}

async function getTaskById(db: D1Database, taskId: string, userId: string): Promise<TaskRow | null> {
  const row = await db
    .prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ? LIMIT 1")
    .bind(taskId, userId)
    .first<TaskRow>();
  return row ?? null;
}

export function registerProjectRoutes(app: Hono<AppEnv>) {
  app.get("/api/projects", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) {
      return auth;
    }

    const rows = await c.env.DB
      .prepare(
        [
          "SELECT * FROM projects WHERE user_id = ?",
          "ORDER BY",
          "CASE status",
          "WHEN 'active' THEN 0",
          "WHEN 'paused' THEN 1",
          "WHEN 'completed' THEN 2",
          "ELSE 3 END,",
          "updated_at DESC"
        ].join(" ")
      )
      .bind(auth.id)
      .all<ProjectRow>();

    return c.json({ projects: (rows.results ?? []).map((item) => serializeProject(item)) });
  });

  app.post("/api/projects", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) {
      return auth;
    }

    const payload = await c.req.json().catch(() => null);
    const parsed = projectSchema.safeParse(payload);
    if (!parsed.success) {
      return c.json({ error: "Invalid project payload", details: parsed.error.flatten() }, 400);
    }

    const timestamp = nowIso();
    const project: ProjectRow = {
      id: crypto.randomUUID(),
      user_id: auth.id,
      name: parsed.data.name.trim(),
      description: normalizeNullableString(parsed.data.description),
      color: parsed.data.color ?? "#2CD5A4",
      status: parsed.data.status ?? "active",
      created_at: timestamp,
      updated_at: timestamp
    };

    await c.env.DB
      .prepare(
        [
          "INSERT INTO projects (id, user_id, name, description, color, status, created_at, updated_at)",
          "VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        ].join(" ")
      )
      .bind(
        project.id,
        project.user_id,
        project.name,
        project.description,
        project.color,
        project.status,
        project.created_at,
        project.updated_at
      )
      .run();

    return c.json({ project: serializeProject(project) }, 201);
  });

  app.put("/api/projects/:id", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) {
      return auth;
    }

    const projectId = c.req.param("id");
    const existing = await getProjectById(c.env.DB, projectId, auth.id);
    if (!existing) {
      return c.json({ error: "Project not found" }, 404);
    }

    const payload = await c.req.json().catch(() => null);
    const parsed = projectUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      return c.json({ error: "Invalid project payload", details: parsed.error.flatten() }, 400);
    }

    if (Object.keys(parsed.data).length === 0) {
      return c.json({ error: "No project fields supplied" }, 400);
    }

    const updated: ProjectRow = {
      ...existing,
      name: parsed.data.name?.trim() ?? existing.name,
      description: parsed.data.description === undefined ? existing.description : normalizeNullableString(parsed.data.description),
      color: parsed.data.color ?? existing.color,
      status: parsed.data.status ?? existing.status,
      updated_at: nowIso()
    };

    await c.env.DB
      .prepare("UPDATE projects SET name = ?, description = ?, color = ?, status = ?, updated_at = ? WHERE id = ? AND user_id = ?")
      .bind(updated.name, updated.description, updated.color, updated.status, updated.updated_at, projectId, auth.id)
      .run();

    return c.json({ project: serializeProject(updated) });
  });

  app.delete("/api/projects/:id", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) {
      return auth;
    }

    const projectId = c.req.param("id");
    await c.env.DB.prepare("UPDATE tasks SET project_id = NULL, updated_at = ? WHERE user_id = ? AND project_id = ?").bind(nowIso(), auth.id, projectId).run();
    const result = await c.env.DB.prepare("DELETE FROM projects WHERE id = ? AND user_id = ?").bind(projectId, auth.id).run();

    if (!result.success || Number(result.meta.changes ?? 0) === 0) {
      return c.json({ error: "Project not found" }, 404);
    }

    return c.json({ success: true });
  });

  app.get("/api/tasks", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) {
      return auth;
    }

    const query = {
      project_id: c.req.query("project_id"),
      status: c.req.query("status"),
      priority: c.req.query("priority"),
      search: c.req.query("search")
    };

    const parsed = taskListQuerySchema.safeParse(query);
    if (!parsed.success) {
      return c.json({ error: "Invalid task query parameters", details: parsed.error.flatten() }, 400);
    }

    const sql: string[] = ["SELECT * FROM tasks WHERE user_id = ?"];
    const bindings: unknown[] = [auth.id];

    if (parsed.data.project_id) {
      sql.push("AND project_id = ?");
      bindings.push(parsed.data.project_id);
    }

    if (parsed.data.status) {
      sql.push("AND status = ?");
      bindings.push(parsed.data.status);
    }

    if (parsed.data.priority) {
      sql.push("AND priority = ?");
      bindings.push(parsed.data.priority);
    }

    if (parsed.data.search) {
      sql.push("AND (title LIKE ? OR details LIKE ?)");
      const wildcard = `%${parsed.data.search}%`;
      bindings.push(wildcard, wildcard);
    }

    sql.push(
      "ORDER BY",
      "CASE status WHEN 'in_progress' THEN 0 WHEN 'todo' THEN 1 ELSE 2 END,",
      "CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,",
      "COALESCE(due_at, '9999-12-31T23:59:59.999Z') ASC,",
      "created_at DESC"
    );

    const rows = await c.env.DB.prepare(sql.join(" ")).bind(...bindings).all<TaskRow>();
    return c.json({ tasks: (rows.results ?? []).map((item) => serializeTask(item)) });
  });

  app.post("/api/tasks", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) {
      return auth;
    }

    const payload = await c.req.json().catch(() => null);
    const parsed = taskSchema.safeParse(payload);
    if (!parsed.success) {
      return c.json({ error: "Invalid task payload", details: parsed.error.flatten() }, 400);
    }

    if (parsed.data.project_id) {
      const exists = await projectExistsForUser(c.env.DB, parsed.data.project_id, auth.id);
      if (!exists) {
        return c.json({ error: "Project not found for task assignment" }, 404);
      }
    }

    const timestamp = nowIso();
    const status = parsed.data.status ?? "todo";
    const task: TaskRow = {
      id: crypto.randomUUID(),
      user_id: auth.id,
      project_id: parsed.data.project_id ?? null,
      title: parsed.data.title.trim(),
      details: normalizeNullableString(parsed.data.details),
      status,
      priority: parsed.data.priority ?? "medium",
      due_at: parsed.data.due_at ?? null,
      completed_at: status === "done" ? timestamp : null,
      estimate_minutes: normalizeNullableNumber(parsed.data.estimate_minutes),
      created_at: timestamp,
      updated_at: timestamp
    };

    await c.env.DB
      .prepare(
        [
          "INSERT INTO tasks (id, user_id, project_id, title, details, status, priority, due_at, completed_at, estimate_minutes, created_at, updated_at)",
          "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ].join(" ")
      )
      .bind(
        task.id,
        task.user_id,
        task.project_id,
        task.title,
        task.details,
        task.status,
        task.priority,
        task.due_at,
        task.completed_at,
        task.estimate_minutes,
        task.created_at,
        task.updated_at
      )
      .run();

    return c.json({ task: serializeTask(task) }, 201);
  });

  app.put("/api/tasks/:id", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) {
      return auth;
    }

    const taskId = c.req.param("id");
    const existing = await getTaskById(c.env.DB, taskId, auth.id);
    if (!existing) {
      return c.json({ error: "Task not found" }, 404);
    }

    const payload = await c.req.json().catch(() => null);
    const parsed = taskUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      return c.json({ error: "Invalid task payload", details: parsed.error.flatten() }, 400);
    }

    if (Object.keys(parsed.data).length === 0) {
      return c.json({ error: "No task fields supplied" }, 400);
    }

    if (parsed.data.project_id) {
      const exists = await projectExistsForUser(c.env.DB, parsed.data.project_id, auth.id);
      if (!exists) {
        return c.json({ error: "Project not found for task assignment" }, 404);
      }
    }

    const nextStatus = parsed.data.status ?? existing.status;
    const timestamp = nowIso();
    const updated: TaskRow = {
      ...existing,
      project_id: parsed.data.project_id === undefined ? existing.project_id : parsed.data.project_id,
      title: parsed.data.title?.trim() ?? existing.title,
      details: parsed.data.details === undefined ? existing.details : normalizeNullableString(parsed.data.details),
      status: nextStatus,
      priority: parsed.data.priority ?? existing.priority,
      due_at: parsed.data.due_at === undefined ? existing.due_at : parsed.data.due_at,
      completed_at:
        nextStatus === "done"
          ? existing.completed_at ?? timestamp
          : null,
      estimate_minutes:
        parsed.data.estimate_minutes === undefined
          ? existing.estimate_minutes
          : normalizeNullableNumber(parsed.data.estimate_minutes),
      updated_at: timestamp
    };

    await c.env.DB
      .prepare(
        [
          "UPDATE tasks SET",
          "project_id = ?, title = ?, details = ?, status = ?, priority = ?,",
          "due_at = ?, completed_at = ?, estimate_minutes = ?, updated_at = ?",
          "WHERE id = ? AND user_id = ?"
        ].join(" ")
      )
      .bind(
        updated.project_id,
        updated.title,
        updated.details,
        updated.status,
        updated.priority,
        updated.due_at,
        updated.completed_at,
        updated.estimate_minutes,
        updated.updated_at,
        taskId,
        auth.id
      )
      .run();

    return c.json({ task: serializeTask(updated) });
  });

  app.delete("/api/tasks/:id", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) {
      return auth;
    }

    const taskId = c.req.param("id");
    const result = await c.env.DB.prepare("DELETE FROM tasks WHERE id = ? AND user_id = ?").bind(taskId, auth.id).run();

    if (!result.success || Number(result.meta.changes ?? 0) === 0) {
      return c.json({ error: "Task not found" }, 404);
    }

    return c.json({ success: true });
  });
}
