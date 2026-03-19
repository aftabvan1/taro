#!/usr/bin/env node

/**
 * Hermes Sync Daemon
 *
 * Bridges Hermes Agent's WebAPI to Taro's Neon PostgreSQL database.
 * Unlike the OpenClaw sync daemon which shells out via `docker exec`,
 * this one makes direct HTTP calls to Hermes Agent's WebAPI on port 8642.
 *
 * Exposes an HTTP server that the Taro API routes proxy into via SSH.
 *
 * Environment variables:
 *   DATABASE_URL       — Neon PostgreSQL connection string
 *   INSTANCE_ID        — Taro instance UUID
 *   CONTAINER_NAME     — Docker container name (default: taro-joe-hermes)
 *   SYNC_HTTP_PORT     — HTTP port for the sync daemon's API
 */

import { neon } from "@neondatabase/serverless";
import { createServer } from "node:http";

const DATABASE_URL = process.env.DATABASE_URL;
const INSTANCE_ID = process.env.INSTANCE_ID;
const CONTAINER_NAME = process.env.CONTAINER_NAME || "taro-joe-hermes";
const SYNC_HTTP_PORT = parseInt(process.env.SYNC_HTTP_PORT || "0", 10);

const HERMES_BASE_URL = "http://localhost:8642";

if (!DATABASE_URL || !INSTANCE_ID || !SYNC_HTTP_PORT) {
  console.error("Missing required env vars: DATABASE_URL, INSTANCE_ID, SYNC_HTTP_PORT");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// ─── Provider config sync ────────────────────────────────────────────────────

/**
 * Read the user's chosen LLM provider/model from Taro DB and push it
 * to Hermes Agent's /config endpoint so dispatched agent runs use
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

    // Push config to Hermes WebAPI
    const resp = await fetch(`${HERMES_BASE_URL}/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        model,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Hermes /config returned ${resp.status}: ${text}`);
    }

    lastSyncedModel = model;
    console.log(`[syncProviderConfig] Updated Hermes model to ${model}`);
  } catch (err) {
    console.error("[syncProviderConfig] Error:", err.message);
  }
}

// ─── Hermes WebAPI bridge ────────────────────────────────────────────────────

/**
 * Make an HTTP request to Hermes Agent's WebAPI.
 * Retries once on failure (Hermes sometimes drops first connection).
 */
async function hermesRequest(method, path, body = null, timeoutMs = 30000) {
  async function attempt() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const options = {
        method,
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      };

      if (body !== null) {
        options.body = JSON.stringify(body);
      }

      const resp = await fetch(`${HERMES_BASE_URL}${path}`, options);

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Hermes ${method} ${path} returned ${resp.status}: ${text}`);
      }

      const text = await resp.text();
      try {
        return JSON.parse(text);
      } catch {
        return { raw: text };
      }
    } finally {
      clearTimeout(timer);
    }
  }

  // Retry once on failure
  try {
    return await attempt();
  } catch (firstErr) {
    console.log(`[hermesRequest] ${method} ${path} failed, retrying: ${firstErr.message.slice(0, 100)}`);
    try {
      await new Promise((r) => setTimeout(r, 500));
      return await attempt();
    } catch (retryErr) {
      throw new Error(`Hermes ${method} ${path} failed: ${retryErr.message}`);
    }
  }
}

/**
 * Send a chat message to Hermes via /chat (POST, SSE streaming).
 * Buffers the entire SSE stream into a complete response.
 */
async function hermesChat(message, sessionId = null, timeoutMs = 120000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const body = { message };
    if (sessionId) body.session_id = sessionId;

    const resp = await fetch(`${HERMES_BASE_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Hermes /chat returned ${resp.status}: ${text}`);
    }

    // Check if response is SSE streaming
    const contentType = resp.headers.get("content-type") || "";
    if (contentType.includes("text/event-stream")) {
      // Buffer SSE stream into complete response
      const text = await resp.text();
      const lines = text.split("\n");
      const chunks = [];
      let resultSessionId = sessionId;
      let metadata = {};

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) chunks.push(parsed.content);
            if (parsed.text) chunks.push(parsed.text);
            if (parsed.session_id) resultSessionId = parsed.session_id;
            if (parsed.metadata) metadata = { ...metadata, ...parsed.metadata };
            // Capture final chunk data
            if (parsed.done && parsed.response) {
              return {
                response: parsed.response,
                session_id: parsed.session_id || resultSessionId,
                metadata,
              };
            }
          } catch {
            // Non-JSON data line, accumulate as text
            if (data && data !== "[DONE]") chunks.push(data);
          }
        }
      }

      return {
        response: chunks.join(""),
        session_id: resultSessionId,
        metadata,
      };
    }

    // Non-streaming JSON response
    const json = await resp.json();
    return json;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Submit a job to Hermes via /jobs (POST).
 * Jobs run asynchronously and can be polled for status.
 */
async function hermesJob(message, sessionId = null, timeoutMs = 10000) {
  const body = { message };
  if (sessionId) body.session_id = sessionId;

  return await hermesRequest("POST", "/jobs", body, timeoutMs);
}

async function hermesHealth() {
  try {
    return await hermesRequest("GET", "/health", null, 5000);
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
            agent_session_id = ${sessionId}
        WHERE id = ${existing[0].id}
      `;
    } else {
      await sql`
        INSERT INTO mc_agents (instance_id, name, mc_agent_status, agent_session_id)
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

async function insertApproval(agentApprovalId, agentName, action, command) {
  try {
    await sql`
      INSERT INTO mc_approvals (instance_id, agent_name, action, command, agent_approval_id)
      VALUES (${INSTANCE_ID}, ${agentName}, ${action}, ${command}, ${agentApprovalId})
    `;
  } catch (err) {
    console.error("Failed to insert approval:", err.message);
  }
}

async function updateApprovalStatus(agentApprovalId, status) {
  try {
    await sql`
      UPDATE mc_approvals
      SET mc_approval_status = ${status}
      WHERE agent_approval_id = ${agentApprovalId}
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
        const health = await hermesHealth();
        return jsonResponse(res, 200, {
          status: "ok",
          connected: !!health,
        });
      } catch {
        return jsonResponse(res, 200, {
          status: "ok",
          connected: false,
        });
      }
    }

    // ── Hermes status ──
    if (req.method === "GET" && path === "/hermes/status") {
      try {
        const result = await hermesRequest("GET", "/health");
        return jsonResponse(res, 200, result);
      } catch (err) {
        return jsonResponse(res, 503, { error: err.message });
      }
    }

    // ── List sessions ──
    if (req.method === "GET" && path === "/hermes/sessions") {
      try {
        const result = await hermesRequest("GET", "/sessions");
        return jsonResponse(res, 200, result);
      } catch (err) {
        return jsonResponse(res, 503, { error: err.message });
      }
    }

    // ── Get session detail ──
    const sessionMatch = path.match(/^\/hermes\/sessions\/([a-zA-Z0-9_:.\-]+)$/);
    if (req.method === "GET" && sessionMatch) {
      const sessionId = decodeURIComponent(sessionMatch[1]);
      try {
        const result = await hermesRequest("GET", `/sessions/${encodeURIComponent(sessionId)}`);
        return jsonResponse(res, 200, result);
      } catch (err) {
        return jsonResponse(res, 503, { error: err.message });
      }
    }

    // ── MC context summary ──
    if (req.method === "GET" && path === "/hermes/mc-context") {
      try {
        const summary = await getMCStateSummary();
        return jsonResponse(res, 200, { context: summary });
      } catch (err) {
        return jsonResponse(res, 500, { error: err.message });
      }
    }

    // ── Send chat message to Hermes ──
    if (req.method === "POST" && path === "/hermes/chat") {
      try {
        await syncProviderConfig();
        const { message, sessionId } = JSON.parse(await readBody(req));
        if (!message) {
          return jsonResponse(res, 400, { error: "Missing message" });
        }

        const result = await hermesChat(message, sessionId);

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

    // ── Dispatch task to Hermes agent ──
    if (req.method === "POST" && path === "/hermes/dispatch") {
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

        // Ensure Hermes is using the user's chosen provider/model
        await syncProviderConfig();

        const displayAgent = agentName || "main";

        // Submit as a job so it runs asynchronously
        const jobResult = await hermesJob(prompt);
        const jobId = jobResult?.job_id || jobResult?.id || `job-${Date.now()}`;

        // Return dispatch acknowledgment right away
        await insertActivity(
          "task_dispatched",
          `Task "${taskTitle}" dispatched to ${displayAgent}`,
          displayAgent
        );

        // Poll job completion in background
        pollJobCompletion(jobId, taskId, taskTitle, displayAgent);

        return jsonResponse(res, 200, { ok: true, sessionId: jobId });
      } catch (err) {
        return jsonResponse(res, 503, { error: err.message });
      }
    }

    // ── Create agent with role ──
    if (req.method === "POST" && path === "/hermes/agents/create") {
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

        const result = await hermesChat(rolePrompt);
        const sessionId = result?.session_id || `agent-${name}`;

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
        const { agentApprovalId, resolution } = JSON.parse(await readBody(req));

        if (!agentApprovalId || !resolution) {
          return jsonResponse(res, 400, { error: "Missing agentApprovalId or resolution" });
        }

        // POST to Hermes to resolve the approval
        await hermesRequest("POST", `/approvals/${encodeURIComponent(agentApprovalId)}/resolve`, {
          resolution,
        });

        await updateApprovalStatus(
          agentApprovalId,
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

// ─── Job completion polling ──────────────────────────────────────────────────

/**
 * Poll a Hermes job for completion and update the task in the DB.
 * Hermes jobs are async — we poll /jobs/:id until done.
 */
async function pollJobCompletion(jobId, taskId, taskTitle, agentName, maxAttempts = 60) {
  let attempts = 0;
  const pollInterval = 5000; // 5 seconds

  const poll = async () => {
    attempts++;
    if (attempts > maxAttempts) {
      console.error(`[pollJob] Gave up polling job ${jobId} after ${maxAttempts} attempts`);
      await updateTaskStatus(taskId, "review", "Error: Job timed out after polling");
      await insertActivity(
        "task_error",
        `Task "${taskTitle}" timed out waiting for completion`,
        agentName
      );
      return;
    }

    try {
      // Try to get the chat result via sessions, since Hermes may store results there
      let jobStatus;
      try {
        jobStatus = await hermesRequest("GET", `/jobs/${encodeURIComponent(jobId)}`, null, 5000);
      } catch {
        // Job endpoint might not exist or job may have already completed
        // Try checking sessions for output
        setTimeout(poll, pollInterval);
        return;
      }

      const status = jobStatus?.status || jobStatus?.state;
      if (status === "running" || status === "pending" || status === "in_progress") {
        setTimeout(poll, pollInterval);
        return;
      }

      // Job completed (or failed)
      const output =
        jobStatus?.result?.response ||
        jobStatus?.result?.text ||
        jobStatus?.output ||
        jobStatus?.response ||
        JSON.stringify(jobStatus).slice(0, 5000);

      const sessionId = jobStatus?.session_id || jobId;

      if (status === "failed" || status === "error") {
        const errorMsg = jobStatus?.error || output || "Job failed";
        await updateTaskStatus(taskId, "review", `Error: ${errorMsg}`);
        await insertActivity(
          "task_error",
          `Task "${taskTitle}" failed: ${String(errorMsg).slice(0, 200)}`,
          agentName
        );
        console.error(`[pollJob] Task "${taskTitle}" failed: ${String(errorMsg).slice(0, 100)}`);
        return;
      }

      // Success — update task to review with output
      await updateTaskStatus(taskId, "review", output);

      // Update the task's session ID and output in DB
      try {
        await sql`
          UPDATE mc_tasks
          SET agent_session_id = ${sessionId},
              dispatch_output = ${output}
          WHERE id = ${taskId}
        `;
      } catch (e) {
        console.error("[pollJob] Failed to save output:", e.message);
      }

      // Increment agent tasks_completed
      try {
        await sql`
          UPDATE mc_agents
          SET tasks_completed = tasks_completed + 1, last_active = NOW()
          WHERE instance_id = ${INSTANCE_ID} AND name = ${agentName}
        `;
      } catch { /* ignore */ }

      await insertActivity(
        "task_completed",
        `Task "${taskTitle}" completed by ${agentName}: ${(output || "").slice(0, 200)}`,
        agentName
      );
      console.log(`[pollJob] Task "${taskTitle}" completed by ${agentName}`);
    } catch (err) {
      console.error(`[pollJob] Error polling job ${jobId}:`, err.message);
      setTimeout(poll, pollInterval);
    }
  };

  // Start polling after initial delay
  setTimeout(poll, pollInterval);
}

// ─── Dispatched task polling ─────────────────────────────────────────────────

async function pollDispatchedTasks() {
  try {
    // Find tasks that have been dispatched but not completed
    const dispatchedTasks = await sql`
      SELECT t.id, t.title, t.agent_name, t.agent_session_id
      FROM mc_tasks t
      INNER JOIN mc_boards b ON t.board_id = b.id
      WHERE b.instance_id = ${INSTANCE_ID}
        AND t.mc_task_status = 'in_progress'
        AND t.agent_session_id IS NOT NULL
        AND t.dispatched_at IS NOT NULL
    `;

    if (dispatchedTasks.length === 0) return;

    // Get current sessions list from Hermes to check for activity
    let sessions;
    try {
      sessions = await hermesRequest("GET", "/sessions", null, 5000);
    } catch {
      return; // Hermes unreachable, skip this poll
    }

    const sessionList = Array.isArray(sessions) ? sessions : sessions?.sessions || [];

    for (const task of dispatchedTasks) {
      const sessionId = task.agent_session_id;

      // Check if the session has an active run
      const session = sessionList.find(
        (s) => s.session_id === sessionId || s.id === sessionId
      );

      // If session has no active run, it's completed
      const isActive = session?.activeRun || session?.running || session?.status === "running";
      if (isActive) continue;

      // Try to get the session transcript to extract a completion summary
      let output = null;
      try {
        const detail = await hermesRequest("GET", `/sessions/${encodeURIComponent(sessionId)}`, null, 5000);
        const messages = detail?.messages || detail?.history || detail?.transcript || [];
        if (Array.isArray(messages) && messages.length > 0) {
          // Get the last assistant message as the output summary
          const assistantMsgs = messages.filter(
            (m) => m.role === "assistant" && (m.content || m.text)
          );
          if (assistantMsgs.length > 0) {
            const lastMsg = assistantMsgs[assistantMsgs.length - 1];
            const content = lastMsg.content || lastMsg.text;
            output = typeof content === "string"
              ? content.slice(0, 5000)
              : JSON.stringify(content).slice(0, 5000);
          }
        }
      } catch {
        output = "Task completed (session detail unavailable)";
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

console.log(`Hermes Sync Daemon starting...`);
console.log(`  Instance: ${INSTANCE_ID}`);
console.log(`  Container: ${CONTAINER_NAME}`);
console.log(`  Hermes WebAPI: ${HERMES_BASE_URL}`);
console.log(`  HTTP Port: ${SYNC_HTTP_PORT}`);

startHttpServer();

// Start completion polling every 30 seconds
setInterval(pollDispatchedTasks, 30000);

// Sync provider config every 60 seconds (picks up settings changes)
setInterval(syncProviderConfig, 60000);

// Initial provider config sync + connectivity check
(async () => {
  await syncProviderConfig();
  const health = await hermesHealth();
  if (health) {
    console.log("Hermes Agent WebAPI is reachable");
    await insertActivity("agent_connected", "Sync daemon connected to Hermes Agent", "system");
  } else {
    console.log("Hermes Agent WebAPI not reachable yet (will retry on each request)");
  }
})();
