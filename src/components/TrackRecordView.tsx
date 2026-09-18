import React from "react";
import { Award, Target, HelpCircle, CheckCircle2, XCircle, TrendingUp } from "lucide-react";
import { Stats, User } from "../types";
import { CalibrationChart } from "./CalibrationChart";

interface TrackRecordViewProps {
  stats: Stats | null;
  currentUser: User | null;
}

export const TrackRecordView: React.FC<TrackRecordViewProps> = ({ stats, currentUser }) => {
  return (
    <div>
      {/* Telescope Concept Banner matching the User's Reference Image */}
      <div className="track-record-header">
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.2rem 0.6rem", background: "rgba(99, 102, 241, 0.2)", border: "1px solid rgba(99, 102, 241, 0.4)", borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "0.85rem", textTransform: "uppercase" }}>
            <Target size={12} /> The Habit of Forecasting
          </div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "0.85rem", lineHeight: 1.2 }}>
            Why build a habit of forecasting?
          </h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div>
              <b style={{ color: "var(--accent-cyan)" }}>Make better decisions:</b>{" "}
              <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                Get a clearer view of consequences by thinking through the important questions.
              </span>
            </div>
            <div>
              <b style={{ color: "var(--accent-violet)" }}>Communicate more clearly:</b>{" "}
              <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                Write down your prediction as a probability. "Probably" is ambiguous; "80%" is precise.
              </span>
            </div>
            <div>
              <b style={{ color: "var(--accent-emerald)" }}>Build your track record:</b>{" "}
              <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                Resolve your predictions as YES, NO, or AMBIGUOUS to create an empowering feedback loop.
              </span>
            </div>
          </div>
        </div>

        <div>
          <img
            src="/telescope_future_1200_white.png"
            alt="Forecaster looking through celestial telescope"
            className="track-record-banner-img"
          />
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="stats-grid">
        {/* Brier Score Card */}
        <div className="stat-card" style={{ borderColor: "rgba(99, 102, 241, 0.35)", background: "linear-gradient(180deg, rgba(25, 35, 65, 0.6) 0%, rgba(13, 19, 36, 0.9) 100%)" }}>
          <div className="stat-label">Brier Score (Lower is better)</div>
          <div className="stat-val" style={{ color: "var(--accent-cyan)" }}>
            {stats?.brierScore !== null && stats?.brierScore !== undefined
              ? stats.brierScore.toFixed(3)
              : "—"}
          </div>
          <div className="stat-sub" style={{ fontWeight: 600, color: "var(--accent-violet)" }}>
            {stats?.brierGrade || "No resolved predictions"}
          </div>
        </div>

        {/* Directional Accuracy */}
        <div className="stat-card">
          <div className="stat-label">Directional Accuracy</div>
          <div className="stat-val" style={{ color: "#34d399" }}>
            {stats?.accuracyRate !== null && stats?.accuracyRate !== undefined
              ? `${stats.accuracyRate}%`
              : "—"}
          </div>
          <div className="stat-sub">
            {stats?.scoredCount || 0} evaluated questions
          </div>
        </div>

        {/* Total Predictions & Active */}
        <div className="stat-card">
          <div className="stat-label">Total Predictions</div>
          <div className="stat-val">
            {stats?.totalPredictions || 0}
          </div>
          <div className="stat-sub">
            {stats?.activeCount || 0} active, {stats?.resolvedCount || 0} resolved
          </div>
        </div>

        {/* Resolution Breakdown */}
        <div className="stat-card">
          <div className="stat-label">Outcomes Ratio</div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.35rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "#34d399", fontWeight: 700, fontSize: "1.1rem" }}>
              <CheckCircle2 size={16} /> {stats?.yesCount || 0}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "#fb7185", fontWeight: 700, fontSize: "1.1rem" }}>
              <XCircle size={16} /> {stats?.noCount || 0}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "#fbbf24", fontWeight: 700, fontSize: "1.1rem" }}>
              <HelpCircle size={16} /> {stats?.ambiguousCount || 0}
            </div>
          </div>
          <div className="stat-sub" style={{ marginTop: "0.5rem" }}>
            YES / NO / AMBIGUOUS
          </div>
        </div>
      </div>

      {/* Interactive Calibration Reliability Diagram */}
      <CalibrationChart buckets={stats?.calibrationBuckets || []} />
    </div>
  );
};
