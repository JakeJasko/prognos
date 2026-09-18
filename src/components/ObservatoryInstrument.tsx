import React from "react";
import { CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { Stats, User } from "../types";
import { CalibrationChart } from "./CalibrationChart";

interface ObservatoryInstrumentProps {
  stats: Stats | null;
  currentUser: User | null;
  onOpenProfileModal?: () => void;
}

export const ObservatoryInstrument: React.FC<ObservatoryInstrumentProps> = ({
  stats,
  currentUser,
}) => {
  return (
    <aside className="instrument-column">
      {/* Live Calibration & Reliability Instrument */}
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
    </aside>
  );
};
