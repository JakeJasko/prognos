import React from "react";
import { Telescope, Target, CheckCircle2, XCircle, HelpCircle, Users, Sparkles } from "lucide-react";
import { Stats, User } from "../types";
import { CalibrationChart } from "./CalibrationChart";

interface ObservatoryInstrumentProps {
  stats: Stats | null;
  currentUser: User | null;
  users: User[];
  onOpenProfileModal: () => void;
}

export const ObservatoryInstrument: React.FC<ObservatoryInstrumentProps> = ({
  stats,
  currentUser,
  users,
  onOpenProfileModal,
}) => {
  return (
    <aside className="instrument-column">
      {/* Prognos Etymology & Definition */}
      <div className="instrument-card etymology-card">
        <div className="etymology-header">
          <div className="etymology-word">prog·nos</div>
          <div className="etymology-phonetic">/ˈprɒɡ.nɒs/</div>
        </div>
        <div className="etymology-origin">
          Ancient Greek <b>πρόγνωσις</b> (<em>prógnōsis</em>), from <b>πρό</b> (<em>pro-</em>, "before") + <b>γνῶσις</b> (<em>gnôsis</em>, "knowledge, to know").
        </div>
        <div className="etymology-meaning">
          <em>noun</em> — Foreknowledge; knowing beforehand; a calculated forecast of future events based on empirical observation and calibrated probability.
        </div>
      </div>

      {/* Principle & Artwork */}
      <div className="instrument-card">
        <img
          src="/telescope_future_1200_white.png"
          alt="Astronomer looking through celestial telescope"
          className="telescope-figure"
        />
        <h2 className="instrument-title">The Habit of Forecasting</h2>
        <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.45, marginBottom: "0.85rem" }}>
          Think in probabilities. "Probably" is ambiguous; "80%" is precise. Create a feedback loop by testing your conviction against reality.
        </p>

        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", fontSize: "0.75rem", color: "var(--accent-brass)" }}>
          <span>1. Frame Claim</span> • <span>2. Calibrate Odds</span> • <span>3. Seal & Learn</span>
        </div>
      </div>

      {/* Live Calibration Instrument */}
      <div className="instrument-card instrument-calibration-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <h2 className="instrument-title" style={{ marginBottom: 0 }}>Reliability Instrument</h2>
          <span style={{ fontSize: "0.72rem", color: "var(--accent-brass)", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            {currentUser ? `${currentUser.name}'s Record` : "Observer Calibration"}
          </span>
        </div>

        {/* Brier Score Metric */}
        <div className="brier-gauge-box">
          <div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.25rem" }}>
              Brier Accuracy Score
            </div>
            <div className="brier-num">
              {stats?.brierScore !== null && stats?.brierScore !== undefined
                ? stats.brierScore.toFixed(3)
                : "—"}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div className="brier-verdict" style={{ color: "var(--text-primary)" }}>
              {stats?.brierGrade || "Awaiting resolutions"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
              {stats?.scoredCount || 0} evaluated claims
            </div>
          </div>
        </div>

        {/* Calibration Reliability Chart */}
        <CalibrationChart buckets={stats?.calibrationBuckets || []} />

        {/* Diagnostic Breakdown */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border-dim)", paddingTop: "0.85rem", marginTop: "1rem", fontSize: "0.8rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--mark-yes)" }}>
            <CheckCircle2 size={13} />
            <span>{stats?.yesCount || 0} YES</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--mark-no)" }}>
            <XCircle size={13} />
            <span>{stats?.noCount || 0} NO</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--mark-ambiguous)" }}>
            <HelpCircle size={13} />
            <span>{stats?.ambiguousCount || 0} AMB</span>
          </div>

          <div style={{ color: "var(--text-muted)" }}>
            Win: <b>{stats?.accuracyRate !== null && stats?.accuracyRate !== undefined ? `${stats.accuracyRate}%` : "—"}</b>
          </div>
        </div>
      </div>

      {/* Household Observers */}
      <div className="instrument-card" style={{ padding: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", fontWeight: 600 }}>
            <Users size={14} style={{ color: "var(--accent-brass)" }} />
            <span>Household Observers</span>
          </div>

          <button
            type="button"
            className="btn-ghost"
            onClick={onOpenProfileModal}
            style={{ fontSize: "0.75rem", padding: "0.2rem 0.4rem" }}
          >
            Manage
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {users.map((u) => {
            const isMe = u.id === currentUser?.id;
            return (
              <div
                key={u.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.45rem 0.65rem",
                  borderRadius: "var(--radius-xs)",
                  background: isMe ? "rgba(245, 208, 97, 0.08)" : "transparent",
                  border: `1px solid ${isMe ? "var(--border-brass)" : "var(--border-dim)"}`,
                  fontSize: "0.82rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span>{u.avatar || "🔭"}</span>
                  <span style={{ fontWeight: isMe ? 700 : 500, color: isMe ? "var(--accent-brass)" : "var(--text-primary)" }}>
                    {u.name}
                  </span>
                </div>

                {isMe ? (
                  <span style={{ fontSize: "0.7rem", color: "var(--accent-brass)", fontWeight: 700 }}>
                    You (Active)
                  </span>
                ) : (
                  <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>
                    Forecaster
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
