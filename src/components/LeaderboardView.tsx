import React, { useEffect, useState } from "react";
import { Trophy, Medal, Lock, Sparkles, RefreshCw, HelpCircle, ArrowUpRight, TrendingUp } from "lucide-react";
import { LeaderboardEntry, LeaderboardResponse, User } from "../types";
import { fetchLeaderboard } from "../api";

interface LeaderboardViewProps {
  currentUser: User | null;
  onSelectUser?: (user: User) => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ currentUser }) => {
  const currentYear = new Date().getFullYear();
  const [period, setPeriod] = useState<"year" | "all">("year");
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadLeaderboard = async (targetPeriod: "year" | "all", targetYear: number) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchLeaderboard(targetPeriod, targetPeriod === "year" ? targetYear : undefined);
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard(period, selectedYear);
  }, [period, selectedYear]);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <span style={{ color: "#F5D061", display: "inline-flex", alignItems: "center", gap: "0.2rem", fontWeight: 700 }}><Trophy size={15} /> 1st</span>;
    if (rank === 2) return <span style={{ color: "#E2E8F0", display: "inline-flex", alignItems: "center", gap: "0.2rem", fontWeight: 700 }}><Medal size={15} /> 2nd</span>;
    if (rank === 3) return <span style={{ color: "#D97706", display: "inline-flex", alignItems: "center", gap: "0.2rem", fontWeight: 700 }}><Medal size={15} /> 3rd</span>;
    return <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>#{rank}</span>;
  };

  return (
    <div className="leaderboard-view" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header Banner */}
      <div style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-medium)",
        borderRadius: "var(--radius-md)",
        padding: "1.5rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "1rem"
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
            <Trophy size={20} style={{ color: "var(--accent-brass)" }} />
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", margin: 0 }}>
              Forecasting Leaderboard
            </h2>
          </div>
          <p style={{ fontSize: "0.83rem", color: "var(--text-secondary)", margin: 0, maxWidth: "580px" }}>
            Ranked by lowest (best) <b>Brier Score</b> on public predictions. Lower score indicates superior probabilistic accuracy.
          </p>
        </div>

        {/* Period Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div className="filter-pills" style={{ background: "var(--bg-input)", padding: "0.2rem", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center" }}>
              <button
                type="button"
                className={`filter-pill ${period === "year" ? "active" : ""}`}
                onClick={() => setPeriod("year")}
                style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
              >
                <span>📅 {selectedYear}</span>
              </button>
              
              {period === "year" && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: "1px", paddingRight: "0.35rem" }}>
                  <button
                    type="button"
                    onClick={() => setSelectedYear((y) => y - 1)}
                    title="Previous year"
                    style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "0 3px", fontSize: "0.75rem", lineHeight: 1 }}
                  >
                    ◀
                  </button>
                  {selectedYear < currentYear && (
                    <button
                      type="button"
                      onClick={() => setSelectedYear((y) => y + 1)}
                      title="Next year"
                      style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "0 3px", fontSize: "0.75rem", lineHeight: 1 }}
                    >
                      ▶
                    </button>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              className={`filter-pill ${period === "all" ? "active" : ""}`}
              onClick={() => setPeriod("all")}
              style={{ fontSize: "0.8rem", padding: "0.35rem 0.85rem" }}
            >
              🌌 All Time
            </button>
          </div>

          <button
            type="button"
            className="btn-subtle"
            onClick={() => loadLeaderboard(period, selectedYear)}
            title="Refresh Leaderboard"
            style={{ padding: "0.45rem" }}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
          </button>
        </div>
      </div>

      {/* Privacy Guarantee Callout */}
      <div style={{
        background: "rgba(245, 208, 97, 0.05)",
        border: "1px solid var(--border-brass)",
        borderRadius: "var(--radius-sm)",
        padding: "0.85rem 1.15rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: "0.8rem",
        color: "var(--text-secondary)",
        gap: "1rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <Lock size={15} style={{ color: "var(--accent-brass)", flexShrink: 0 }} />
          <span>
            <b>Dual-Horizon Scoring:</b> Leaderboard ranks are determined exclusively by <b>public</b> claims. The <b>Total Score</b> column reflects overall calibration (public + private household claims), strictly without revealing private prediction text or reasons.
          </span>
        </div>
      </div>

      {/* Podium Cards for Top 3 */}
      {data && data.entries.length >= 2 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem"
        }}>
          {data.entries.slice(0, 3).map((entry) => {
            const isMe = entry.userId === currentUser?.id;
            return (
              <div
                key={entry.userId}
                style={{
                  background: isMe ? "rgba(245, 208, 97, 0.07)" : "var(--bg-surface)",
                  border: isMe ? "1px solid var(--border-brass)" : "1px solid var(--border-dim)",
                  borderRadius: "var(--radius-md)",
                  padding: "1.25rem",
                  position: "relative",
                  boxShadow: "var(--shadow-sm)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <div>{getRankBadge(entry.rank)}</div>
                  <span style={{
                    fontSize: "0.7rem",
                    padding: "0.15rem 0.5rem",
                    borderRadius: "10px",
                    background: entry.grade === "Superforecaster" ? "rgba(45, 212, 191, 0.15)" : "var(--bg-input)",
                    color: entry.grade === "Superforecaster" ? "var(--mark-yes)" : "var(--text-muted)",
                    fontWeight: 600
                  }}>
                    {entry.grade}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
                  <span style={{ fontSize: "1.75rem" }}>{entry.avatar}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem", color: isMe ? "var(--accent-brass)" : "var(--text-primary)" }}>
                      {entry.name} {isMe && <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>(You)</span>}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {entry.publicScoredCount} public claim{entry.publicScoredCount !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>

                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  borderTop: "1px solid var(--border-dim)",
                  paddingTop: "0.75rem"
                }}>
                  <div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Public Brier
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.25rem", fontWeight: 700, color: "var(--accent-brass)" }}>
                      {entry.publicBrierScore !== null ? entry.publicBrierScore.toFixed(3) : "—"}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.2rem", justifyContent: "flex-end" }}>
                      <Lock size={10} /> Total Brier
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)" }}>
                      {entry.totalBrierScore !== null ? entry.totalBrierScore.toFixed(3) : "—"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Leaderboard Table */}
      <div style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-dim)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden"
      }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "var(--bg-input)", borderBottom: "1px solid var(--border-medium)", color: "var(--text-muted)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                <th style={{ padding: "0.85rem 1rem", width: "70px" }}>Rank</th>
                <th style={{ padding: "0.85rem 1rem" }}>Forecaster</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>Public Brier</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>Public Claims</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>Win Rate</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                    <Lock size={11} /> Total Brier (incl. Private)
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data && data.entries.length > 0 ? (
                data.entries.map((entry) => {
                  const isMe = entry.userId === currentUser?.id;
                  return (
                    <tr
                      key={entry.userId}
                      style={{
                        borderBottom: "1px solid var(--border-dim)",
                        background: isMe ? "rgba(245, 208, 97, 0.05)" : "transparent",
                        transition: "background 0.15s ease"
                      }}
                    >
                      {/* Rank */}
                      <td style={{ padding: "0.85rem 1rem" }}>
                        {getRankBadge(entry.rank)}
                      </td>

                      {/* Forecaster info */}
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <span style={{ fontSize: "1.25rem" }}>{entry.avatar}</span>
                          <div>
                            <div style={{ fontWeight: isMe ? 700 : 500, color: isMe ? "var(--accent-brass)" : "var(--text-primary)" }}>
                              {entry.name} {isMe && <span style={{ fontSize: "0.72rem", color: "var(--accent-brass)", marginLeft: "0.3rem" }}>(You)</span>}
                            </div>
                            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                              {entry.grade}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Public Brier Score */}
                      <td style={{ padding: "0.85rem 1rem", textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.95rem", color: "var(--accent-brass)" }}>
                        {entry.publicBrierScore !== null ? entry.publicBrierScore.toFixed(3) : "—"}
                      </td>

                      {/* Public Claims */}
                      <td style={{ padding: "0.85rem 1rem", textAlign: "right", color: "var(--text-secondary)" }}>
                        {entry.publicScoredCount}
                      </td>

                      {/* Win Rate */}
                      <td style={{ padding: "0.85rem 1rem", textAlign: "right", color: "var(--text-secondary)" }}>
                        {entry.winRate !== null ? (
                          <span style={{ color: entry.winRate >= 70 ? "var(--mark-yes)" : "var(--text-primary)", fontWeight: 600 }}>
                            {entry.winRate}%
                          </span>
                        ) : "—"}
                      </td>

                      {/* Total Brier (Public + Private combined) */}
                      <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end" }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--text-primary)" }}>
                            {entry.totalBrierScore !== null ? entry.totalBrierScore.toFixed(3) : "—"}
                          </span>
                          {entry.privateScoredCount > 0 && (
                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: "0.2rem" }}>
                              <Lock size={9} /> +{entry.privateScoredCount} private
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: "3rem 1.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                    {loading ? (
                      <div>Calculating Brier scores across the cosmos...</div>
                    ) : (
                      <div>
                        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🏆</div>
                        <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>No scored public predictions in this period yet</div>
                        <p style={{ fontSize: "0.8rem", maxWidth: "420px", margin: "0 auto" }}>
                          Once public predictions resolve YES or NO, forecasters will appear on the leaderboard ranked by Brier accuracy score.
                        </p>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
