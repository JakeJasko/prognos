import React, { useState } from "react";
import { Sparkles, Calendar, ChevronDown, ChevronUp, Plus, Tag, ArrowRight, Globe, Home, Users } from "lucide-react";
import { Household, User } from "../types";

interface InlinePredictionCreatorProps {
  currentUser: User | null;
  households: Household[];
  activeHousehold: Household | null;
  onOpenHouseholdModal: () => void;
  onOpenAuthModal?: () => void;
  onSubmit: (data: {
    title: string;
    probability: number;
    resolveBy: string;
    notes?: string;
    tags?: string[];
    userId: string;
    visibility: "PUBLIC" | "HOUSEHOLD";
    householdId?: string | null;
  }) => Promise<void>;
}

export const InlinePredictionCreator: React.FC<InlinePredictionCreatorProps> = ({
  currentUser,
  households,
  activeHousehold,
  onOpenHouseholdModal,
  onOpenAuthModal,
  onSubmit,
}) => {
  const [title, setTitle] = useState("");
  const [prob, setProb] = useState(75);
  const [visibility, setVisibility] = useState<"PUBLIC" | "HOUSEHOLD">("PUBLIC");
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string>(activeHousehold?.id || "");
  const [showDetails, setShowDetails] = useState(false);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  
  const defaultDate = new Date();
  defaultDate.setMonth(defaultDate.getMonth() + 1);
  const [resolveBy, setResolveBy] = useState(defaultDate.toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ticks = [10, 25, 50, 65, 75, 85, 90, 95, 99];

  // Sync selected household if prop changes
  React.useEffect(() => {
    if (activeHousehold && !selectedHouseholdId) {
      setSelectedHouseholdId(activeHousehold.id);
    } else if (households.length > 0 && !selectedHouseholdId) {
      setSelectedHouseholdId(households[0].id);
    }
  }, [activeHousehold, households]);

  const getOddsTranslation = (p: number) => {
    if (p === 50) return "Toss-up (1 to 1 odds • 50/50)";
    if (p > 50) {
      if (p >= 98) return "Virtually certain (99 in 100 fluke)";
      if (p >= 95) return "High conviction (19 in 20 chance)";
      if (p >= 90) return "Overwhelming favorite (9 in 10 chance)";
      if (p >= 80) return "Strong favorite (4 in 5 chance)";
      if (p >= 70) return "Clear favorite (7 in 10 chance)";
      return "Slight lean (3 in 5 chance)";
    } else {
      if (p <= 5) return "Extremely remote (1 in 20+ longshot)";
      if (p <= 15) return "Heavy underdog (1 in 10 chance)";
      if (p <= 25) return "Unlikely (1 in 4 chance)";
      if (p <= 35) return "Slight underdog (1 in 3 chance)";
      return "Leaning against (2 in 5 chance)";
    }
  };

  const setDateOffset = (days: number) => {
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
    if (!title.trim()) return;
    if (!currentUser) {
      if (onOpenAuthModal) onOpenAuthModal();
      setError("Please sign in with Google to record a prediction");
      return;
    }

    if (visibility === "HOUSEHOLD" && !selectedHouseholdId && households.length > 0) {
      setError("Please select which household to share this observation with");
      return;
    }

    if (visibility === "HOUSEHOLD" && households.length === 0) {
      setError("You must first create or join a household circle to post private observations");
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
        visibility,
        householdId: visibility === "HOUSEHOLD" ? (selectedHouseholdId || households[0]?.id) : null,
      });

      // Reset form
      setTitle("");
      setNotes("");
      setTags("");
      setShowDetails(false);
      setProb(75);
    } catch (err: any) {
      setError(err.message || "Failed to log prediction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inline-creator">
      {!currentUser && (
        <div style={{
          padding: "0.55rem 0.85rem",
          background: "rgba(245, 208, 97, 0.08)",
          border: "1px solid var(--border-brass)",
          borderRadius: "var(--radius-xs)",
          marginBottom: "0.85rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "0.82rem"
        }}>
          <span style={{ color: "var(--text-secondary)" }}>
            Sign in with Google to record observations and build your track record.
          </span>
          {onOpenAuthModal && (
            <button
              type="button"
              className="btn-brass"
              onClick={onOpenAuthModal}
              style={{ padding: "0.25rem 0.75rem", fontSize: "0.78rem" }}
            >
              Sign In
            </button>
          )}
        </div>
      )}

      <div className="creator-top-bar">
        <div className="creator-prompt" style={{ marginBottom: 0 }}>
          <Sparkles size={13} />
          <span>New Observation & Probability</span>
        </div>

        {/* Scope / Visibility Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <button
            type="button"
            className={`chip-btn ${visibility === "PUBLIC" ? "active" : ""}`}
            onClick={() => setVisibility("PUBLIC")}
            title="Public Commons: listed publicly for everyone to forecast and compete on the leaderboard"
            style={{
              borderColor: visibility === "PUBLIC" ? "var(--accent-brass)" : undefined,
              color: visibility === "PUBLIC" ? "var(--accent-brass)" : undefined,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem"
            }}
          >
            <Globe size={12} />
            <span>Public Commons</span>
          </button>

          <button
            type="button"
            className={`chip-btn ${visibility === "HOUSEHOLD" ? "active" : ""}`}
            onClick={() => setVisibility("HOUSEHOLD")}
            title="Household Circle: strictly visible to your household members only"
            style={{
              borderColor: visibility === "HOUSEHOLD" ? "var(--accent-brass)" : undefined,
              color: visibility === "HOUSEHOLD" ? "var(--accent-brass)" : undefined,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem"
            }}
          >
            <Home size={12} />
            <span>Household Circle</span>
          </button>
        </div>
      </div>

      {/* Household Selector if Household visibility chosen */}
      {visibility === "HOUSEHOLD" && (
        <div style={{
          background: "rgba(245, 208, 97, 0.05)",
          border: "1px solid var(--border-brass)",
          borderRadius: "var(--radius-xs)",
          padding: "0.45rem 0.75rem",
          marginBottom: "0.75rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "0.78rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ color: "var(--accent-brass)", fontWeight: 600 }}>Target Circle:</span>
            {households.length > 0 ? (
              <select
                value={selectedHouseholdId || (households[0]?.id || "")}
                onChange={(e) => setSelectedHouseholdId(e.target.value)}
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-medium)",
                  borderRadius: "var(--radius-xs)",
                  color: "var(--text-primary)",
                  padding: "0.2rem 0.4rem",
                  fontSize: "0.78rem",
                  fontFamily: "var(--font-sans)"
                }}
              >
                {households.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} (Code: {h.invite_code})
                  </option>
                ))}
              </select>
            ) : (
              <span style={{ color: "var(--mark-ambiguous)" }}>No household circles joined yet</span>
            )}
          </div>

          <button
            type="button"
            className="btn-ghost"
            onClick={onOpenHouseholdModal}
            style={{ fontSize: "0.72rem", padding: "0.15rem 0.45rem", color: "var(--accent-brass)" }}
          >
            Manage Circles
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          className="creator-input"
          placeholder={visibility === "PUBLIC" ? "What public event do you predict? (e.g. Artemis II launches by Oct 2026)" : "What household prediction do you want to record? (e.g. Kitchen remodel finishes under budget)"}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        {/* Tactile Probability Scrubber */}
        <div className="scrubber-panel">
          <div className="scrubber-header">
            <span className="scrubber-odds">{getOddsTranslation(prob)}</span>
            <span className="scrubber-val">{prob}%</span>
          </div>

          <input
            type="range"
            min="1"
            max="99"
            value={prob}
            onChange={(e) => setProb(Number(e.target.value))}
            className="scrubber-range"
          />

          <div className="scrubber-ticks">
            {ticks.map((val) => (
              <button
                key={val}
                type="button"
                className={`scrubber-tick ${prob === val ? "active" : ""}`}
                onClick={() => setProb(val)}
              >
                {val}%
              </button>
            ))}
          </div>
        </div>

        {/* Date Presets & Details Toggle */}
        <div className="creator-bottom">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <Calendar size={13} /> Target:
            </span>
            <input
              type="date"
              value={resolveBy}
              onChange={(e) => setResolveBy(e.target.value)}
              className="creator-date-input"
            />
            <div className="quick-chips">
              <button type="button" className="chip-btn" onClick={() => setDateOffset(7)}>+1w</button>
              <button type="button" className="chip-btn" onClick={() => setDateOffset(30)}>+1m</button>
              <button type="button" className="chip-btn" onClick={() => setDateOffset(90)}>+3m</button>
              <button type="button" className="chip-btn" onClick={setEndOfYear}>Year-End</button>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setShowDetails(!showDetails)}
              style={{ fontSize: "0.78rem" }}
            >
              <span>{showDetails ? "Less Context" : "Add Context / Tags"}</span>
              {showDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            <button
              type="submit"
              className="btn-brass creator-submit-btn"
              disabled={loading || !title.trim()}
            >
              <span>{loading ? "Recording..." : visibility === "PUBLIC" ? "Publish Observation" : "Log Household Claim"}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Expandable Reasoning & Tags Drawer */}
        {showDetails && (
          <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border-dim)", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.3rem", fontWeight: 600 }}>
                Reasoning & Falsification Criteria (What evidence would change your mind?)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write down why you hold this probability..."
                className="creator-textarea"
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.3rem", fontWeight: 600 }}>
                Categories / Tags (comma separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. Science, Tech, Personal"
                className="creator-details-input"
              />
            </div>
          </div>
        )}

        {error && (
          <div style={{ marginTop: "0.75rem", padding: "0.5rem", background: "var(--mark-no-bg)", border: "1px solid var(--mark-no)", borderRadius: "var(--radius-xs)", color: "var(--mark-no)", fontSize: "0.78rem" }}>
            {error}
          </div>
        )}
      </form>
    </div>
  );
};
