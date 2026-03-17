export interface ComposioToolkit {
  name: string;
  slug: string;
  description: string;
  logo: string;
  category: string;
  toolsCount: number;
  noAuth: boolean;
  authSchemes: string[];
}

export interface ComposioConnectedAccount {
  id: string;
  toolkitSlug: string;
  status: string;
  createdAt: string;
}

export interface ComposioConnectionRequest {
  id: string;
  redirectUrl: string | null;
  status?: string;
}
