#!/usr/bin/env node

/**
 * OpenClaw Sync Daemon
 *
 * Bridges OpenClaw's Gateway to Taro's Neon PostgreSQL database.
 * Uses the OpenClaw CLI (`docker exec ... openclaw gateway call`) for gateway
 * operations, which handles device pairing automatically.
 *
 * Exposes an HTTP server that the Taro API routes proxy into via SSH.
 *
 * Environment variables:
 *   DATABASE_URL       — Neon PostgreSQL connection string
 *   INSTANCE_ID        — Taro instance UUID
 *   CONTAINER_NAME     — Docker container name (default: taro-joe-openclaw)
 *   SYNC_HTTP_PORT     — HTTP port for the sync daemon's API
 */

import { neon } from "@neondatabase/serverless";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const DATABASE_URL = process.env.DATABASE_URL;
const INSTANCE_ID = process.env.INSTANCE_ID;
const CONTAINER_NAME = process.env.CONTAINER_NAME || "taro-joe-openclaw";
const SYNC_HTTP_PORT = parseInt(process.env.SYNC_HTTP_PORT || "0", 10);

if (!DATABASE_URL || !INSTANCE_ID || !SYNC_HTTP_PORT) {
  console.error("Missing required env vars: DATABASE_URL, INSTANCE_ID, SYNC_HTTP_PORT");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// ─── Provider config sync ────────────────────────────────────────────────────

/**
 * Read the user's chosen LLM provider/model from Taro DB and ensure the
 * OpenClaw container's config matches. This way dispatched agent runs use
 * whatever provider the user configured in Taro settings.
 */
let lastSyncedModel = null;

async function syncProviderConfig() {
  try {
    const rows = await sql`
      SELECT llm_provider, llm_model FROM instances WHERE id = ${INSTANCE_ID} LIMIT 1
    `;
    if (rows.length === 0) return;

    const { llm_provider: provider, llm_model: model } = rows[0];
    if (!provider || !model) return;

    // Skip if we already synced this exact config
    if (lastSyncedModel === model) return;

    // Read current openclaw.json from container
    let currentConfig = {};
    try {
      const { stdout } = await execFileAsync("docker", [
        "exec", CONTAINER_NAME,
        "cat", "/home/node/.openclaw/openclaw.json",
      ], { timeout: 5000 });
      currentConfig = JSON.parse(stdout.trim());
    } catch {
      // File doesn't exist or can't parse — will write fresh
    }

    // Check if the model is already set correctly
    const currentModel = currentConfig?.agents?.defaults?.model?.primary;
    if (currentModel === model) {
      lastSyncedModel = model;
      return;
    }

    // Update the config
    if (!currentConfig.agents) currentConfig.agents = {};
    if (!currentConfig.agents.defaults) currentConfig.agents.defaults = {};
    currentConfig.agents.defaults.model = { primary: model };
    if (!currentConfig.agents.defaults.models) currentConfig.agents.defaults.models = {};
    currentConfig.agents.defaults.models[model] = {};

    // Write back using docker cp to avoid shell injection
    const { writeFileSync, unlinkSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const tmpFile = join(tmpdir(), `openclaw-config-${Date.now()}.json`);
    writeFileSync(tmpFile, JSON.stringify(currentConfig, null, 2));
    await execFileAsync("docker", [
      "cp", tmpFile, `${CONTAINER_NAME}:/home/node/.openclaw/openclaw.json`,
    ], { timeout: 5000 });
    try { unlinkSync(tmpFile); } catch { /* ignore */ }

    lastSyncedModel = model;
    console.log(`[syncProviderConfig] Updated OpenClaw model to ${model}`);
  } catch (err) {
    console.error("[syncProviderConfig] Error:", err.message);
  }
}

// ─── OpenClaw CLI bridge ────────────────────────────────────────────────────

async function gatewayCallOnce(method, params = {}, timeoutMs = 30000) {
  const args = [
    "exec", CONTAINER_NAME,
    "openclaw", "gateway", "call", method,
    "--json",
    "--timeout", String(timeoutMs),
    "--params", JSON.stringify(params),
  ];

  const { stdout, stderr } = await execFileAsync("docker", args, {
    timeout: timeoutMs + 5000,
    maxBuffer: 1024 * 1024,
  });

  if (stderr && !stdout) {
    throw new Error(stderr.trim());
  }

  try {
    return JSON.parse(stdout.trim());
  } catch {
    return { raw: stdout.trim() };
  }
}

async function gatewayCall(method, params = {}, timeoutMs = 30000) {
  // Retry once on failure (gateway sometimes drops first connection)
  try {
    return await gatewayCallOnce(method, params, timeoutMs);
  } catch (firstErr) {
    console.log(`[gatewayCall] ${method} failed, retrying: ${firstErr.message.slice(0, 100)}`);
    try {
      await new Promise((r) => setTimeout(r, 500));
      return await gatewayCallOnce(method, params, timeoutMs);
    } catch (retryErr) {
      const msg = retryErr.stderr?.trim() || retryErr.message || "CLI call failed";
      throw new Error(`gateway call ${method} failed: ${msg}`);
    }
  }
}

/**
 * Run a full agent turn using `openclaw agent` CLI.
 * Unlike chat.send, this actually executes the task and waits for completion.
 * Always uses agent "main" since that's the only OpenClaw agent configured.
 * Uses docker exec with direct array args (no shell) to prevent injection.
 */
async function agentRun(message, agentId = "main", timeoutSec = 120) {
  // Pass message directly as an arg — no shell, no quoting issues
  const args = [
    "exec", CONTAINER_NAME,
    "openclaw", "agent",
    "--agent", "main",
    "--message", message,
    "--json",
    "--timeout", String(timeoutSec),
  ];

  const { stdout, stderr } = await execFileAsync("docker", args, {
    timeout: (timeoutSec + 10) * 1000,
    maxBuffer: 2 * 1024 * 1024,
  });

  if (stderr && !stdout) {
    throw new Error(stderr.trim());
  }

  try {
    return JSON.parse(stdout.trim());
  } catch {
    return { raw: stdout.trim() };
  }
}

async function gatewayHealth() {
  try {
    return await gatewayCall("health");
  } catch {
    return null;
  }
}

// ─── Database helpers ────────────────────────────────────────────────────────

async function insertActivity(type, message, agentName = "") {
  try {
    await sql`
      INSERT INTO mc_activity (instance_id, type, message, agent_name)
      VALUES (${INSTANCE_ID}, ${type}, ${message}, ${agentName})
    `;
  } catch (err) {
    console.error("Failed to insert activity:", err.message);
  }
}

async function upsertAgent(name, status, sessionId) {
  try {
    const existing = await sql`
      SELECT id FROM mc_agents
      WHERE instance_id = ${INSTANCE_ID} AND name = ${name}
      LIMIT 1
    `;

    if (existing.length > 0) {
      await sql`
        UPDATE mc_agents
        SET mc_agent_status = ${status},
            last_active = NOW(),
            openclaw_session_id = ${sessionId}
        WHERE id = ${existing[0].id}
      `;
    } else {
      await sql`
        INSERT INTO mc_agents (instance_id, name, mc_agent_status, openclaw_session_id)
        VALUES (${INSTANCE_ID}, ${name}, ${status}, ${sessionId})
      `;
    }
  } catch (err) {
    console.error("Failed to upsert agent:", err.message);
  }
}

async function updateTaskStatus(taskId, status, dispatchOutput = null) {
  try {
    if (dispatchOutput) {
      await sql`
        UPDATE mc_tasks SET mc_task_status = ${status}, dispatch_output = ${dispatchOutput} WHERE id = ${taskId}
      `;
    } else {
      await sql`
        UPDATE mc_tasks SET mc_task_status = ${status} WHERE id = ${taskId}
      `;
    }
  } catch (err) {
    console.error("Failed to update task status:", err.message);
  }
}

async function insertApproval(openclawApprovalId, agentName, action, command) {
  try {
    await sql`
      INSERT INTO mc_approvals (instance_id, agent_name, action, command, openclaw_approval_id)
      VALUES (${INSTANCE_ID}, ${agentName}, ${action}, ${command}, ${openclawApprovalId})
    `;
  } catch (err) {
    console.error("Failed to insert approval:", err.message);
  }
}

async function updateApprovalStatus(openclawApprovalId, status) {
  try {
    await sql`
      UPDATE mc_approvals
      SET mc_approval_status = ${status}
      WHERE openclaw_approval_id = ${openclawApprovalId}
        AND instance_id = ${INSTANCE_ID}
    `;
  } catch (err) {
    console.error("Failed to update approval:", err.message);
  }
}

// ─── Mission Control state summary ──────────────────────────────────────────

let cachedSummary = null;
let cachedAt = 0;
const CACHE_TTL = 5000;

async function getMCStateSummary() {
  const now = Date.now();
  if (cachedSummary && (now - cachedAt) < CACHE_TTL) {
    return cachedSummary;
  }

  try {
    const [boards, tasks, agents, approvals, tags, activity] = await Promise.all([
      sql`SELECT id, name, description FROM mc_boards WHERE instance_id = ${INSTANCE_ID}`,
      sql`
        SELECT t.id, t.title, t.description, t.mc_task_status AS status, t.agent_name,
               t.mc_task_priority AS priority, t.board_id
        FROM mc_tasks t
        INNER JOIN mc_boards b ON t.board_id = b.id
        WHERE b.instance_id = ${INSTANCE_ID}
        ORDER BY t.created_at DESC
      `,
      sql`
        SELECT name, role, mc_agent_status AS status, tasks_completed
        FROM mc_agents WHERE instance_id = ${INSTANCE_ID}
      `,
      sql`
        SELECT agent_name, action, command
        FROM mc_approvals
        WHERE instance_id = ${INSTANCE_ID} AND mc_approval_status = 'pending'
      `,
      sql`SELECT name FROM mc_tags WHERE instance_id = ${INSTANCE_ID}`,
      sql`
        SELECT type, message, agent_name, created_at
        FROM mc_activity
        WHERE instance_id = ${INSTANCE_ID}
        ORDER BY created_at DESC LIMIT 10
      `,
    ]);

    const lines = ["=== MISSION CONTROL STATE ===", ""];

    lines.push("## Boards & Tasks");
    if (boards.length === 0) {
      lines.push("(no boards)");
    } else {
      for (const board of boards) {
        const boardTasks = tasks.filter((t) => t.board_id === board.id).slice(0, 20);
        lines.push(`- "${board.name}" (${boardTasks.length} tasks)${board.description ? ": " + board.description.slice(0, 100) : ""}:`);
        if (boardTasks.length === 0) {
          lines.push("  (empty)");
        } else {
          for (const t of boardTasks) {
            const desc = t.description ? ` — ${t.description.slice(0, 100)}` : "";
            const agent = t.agent_name ? `, agent: ${t.agent_name}` : "";
            lines.push(`  [${t.status}] "${t.title}" (${t.priority}${agent})${desc}`);
          }
        }
      }
    }
    lines.push("");

    lines.push("## Agents");
    if (agents.length === 0) {
      lines.push("(no agents)");
    } else {
      for (const a of agents) {
        const role = a.role ? ` (${a.role})` : "";
        lines.push(`- ${a.name}${role} — ${a.status}, ${a.tasks_completed} tasks done`);
      }
    }
    lines.push("");

    if (approvals.length > 0) {
      lines.push(`## Pending Approvals (${approvals.length})`);
      for (const ap of approvals) {
        lines.push(`- ${ap.agent_name}: ${ap.action} "${ap.command}"`);
      }
      lines.push("");
    }

    if (tags.length > 0) {
      lines.push(`## Tags: ${tags.map((t) => t.name).join(", ")}`);
      lines.push("");
    }

    if (activity.length > 0) {
      lines.push("## Recent Activity");
      for (const a of activity) {
        lines.push(`- ${a.type}: ${a.message.slice(0, 150)}`);
      }
      lines.push("");
    }

    lines.push("=== END ===");

    const summary = lines.join("\n");
    cachedSummary = summary;
    cachedAt = Date.now();
    return summary;
  } catch (err) {
    console.error("Failed to build MC state summary:", err.message);
    return null;
  }
}

// ─── HTTP helpers ────────────────────────────────────────────────────────────

async function readBody(req) {
  let body = "";
  for await (const chunk of req) body += chunk;
  return body;
}

function jsonResponse(res, status, data) {
  res.writeHead(status);
  res.end(JSON.stringify(data));
}

// ─── HTTP server ─────────────────────────────────────────────────────────────

function startHttpServer() {
  const server = createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");

    const url = new URL(req.url, `http://127.0.0.1:${SYNC_HTTP_PORT}`);
    const path = url.pathname;

    // ── Health check ──
    if (req.method === "GET" && path === "/health") {
      try {
        const health = await gatewayCall("health");
        return jsonResponse(res, 200, {
          status: "ok",
          connected: !!health?.ok,
        });
      } catch {
        return jsonResponse(res, 200, {
          status: "ok",
          connected: false,
        });
      }
    }

    // ── OpenClaw status ──
    if (req.method === "GET" && path === "/openclaw/status") {
      try {
        const result = await gatewayCall("health");
        return jsonResponse(res, 200, result);
      } catch (err) {
        return jsonResponse(res, 503, { error: err.message });
      }
    }

    // ── List sessions ──
    if (req.method === "GET" && path === "/openclaw/sessions") {
      try {
        const result = await gatewayCall("sessions.list");
        return jsonResponse(res, 200, result);
      } catch (err) {
        return jsonResponse(res, 503, { error: err.message });
      }
    }

    // ── Get session transcript ──
    const sessionMatch = path.match(/^\/openclaw\/sessions\/([a-zA-Z0-9_:.\-]+)$/);
    if (req.method === "GET" && sessionMatch) {
      const sessionKey = decodeURIComponent(sessionMatch[1]);
      try {
        const result = await gatewayCall("sessions.preview", { sessionKey });
        return jsonResponse(res, 200, result);
      } catch (err) {
        return jsonResponse(res, 503, { error: err.message });
      }
    }

    // ── MC context summary ──
    if (req.method === "GET" && path === "/openclaw/mc-context") {
      try {
        const summary = await getMCStateSummary();
        return jsonResponse(res, 200, { context: summary });
      } catch (err) {
        return jsonResponse(res, 500, { error: err.message });
      }
    }

    // ── Send chat message to agent ──
    if (req.method === "POST" && path === "/openclaw/chat") {
      try {
        await syncProviderConfig();
        const { message, sessionKey } = JSON.parse(await readBody(req));
        if (!message) {
          return jsonResponse(res, 400, { error: "Missing message" });
        }
        const result = await gatewayCall("chat.send", {
          message,
          sessionKey: sessionKey || "agent:main:main",
          idempotencyKey: `chat-${Date.now()}`,
        });

        await insertActivity(
          "command_executed",
          `Prompt sent: ${message.slice(0, 200)}`,
          "operator"
        );

        return jsonResponse(res, 200, result);
      } catch (err) {
        return jsonResponse(res, 503, { error: err.message });
      }
    }

    // ── Dispatch task to agent ──
    if (req.method === "POST" && path === "/openclaw/dispatch") {
      try {
        const { taskId, taskTitle, taskDescription, agentName, boardName, priority, customFields } =
          JSON.parse(await readBody(req));

        if (!taskId || !taskTitle) {
          return jsonResponse(res, 400, { error: "Missing taskId or taskTitle" });
        }

        // Build structured prompt with MC context
        const mcContext = await getMCStateSummary();
        const lines = [];

        if (mcContext) {
          lines.push("[PROJECT CONTEXT]");
          lines.push(mcContext);
          lines.push("");
        }

        lines.push(`[TASK] "${taskTitle}" from board "${boardName || "unknown"}" (Priority: ${priority || "medium"})`);
        if (taskDescription) lines.push(taskDescription);
        if (customFields && Object.keys(customFields).length > 0) {
          lines.push(`Context: ${JSON.stringify(customFields)}`);
        }
        lines.push("Complete this task. Summarize what you accomplished when done.");

        const prompt = lines.join("\n");

        // Ensure OpenClaw is using the user's chosen provider/model
        await syncProviderConfig();

        // Use openclaw agent CLI to run a full agent turn
        // Always use "main" — it's the only OpenClaw agent. MC agent names are for our tracking only.
        const agentId = "main";
        const displayAgent = agentName || "main";

        // Send initial response immediately — agent will run in background
        // We don't await the full run here since it can take minutes
        const runPromise = agentRun(prompt, agentId, 300);

        // Return dispatch acknowledgment right away
        await insertActivity(
          "task_dispatched",
          `Task "${taskTitle}" dispatched to ${displayAgent}`,
          displayAgent
        );

        // Handle completion in background
        runPromise
          .then(async (result) => {
            const output =
              result?.result?.payloads?.[0]?.text ||
              result?.raw ||
              JSON.stringify(result).slice(0, 5000);
            const sessionId = result?.result?.meta?.agentMeta?.sessionId || result?.runId || "";

            // Update task to review with output
            await updateTaskStatus(taskId, "review", output);

            // Update the task's session ID and output in DB
            try {
              await sql`
                UPDATE mc_tasks
                SET openclaw_session_id = ${sessionId},
                    dispatch_output = ${output}
                WHERE id = ${taskId}
              `;
            } catch (e) {
              console.error("[dispatch] Failed to save output:", e.message);
            }

            // Increment agent tasks_completed
            try {
              await sql`
                UPDATE mc_agents
                SET tasks_completed = tasks_completed + 1, last_active = NOW()
                WHERE instance_id = ${INSTANCE_ID} AND name = ${displayAgent}
              `;
            } catch { /* ignore */ }

            await insertActivity(
              "task_completed",
              `Task "${taskTitle}" completed by ${displayAgent}: ${(output || "").slice(0, 200)}`,
              displayAgent
            );
            console.log(`[dispatch] Task "${taskTitle}" completed by ${displayAgent}`);
          })
          .catch(async (err) => {
            console.error(`[dispatch] Task "${taskTitle}" failed:`, err.message);
            await updateTaskStatus(taskId, "review", `Error: ${err.message}`);
            await insertActivity(
              "task_error",
              `Task "${taskTitle}" failed: ${err.message.slice(0, 200)}`,
              displayAgent
            );
          });

        return jsonResponse(res, 200, { ok: true, sessionId: `pending-${taskId}` });
      } catch (err) {
        return jsonResponse(res, 503, { error: err.message });
      }
    }

    // ── Create agent with role ──
    if (req.method === "POST" && path === "/openclaw/agents/create") {
      try {
        await syncProviderConfig();
        const { name, role, description } = JSON.parse(await readBody(req));

        if (!name) {
          return jsonResponse(res, 400, { error: "Missing agent name" });
        }

        // Send role prompt to create a new session for this agent
        const rolePrompt = [
          `You are an AI agent named "${name}".`,
          role ? `Role: ${role}.` : "",
          description || "",
          "Await further task instructions.",
        ]
          .filter(Boolean)
          .join(" ");

        const result = await gatewayCall("chat.send", {
          message: rolePrompt,
          sessionKey: `agent:main:${name}`,
          idempotencyKey: `create-agent-${name}-${Date.now()}`,
        });

        const sessionId = result?.runId || `agent:main:${name}`;

        // Upsert agent in DB with role and description
        await upsertAgent(name, "active", sessionId);
        if (role || description) {
          await sql`
            UPDATE mc_agents
            SET role = ${role || ""}, description = ${description || ""}
            WHERE instance_id = ${INSTANCE_ID} AND name = ${name}
          `;
        }

        await insertActivity(
          "agent_created",
          `Agent "${name}" created with role: ${role || "general"}`,
          name
        );

        return jsonResponse(res, 200, { ok: true, sessionId });
      } catch (err) {
        return jsonResponse(res, 503, { error: err.message });
      }
    }

    // ── Resolve approval ──
    if (req.method === "POST" && path === "/resolve-approval") {
      try {
        const { openclawApprovalId, resolution } = JSON.parse(await readBody(req));

        if (!openclawApprovalId || !resolution) {
          return jsonResponse(res, 400, { error: "Missing openclawApprovalId or resolution" });
        }

        // Use CLI to resolve the approval
        await gatewayCall("exec.approval.resolve", {
          approvalId: openclawApprovalId,
          resolution,
        });

        await updateApprovalStatus(
          openclawApprovalId,
          resolution === "approve" ? "approved" : "denied"
        );

        return jsonResponse(res, 200, { ok: true });
      } catch (err) {
        return jsonResponse(res, 503, { error: err.message });
      }
    }

    jsonResponse(res, 404, { error: "Not found" });
  });

  server.listen(SYNC_HTTP_PORT, "127.0.0.1", () => {
    console.log(`HTTP server listening on 127.0.0.1:${SYNC_HTTP_PORT}`);
  });
}

// ─── Completion polling ───────────────────────────────────────────────────────

async function pollDispatchedTasks() {
  try {
    // Find tasks that have been dispatched but not completed
    const dispatchedTasks = await sql`
      SELECT t.id, t.title, t.agent_name, t.openclaw_session_id
      FROM mc_tasks t
      INNER JOIN mc_boards b ON t.board_id = b.id
      WHERE b.instance_id = ${INSTANCE_ID}
        AND t.mc_task_status = 'in_progress'
        AND t.openclaw_session_id IS NOT NULL
        AND t.dispatched_at IS NOT NULL
    `;

    if (dispatchedTasks.length === 0) return;

    // Get current sessions list to check for activity
    let sessions;
    try {
      sessions = await gatewayCall("sessions.list");
    } catch {
      return; // Gateway unreachable, skip this poll
    }

    const sessionList = Array.isArray(sessions) ? sessions : sessions?.sessions || [];

    for (const task of dispatchedTasks) {
      const sessionKey = task.openclaw_session_id;

      // Check if the session has an active run
      const session = sessionList.find(
        (s) => s.sessionKey === sessionKey || s.sessionId === sessionKey || s.key === sessionKey
      );

      // If session has no active run, it's completed
      const isActive = session?.activeRun || session?.running || session?.status === "running";
      if (isActive) continue;

      // Try to get the transcript to extract a completion summary
      let output = null;
      try {
        const transcript = await gatewayCall("sessions.preview", { sessionKey });
        const messages = transcript?.messages || transcript?.transcript || [];
        if (Array.isArray(messages) && messages.length > 0) {
          // Get the last assistant message as the output summary
          const assistantMsgs = messages.filter(
            (m) => m.role === "assistant" && m.content
          );
          if (assistantMsgs.length > 0) {
            const lastMsg = assistantMsgs[assistantMsgs.length - 1];
            output = typeof lastMsg.content === "string"
              ? lastMsg.content.slice(0, 5000)
              : JSON.stringify(lastMsg.content).slice(0, 5000);
          }
        }
      } catch {
        output = "Task completed (transcript unavailable)";
      }

      // Update task to review with output
      await updateTaskStatus(task.id, "review", output || "Task completed");

      // Increment agent's tasks_completed
      if (task.agent_name) {
        try {
          await sql`
            UPDATE mc_agents
            SET tasks_completed = tasks_completed + 1, last_active = NOW()
            WHERE instance_id = ${INSTANCE_ID} AND name = ${task.agent_name}
          `;
        } catch {
          // ignore
        }
      }

      await insertActivity(
        "task_completed",
        `Task "${task.title}" completed by ${task.agent_name || "agent"}`,
        task.agent_name || "unknown"
      );

      console.log(`[poll] Task "${task.title}" completed, moved to review`);
    }
  } catch (err) {
    console.error("[poll] Error polling dispatched tasks:", err.message);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

console.log(`OpenClaw Sync Daemon starting...`);
console.log(`  Instance: ${INSTANCE_ID}`);
console.log(`  Container: ${CONTAINER_NAME}`);
console.log(`  HTTP Port: ${SYNC_HTTP_PORT}`);

startHttpServer();

// Start completion polling every 30 seconds
setInterval(pollDispatchedTasks, 30000);

// Sync provider config every 60 seconds (picks up settings changes)
setInterval(syncProviderConfig, 60000);

// Initial provider config sync + connectivity check
(async () => {
  await syncProviderConfig();
  const health = await gatewayHealth();
  if (health?.ok) {
    console.log("OpenClaw gateway is reachable");
    await insertActivity("agent_connected", "Sync daemon connected to OpenClaw gateway", "system");
  } else {
    console.log("OpenClaw gateway not reachable yet (will retry on each request)");
  }
})();
