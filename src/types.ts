export interface User {
  id: string;
  name: string;
  avatar: string;
  email?: string;
  created_at: string;
}

export interface Household {
  id: string;
  name: string;
  creator_id: string;
  invite_code: string;
  created_at: string;
  role?: "owner" | "member";
  member_count?: number;
}

export interface HouseholdMember {
  id: string;
  name: string;
  avatar: string;
  role: "owner" | "member";
  joined_at: string;
}

export interface Forecast {
  id: string;
  question_id: string;
  user_id: string;
  probability: number;
  comment?: string;
  created_at: string;
  user_name?: string;
  user_avatar?: string;
}

export interface Prediction {
  id: string;
  creator_id: string;
  creator_name: string;
  creator_avatar: string;
  title: string;
  notes?: string;
  resolve_by: string;
  resolved: boolean;
  resolution?: "YES" | "NO" | "AMBIGUOUS" | null;
  resolved_at?: string;
  resolution_notes?: string;
  tags: string[];
  created_at: string;
  forecasts: Forecast[];
  latestProbability: number;
  userProbability?: number | null;
  visibility: "PUBLIC" | "HOUSEHOLD";
  household_id?: string | null;
  household_name?: string | null;
  communityProbability?: number;
  communityCount?: number;
}

export interface CalibrationBucket {
  binIndex: number;
  binRange: string;
  binCenter: number;
  count: number;
  meanPrediction: number | null;
  meanOutcome: number | null;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar: string;
  publicBrierScore: number | null;
  totalBrierScore: number | null;
  publicScoredCount: number;
  totalScoredCount: number;
  privateScoredCount: number;
  winRate: number | null;
  grade: string;
}

export interface LeaderboardResponse {
  period: "year" | "month" | "all";
  year?: number;
  updatedAt: string;
  entries: LeaderboardEntry[];
}

export interface Stats {
  userId: string;
  userName: string;
  userAvatar: string;
  totalPredictions: number;
  userForecastCount: number;
  activeCount: number;
  resolvedCount: number;
  scoredCount: number;
  yesCount: number;
  noCount: number;
  ambiguousCount: number;
  brierScore: number | null;
  brierGrade: string;
  accuracyRate: number | null;
  calibrationBuckets: CalibrationBucket[];
}

export interface LanInfo {
  ip: string;
  port: number;
  localUrl: string;
  lanUrl: string;
}
