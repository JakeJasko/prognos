import { Household, HouseholdMember, LanInfo, LeaderboardResponse, Prediction, Stats, User } from "./types";

const API_BASE = "/api";

export async function fetchLanInfo(): Promise<LanInfo> {
  const res = await fetch(`${API_BASE}/lan-info`);
  if (!res.ok) throw new Error("Failed to fetch LAN info");
  return res.json();
}

export async function fetchUsers(): Promise<User[]> {
  const res = await fetch(`${API_BASE}/users`);
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

export async function fetchGoogleConfig(): Promise<{ hasGoogleAuth: boolean; clientId: string | null }> {
  const res = await fetch(`${API_BASE}/auth/google/config`);
  if (!res.ok) throw new Error("Failed to fetch Google auth config");
  return res.json();
}

export async function verifyGoogleCredential(credential: string): Promise<{ user: User }> {
  const res = await fetch(`${API_BASE}/auth/google/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to verify Google credential");
  }
  return res.json();
}

// ---------------- Households ----------------
export async function fetchHouseholds(userId: string): Promise<Household[]> {
  const res = await fetch(`${API_BASE}/households?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error("Failed to fetch households");
  return res.json();
}

export async function createHousehold(name: string, creatorId: string): Promise<Household> {
  const res = await fetch(`${API_BASE}/households`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, creatorId }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create household");
  }
  return res.json();
}

export async function joinHousehold(inviteCode: string, userId: string): Promise<{ success: boolean; household: Household }> {
  const res = await fetch(`${API_BASE}/households/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inviteCode, userId }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to join household");
  }
  return res.json();
}

export async function fetchHouseholdMembers(householdId: string): Promise<HouseholdMember[]> {
  const res = await fetch(`${API_BASE}/households/${encodeURIComponent(householdId)}/members`);
  if (!res.ok) throw new Error("Failed to fetch household members");
  return res.json();
}

// ---------------- Predictions & Forecasting ----------------
export async function fetchPredictions(params: {
  scope?: "public" | "household" | "my";
  householdId?: string;
  filter?: string;
  tag?: string;
  search?: string;
  userId?: string;
} = {}): Promise<Prediction[]> {
  const query = new URLSearchParams();
  if (params.scope) query.set("scope", params.scope);
  if (params.householdId) query.set("householdId", params.householdId);
  if (params.filter) query.set("filter", params.filter);
  if (params.tag) query.set("tag", params.tag);
  if (params.search) query.set("search", params.search);
  if (params.userId) query.set("userId", params.userId);

  const res = await fetch(`${API_BASE}/predictions?${query.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch predictions");
  return res.json();
}

export async function createPrediction(data: {
  title: string;
  probability: number;
  resolveBy: string;
  notes?: string;
  tags?: string[];
  userId: string;
  visibility?: "PUBLIC" | "HOUSEHOLD";
  householdId?: string | null;
}): Promise<Prediction> {
  const res = await fetch(`${API_BASE}/predictions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create prediction");
  }
  return res.json();
}

export async function addForecast(
  predictionId: string,
  data: { userId: string; probability: number; comment?: string }
): Promise<any> {
  const res = await fetch(`${API_BASE}/predictions/${predictionId}/forecast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to submit forecast");
  }
  return res.json();
}

export async function resolvePrediction(
  id: string,
  data: { resolution: string; resolutionNotes?: string }
): Promise<Prediction> {
  const res = await fetch(`${API_BASE}/predictions/${id}/resolve`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to resolve prediction");
  }
  return res.json();
}

export async function deletePrediction(id: string, userId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/predictions/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId,
    },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to delete prediction");
  }
  return res.json();
}

// ---------------- Leaderboard & Stats ----------------
export async function fetchLeaderboard(period: "year" | "month" | "all" = "year", year?: number): Promise<LeaderboardResponse> {
  const query = new URLSearchParams({ period });
  if (year) query.set("year", year.toString());
  const res = await fetch(`${API_BASE}/leaderboard?${query.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch leaderboard");
  return res.json();
}

export async function fetchStats(userId?: string): Promise<Stats> {
  const url = userId ? `${API_BASE}/stats?userId=${encodeURIComponent(userId)}` : `${API_BASE}/stats`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch statistics");
  return res.json();
}

export async function seedDemoData(): Promise<any> {
  const res = await fetch(`${API_BASE}/seed`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to seed demo data");
  return res.json();
}

export async function importBackup(data: any): Promise<any> {
  const res = await fetch(`${API_BASE}/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to import backup");
  }
  return res.json();
}
