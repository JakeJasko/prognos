import React, { useState } from "react";
import { X, CheckCircle2, XCircle, HelpCircle, Award } from "lucide-react";
import { Prediction } from "../types";

interface ResolutionModalProps {
  prediction: Prediction;
  onClose: () => void;
  onSubmit: (predictionId: string, resolution: string, resolutionNotes?: string) => Promise<void>;
}

export const ResolutionModal: React.FC<ResolutionModalProps> = ({
  prediction,
  onClose,
  onSubmit,
}) => {
  const [resolution, setResolution] = useState<"YES" | "NO" | "AMBIGUOUS">("YES");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await onSubmit(prediction.id, resolution, notes.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to resolve prediction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Award size={22} style={{ color: "var(--accent-cyan)" }} />
            <h2 className="modal-title">Resolve Prediction</h2>
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

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">How did this resolve?</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
              <button
                type="button"
                className={`btn ${resolution === "YES" ? "btn-primary" : "btn-secondary"}`}
                style={{
                  padding: "0.85rem",
                  flexDirection: "column",
                  gap: "0.4rem",
                  background: resolution === "YES" ? "rgba(16, 185, 129, 0.25)" : undefined,
                  borderColor: resolution === "YES" ? "var(--accent-emerald)" : undefined,
                  color: resolution === "YES" ? "#34d399" : undefined,
                }}
                onClick={() => setResolution("YES")}
              >
                <CheckCircle2 size={24} />
                <span style={{ fontWeight: 800 }}>YES</span>
              </button>

              <button
                type="button"
                className={`btn ${resolution === "NO" ? "btn-primary" : "btn-secondary"}`}
                style={{
                  padding: "0.85rem",
                  flexDirection: "column",
                  gap: "0.4rem",
                  background: resolution === "NO" ? "rgba(244, 63, 94, 0.25)" : undefined,
                  borderColor: resolution === "NO" ? "var(--accent-rose)" : undefined,
                  color: resolution === "NO" ? "#fb7185" : undefined,
                }}
                onClick={() => setResolution("NO")}
              >
                <XCircle size={24} />
                <span style={{ fontWeight: 800 }}>NO</span>
              </button>

              <button
                type="button"
                className={`btn ${resolution === "AMBIGUOUS" ? "btn-primary" : "btn-secondary"}`}
                style={{
                  padding: "0.85rem",
                  flexDirection: "column",
                  gap: "0.4rem",
                  background: resolution === "AMBIGUOUS" ? "rgba(245, 158, 11, 0.25)" : undefined,
                  borderColor: resolution === "AMBIGUOUS" ? "var(--accent-amber)" : undefined,
                  color: resolution === "AMBIGUOUS" ? "#fbbf24" : undefined,
                }}
                onClick={() => setResolution("AMBIGUOUS")}
              >
                <HelpCircle size={24} />
                <span style={{ fontWeight: 800, fontSize: "0.8rem" }}>AMBIGUOUS</span>
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Post-Mortem & Retrospective (Optional)</label>
            <textarea
              className="form-textarea"
              placeholder="What actually happened? Did unforeseen evidence occur? What can you learn to improve future calibrations?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Resolving..." : "Confirm Resolution"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
