import React, { useState } from "react";
import { X, TrendingUp, History } from "lucide-react";
import { Prediction, User } from "../types";

interface ForecastModalProps {
  prediction: Prediction;
  currentUser: User | null;
  onClose: () => void;
  onSubmitForecast: (predictionId: string, probability: number, comment?: string) => Promise<void>;
}

export const ForecastModal: React.FC<ForecastModalProps> = ({
  prediction,
  currentUser,
  onClose,
  onSubmitForecast,
}) => {
  const [prob, setProb] = useState(Math.round(prediction.latestProbability * 100));
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const presets = [10, 25, 50, 60, 70, 80, 90, 95, 99];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setLoading(true);
    setError("");
    try {
      await onSubmitForecast(prediction.id, prob / 100, comment.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to submit forecast");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <TrendingUp size={20} style={{ color: "var(--accent-cyan)" }} />
            <h2 className="modal-title">Forecast History & Update</h2>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1.25rem", lineHeight: 1.4 }}>
          {prediction.title}
        </p>

        {error && (
          <div style={{ padding: "0.75rem", background: "rgba(244, 63, 94, 0.15)", border: "1px solid var(--accent-rose)", borderRadius: "var(--radius-sm)", color: "#fda4af", marginBottom: "1rem", fontSize: "0.85rem" }}>
            {error}
          </div>
        )}

        {/* Forecast History Timeline */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.75rem" }}>
            <History size={13} />
            <span>Forecast Timeline</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "160px", overflowY: "auto", paddingRight: "0.25rem" }}>
            {prediction.forecasts.map((f) => (
              <div
                key={f.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.6rem 0.85rem",
                  background: "var(--bg-input)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span>{f.user_avatar || "🔭"}</span>
                    <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{f.user_name || "User"}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      • {new Date(f.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {f.comment && (
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                      "{f.comment}"
                    </div>
                  )}
                </div>

                <div style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "1.1rem", color: "var(--accent-cyan)" }}>
                  {Math.round(f.probability * 100)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Update Form if active */}
        {!prediction.resolved ? (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Update Your Probability</label>
              <div className="slider-container">
                <div className="slider-val-display">{prob}%</div>

                <input
                  type="range"
                  min="1"
                  max="99"
                  value={prob}
                  onChange={(e) => setProb(Number(e.target.value))}
                  className="prob-slider"
                />

                <div className="presets-row">
                  {presets.map((val) => (
                    <button
                      key={val}
                      type="button"
                      className={`preset-chip ${prob === val ? "active" : ""}`}
                      onClick={() => setProb(val)}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">What changed? (Reason for update)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. New poll release, revised project timeline"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Saving..." : "Submit New Forecast"}
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
