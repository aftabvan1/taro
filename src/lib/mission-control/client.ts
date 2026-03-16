import type {
  MCAgent,
  MCBoard,
  MCTask,
  MCActivityEntry,
  MCApproval,
} from "./types";

export class MissionControlClient {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Mission Control API error (${res.status}): ${error}`);
    }

    return res.json();
  }

  async getAgents(): Promise<MCAgent[]> {
    return this.request<MCAgent[]>("/api/agents");
  }

  async getAgent(agentId: string): Promise<MCAgent> {
    return this.request<MCAgent>(`/api/agents/${agentId}`);
  }

  async getBoards(): Promise<MCBoard[]> {
    return this.request<MCBoard[]>("/api/boards");
  }

  async getBoard(boardId: string): Promise<MCBoard> {
    return this.request<MCBoard>(`/api/boards/${boardId}`);
  }

  async getTasks(boardId: string): Promise<MCTask[]> {
    return this.request<MCTask[]>(`/api/boards/${boardId}/tasks`);
  }

  async getActivity(limit = 50): Promise<MCActivityEntry[]> {
    return this.request<MCActivityEntry[]>(`/api/activity?limit=${limit}`);
  }

  async getApprovals(): Promise<MCApproval[]> {
    return this.request<MCApproval[]>("/api/approvals");
  }

  async approveAction(approvalId: string): Promise<void> {
    await this.request(`/api/approvals/${approvalId}/approve`, {
      method: "POST",
    });
  }

  async denyAction(approvalId: string): Promise<void> {
    await this.request(`/api/approvals/${approvalId}/deny`, {
      method: "POST",
    });
  }
}

export const createMCClient = (
  serverIp: string,
  mcPort: number,
  mcAuthToken: string
): MissionControlClient => {
  return new MissionControlClient(
    `http://${serverIp}:${mcPort}`,
    mcAuthToken
  );
};
