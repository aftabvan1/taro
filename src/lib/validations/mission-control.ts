import { z } from "zod";

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  role: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(["active", "pending", "stopped"]).optional(),
});

export const updateAgentSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    role: z.string().max(200).optional(),
    description: z.string().max(1000).optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: "At least one field must be provided",
  });

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------

export const createBoardSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  board_group_id: z.string().optional(),
});

export const updateBoardSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: "At least one field must be provided",
  });

// ---------------------------------------------------------------------------
// Task
// ---------------------------------------------------------------------------

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  status: z.enum(["inbox", "todo", "in_progress", "review", "done"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  agent_name: z.string().max(100).optional(),
  assignee: z.string().max(100).nullable().optional(),
  due_date: z.string().nullable().optional(),
});

export const updateTaskSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).optional(),
    status: z.enum(["inbox", "todo", "in_progress", "review", "done"]).optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    agent_name: z.string().max(100).optional(),
    assignee: z.string().max(100).nullable().optional(),
    due_date: z.string().nullable().optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: "At least one field must be provided",
  });

// ---------------------------------------------------------------------------
// Tag
// ---------------------------------------------------------------------------

export const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color like #6366f1")
    .optional(),
});

export const updateTagSchema = z
  .object({
    name: z.string().min(1).max(50).optional(),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color like #6366f1")
      .optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: "At least one field must be provided",
  });

// ---------------------------------------------------------------------------
// Custom Field
// ---------------------------------------------------------------------------

export const createCustomFieldSchema = z.object({
  name: z.string().min(1).max(100),
  field_type: z.enum(["text", "number", "date", "select"]).optional(),
  options: z.array(z.string()).nullable().optional(),
});

export const updateCustomFieldSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    field_type: z.enum(["text", "number", "date", "select"]).optional(),
    options: z.array(z.string()).nullable().optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: "At least one field must be provided",
  });

// ---------------------------------------------------------------------------
// Board Group
// ---------------------------------------------------------------------------

export const createBoardGroupSchema = z.object({
  name: z.string().min(1).max(100),
});

export const updateBoardGroupSchema = z.object({
  name: z.string().min(1).max(100),
});

// ---------------------------------------------------------------------------
// Activity
// ---------------------------------------------------------------------------

export const createActivitySchema = z.object({
  type: z.string().min(1).max(50),
  message: z.string().min(1).max(1000),
  agent_name: z.string().max(100).optional(),
});
