import { getDb } from "./db.js";

export interface ScoredForecast {
  forecast: number; // 0.01 to 0.99
  outcome: number;  // 1 for YES, 0 for NO
  questionId: string;
  title: string;
  visibility: string;
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
  rank: number | null;
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

export function computeBrierScore(forecast: number, resolution: string): number | null {
  if (resolution === "AMBIGUOUS" || !resolution) return null;
  const outcome = resolution === "YES" ? 1 : 0;
  return Math.pow(forecast - outcome, 2);
}

export function getBrierGrade(score: number | null): string {
  if (score === null) return "Unranked";
  if (score < 0.10) return "Superforecaster";
  if (score < 0.16) return "Well Calibrated";
  if (score < 0.22) return "Good Calibration";
  if (score <= 0.25) return "Average";
  return "Miscalibrated";
}

export function computeCalibrationBuckets(scoredForecasts: ScoredForecast[]): CalibrationBucket[] {
  const NUM_BINS = 10;
  const bins: ScoredForecast[][] = Array.from({ length: NUM_BINS }, () => []);

  for (const item of scoredForecasts) {
    let idx = Math.floor(item.forecast * NUM_BINS);
    if (idx >= NUM_BINS) idx = NUM_BINS - 1;
    if (idx < 0) idx = 0;
    bins[idx].push(item);
  }

  return bins.map((items, idx) => {
    const low = idx * 10;
    const high = (idx + 1) * 10;
    const binRange = `${low}% - ${high}%`;
    const binCenter = low + 5;

    if (items.length === 0) {
      return {
        binIndex: idx,
        binRange,
        binCenter,
        count: 0,
        meanPrediction: null,
        meanOutcome: null
      };
    }

    const sumPred = items.reduce((acc, curr) => acc + curr.forecast, 0);
    const sumOut = items.reduce((acc, curr) => acc + curr.outcome, 0);

    return {
      binIndex: idx,
      binRange,
      binCenter,
      count: items.length,
      meanPrediction: Number((sumPred / items.length).toFixed(4)),
      meanOutcome: Number((sumOut / items.length).toFixed(4))
    };
  });
}

export function computeLeaderboard(period: "year" | "month" | "all" = "year", year?: number): LeaderboardEntry[] {
  const db = getDb();
  const users = db.prepare("SELECT * FROM users").all() as any[];

  // Define period boundaries
  let dateFilterSql = "";
  const params: any[] = [];

  if (period === "year") {
    const targetYear = year || new Date().getFullYear();
    const startOfYear = new Date(targetYear, 0, 1).toISOString();
    const endOfYear = new Date(targetYear + 1, 0, 1).toISOString();
    dateFilterSql = " AND datetime(q.resolved_at) >= datetime(?) AND datetime(q.resolved_at) < datetime(?)";
    params.push(startOfYear, endOfYear);
  } else if (period === "month") {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    dateFilterSql = " AND datetime(q.resolved_at) >= datetime(?)";
    params.push(startOfMonth);
  }

  // Get all resolved questions (both YES and NO)
  const resolvedQuestions = db.prepare(`
    SELECT 
      q.id,
      q.title,
      q.visibility,
      q.resolution,
      q.resolved_at
    FROM questions q
    WHERE q.resolved = 1 AND q.resolution IN ('YES', 'NO')
    ${dateFilterSql}
  `).all(...params) as any[];

  // For each question, get all user forecasts
  const allForecasts = db.prepare(`
    SELECT question_id, user_id, probability, created_at
    FROM forecasts
    ORDER BY created_at ASC
  `).all() as any[];

  // Group latest forecast per (question_id, user_id)
  const latestForecastMap: Record<string, number> = {};
  for (const f of allForecasts) {
    const key = `${f.question_id}_${f.user_id}`;
    latestForecastMap[key] = f.probability;
  }

  const entries: LeaderboardEntry[] = [];

  for (const user of users) {
    let publicBrierSum = 0;
    let publicCount = 0;

    let combinedBrierSum = 0;
    let totalCount = 0;
    let correctDirectionCount = 0;

    for (const q of resolvedQuestions) {
      const key = `${q.id}_${user.id}`;
      const prob = latestForecastMap[key];

      if (prob !== undefined) {
        const outcome = q.resolution === "YES" ? 1 : 0;
        const brier = Math.pow(prob - outcome, 2);

        // Combined score tally
        combinedBrierSum += brier;
        totalCount++;

        if ((prob >= 0.5 && outcome === 1) || (prob < 0.5 && outcome === 0)) {
          correctDirectionCount++;
        }

        // Public score tally
        if (q.visibility === "PUBLIC") {
          publicBrierSum += brier;
          publicCount++;
        }
      }
    }

    const publicBrier = publicCount > 0 ? Number((publicBrierSum / publicCount).toFixed(3)) : null;
    const combinedBrier = totalCount > 0 ? Number((combinedBrierSum / totalCount).toFixed(3)) : null;
    const winRate = totalCount > 0 ? Math.round((correctDirectionCount / totalCount) * 100) : null;

    entries.push({
      rank: null, // assigned below
      userId: user.id,
      name: user.name,
      avatar: user.avatar || "🔭",
      publicBrierScore: publicBrier,
      totalBrierScore: combinedBrier,
      publicScoredCount: publicCount,
      totalScoredCount: totalCount,
      privateScoredCount: totalCount - publicCount,
      winRate,
      grade: getBrierGrade(publicBrier)
    });
  }

  // Sort: users with public forecasts sorted by publicBrierScore ascending (lower is better)
  // Users with 0 public forecasts sorted to the bottom
  entries.sort((a, b) => {
    if (a.publicBrierScore !== null && b.publicBrierScore !== null) {
      return a.publicBrierScore - b.publicBrierScore;
    }
    if (a.publicBrierScore !== null) return -1;
    if (b.publicBrierScore !== null) return 1;
    return b.totalScoredCount - a.totalScoredCount;
  });

  // Assign ranks
  let currentRank = 1;
  for (const entry of entries) {
    if (entry.publicBrierScore !== null) {
      entry.rank = currentRank++;
    } else {
      entry.rank = null;
    }
  }

  return entries;
}
