import React, { useState } from "react";
import { X, Sparkles, Calendar, Tag, FileText } from "lucide-react";
import { User } from "../types";

interface NewPredictionModalProps {
  currentUser: User | null;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    probability: number;
    resolveBy: string;
    notes?: string;
    tags?: string[];
    userId: string;
  }) => Promise<void>;
}

export const NewPredictionModal: React.FC<NewPredictionModalProps> = ({
  currentUser,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState("");
  const [prob, setProb] = useState(70);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  
  // Default to 1 month from now
  const defaultDate = new Date();
  defaultDate.setMonth(defaultDate.getMonth() + 1);
  const [resolveBy, setResolveBy] = useState(defaultDate.toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const presets = [10, 25, 50, 60, 70, 80, 90, 95, 99];

  const getProbMeaning = (p: number) => {
    if (p === 50) return "Toss-up (50/50 coin flip)";
    if (p < 50) {
      if (p <= 5) return "Virtually impossible (~1 in 20+ chance)";
      if (p <= 15) return "Extremely unlikely (~1 in 10 chance)";
      if (p <= 30) return "Unlikely (~1 in 4 chance)";
      return "Slightly unlikely (~4 in 10 chance)";
    } else {
      if (p >= 98) return "Virtually certain (1 in 100 fluke)";
      if (p >= 90) return "Near certainty (1 in 10 surprise)";
      if (p >= 80) return "Very likely (4 out of 5 times)";
      if (p >= 65) return "Moderately likely (~7 in 10 chance)";
      return "Slight lean (~6 in 10 chance)";
    }
  };

  const setDateOffsetDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setResolveBy(d.toISOString().slice(0, 10));
  };

  const setEndOfYear = () => {
    const d = new Date();
    d.setMonth(11, 31);
    setResolveBy(d.toISOString().slice(0, 10));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter a prediction title or question");
      return;
    }
    if (!currentUser) {
      setError("Please select an active user");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await onSubmit({
        title: title.trim(),
        probability: prob / 100,
        resolveBy: new Date(resolveBy + "T23:59:59").toISOString(),
        notes: notes.trim() || undefined,
        tags: tagList,
        userId: currentUser.id,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create prediction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Sparkles size={20} style={{ color: "var(--accent-cyan)" }} />
            <h2 className="modal-title">Make a Prediction</h2>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ padding: "0.75rem", background: "rgba(244, 63, 94, 0.15)", border: "1px solid var(--accent-rose)", borderRadius: "var(--radius-sm)", color: "#fda4af", marginBottom: "1rem", fontSize: "0.85rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Question / Title */}
          <div className="form-group">
            <label className="form-label">What do you predict will happen?</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Will I run a 5k under 24 minutes by November?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
            />
          </div>

          {/* Probability Slider */}
          <div className="form-group">
            <label className="form-label">Your Probability / Confidence</label>
            <div className="slider-container">
              <div className="slider-val-display">{prob}%</div>
              <div className="slider-val-meaning">{getProbMeaning(prob)}</div>

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

          {/* Resolve Date */}
          <div className="form-group">
            <label className="form-label">
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                <Calendar size={14} /> Resolve By Date
              </span>
            </label>
            <input
              type="date"
              className="form-input"
              value={resolveBy}
              onChange={(e) => setResolveBy(e.target.value)}
              required
            />
            <div className="date-presets">
              <button type="button" className="filter-chip" onClick={() => setDateOffsetDays(7)}>
                +1 Week
              </button>
              <button type="button" className="filter-chip" onClick={() => setDateOffsetDays(30)}>
                +1 Month
              </button>
              <button type="button" className="filter-chip" onClick={() => setDateOffsetDays(90)}>
                +3 Months
              </button>
              <button type="button" className="filter-chip" onClick={setEndOfYear}>
                End of Year
              </button>
            </div>
          </div>

          {/* Reasoning & Notes */}
          <div className="form-group">
            <label className="form-label">
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                <FileText size={14} /> Context & Falsification Criteria (Optional)
              </span>
            </label>
            <textarea
              className="form-textarea"
              placeholder="Why do you think this? What evidence would change your mind?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Tags */}
          <div className="form-group">
            <label className="form-label">
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                <Tag size={14} /> Categories / Tags (Optional, comma-separated)
              </span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Health, Personal, Tech"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "2rem" }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Creating..." : "Save Prediction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
