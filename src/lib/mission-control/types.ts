export interface MCAgent {
  id: string;
  name: string;
  status: "active" | "pending" | "stopped";
  tasks_completed: number;
  last_active: string;
  cpu_usage: number;
  memory_usage: number;
}

export interface MCBoard {
  id: string;
  name: string;
  description: string;
  task_count: number;
  created_at: string;
}

export interface MCTask {
  id: string;
  board_id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  agent_name: string;
  priority: "low" | "medium" | "high";
  assignee: string | null;
  due_date: string | null;
  created_at: string;
}

export interface MCActivityEntry {
  id: string;
  type: string;
  message: string;
  agent_name: string;
  created_at: string;
}

export interface MCApproval {
  id: string;
  agent_name: string;
  action: string;
  command: string;
  status: "pending" | "approved" | "denied";
  created_at: string;
}
