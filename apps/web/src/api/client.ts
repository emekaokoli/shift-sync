const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:1964";

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function getTokenFromStorage(): { accessToken: string | null; refreshToken: string | null } {
  let accessToken: string | null = null;
  let refreshToken: string | null = null;
  
  try {
    const stored = localStorage.getItem('softsync-auth-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      accessToken = parsed.state?.accessToken ?? parsed.accessToken ?? null;
      refreshToken = parsed.state?.refreshToken ?? parsed.refreshToken ?? null;
    }
  } catch {
    accessToken = null;
    refreshToken = null;
  }
  
  return { accessToken, refreshToken };
}

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const { accessToken } = getTokenFromStorage();

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });

  const json = (await response.json()) as ApiResponse<T>;

  if (!response.ok) {
    throw new Error(json.error || json.message || "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return json.data as T;
}
