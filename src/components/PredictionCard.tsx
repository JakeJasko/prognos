import React from "react";
import { CheckCircle2, XCircle, HelpCircle, Calendar, MessageSquare, Trash2, TrendingUp, Check } from "lucide-react";
import { Prediction, User } from "../types";

interface PredictionCardProps {
  prediction: Prediction;
  currentUser: User | null;
  onResolve: (prediction: Prediction) => void;
  onUpdateForecast: (prediction: Prediction) => void;
  onDelete: (predictionId: string) => void;
}

export const PredictionCard: React.FC<PredictionCardProps> = ({
  prediction,
  currentUser,
  onResolve,
  onUpdateForecast,
  onDelete,
}) => {
  const probPercent = Math.round(prediction.latestProbability * 100);
  
  // Format resolve-by date
  const resolveDate = new Date(prediction.resolve_by);
  const now = new Date();
  const diffTime = resolveDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let timeRemainingText = "";
  let isOverdue = false;
  if (diffDays > 0) {
    timeRemainingText = `Resolves in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
  } else if (diffDays === 0) {
    timeRemainingText = "Resolves today";
  } else {
    isOverdue = true;
    timeRemainingText = `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"}`;
  }

  // Resolved class
  const resolvedClass = prediction.resolved
    ? prediction.resolution === "YES"
      ? "resolved-yes"
      : prediction.resolution === "NO"
      ? "resolved-no"
      : "resolved-ambiguous"
    : "";

  return (
    <div className={`prediction-card ${resolvedClass}`}>
      <div>
        <div className="card-top">
          <h3 className="card-title">{prediction.title}</h3>
          
          <div className="prob-display">
            <div className="prob-badge">{probPercent}%</div>
            <div className="prob-meter">
              <div
                className="prob-meter-fill"
                style={{ width: `${probPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Resolution status or countdown */}
        <div style={{ marginBottom: "0.85rem" }}>
          {prediction.resolved ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {prediction.resolution === "YES" && (
                <span className="res-badge res-yes">
                  <CheckCircle2 size={13} /> Resolved YES
                </span>
              )}
              {prediction.resolution === "NO" && (
                <span className="res-badge res-no">
                  <XCircle size={13} /> Resolved NO
                </span>
              )}
              {prediction.resolution === "AMBIGUOUS" && (
                <span className="res-badge res-ambiguous">
                  <HelpCircle size={13} /> AMBIGUOUS
                </span>
              )}
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {prediction.resolved_at ? new Date(prediction.resolved_at).toLocaleDateString() : ""}
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", color: isOverdue ? "var(--accent-rose)" : "var(--text-muted)" }}>
              <Calendar size={13} />
              <span>{timeRemainingText} ({resolveDate.toLocaleDateString()})</span>
            </div>
          )}
        </div>

        {/* Notes / Reasoning */}
        {prediction.notes && (
          <div className="card-notes">
            <div style={{ fontSize: "0.72rem", color: "var(--accent-indigo)", fontWeight: 700, marginBottom: "0.2rem", textTransform: "uppercase" }}>
              Reasoning & Context
            </div>
            {prediction.notes}
          </div>
        )}

        {/* Resolution Notes */}
        {prediction.resolution_notes && (
          <div className="card-notes" style={{ borderLeftColor: "var(--accent-emerald)" }}>
            <div style={{ fontSize: "0.72rem", color: "var(--accent-emerald)", fontWeight: 700, marginBottom: "0.2rem", textTransform: "uppercase" }}>
              Resolution Retrospective
            </div>
            {prediction.resolution_notes}
          </div>
        )}

        {/* Tags */}
        {prediction.tags && prediction.tags.length > 0 && (
          <div className="card-tags">
            {prediction.tags.map((tag, idx) => (
              <span key={idx} className="tag-pill">#{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Footer & Actions */}
      <div>
        <div className="card-meta">
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span>{prediction.creator_avatar}</span>
            <span>{prediction.creator_name}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <MessageSquare size={13} />
            <span>{prediction.forecasts.length} forecast{prediction.forecasts.length === 1 ? "" : "s"}</span>
          </div>
        </div>

        <div className="card-actions">
          {!prediction.resolved ? (
            <>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onUpdateForecast(prediction)}
                style={{ flex: 1 }}
              >
                <TrendingUp size={14} />
                <span>Forecast</span>
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onResolve(prediction)}
                style={{ flex: 1 }}
              >
                <Check size={14} />
                <span>Resolve</span>
              </button>
            </>
          ) : (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onUpdateForecast(prediction)}
              style={{ flex: 1 }}
            >
              <span>View History</span>
            </button>
          )}

          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={() => {
              if (window.confirm("Are you sure you want to delete this prediction?")) {
                onDelete(prediction.id);
              }
            }}
            title="Delete prediction"
            style={{ color: "var(--text-muted)" }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
