import React, { useState } from "react";
import { Sparkles, Calendar, ChevronDown, ChevronUp, Plus, Tag, ArrowRight, Globe, Home, Users, X } from "lucide-react";
import { Household, User } from "../types";

interface InlinePredictionCreatorProps {
  currentUser: User | null;
  households: Household[];
  activeHousehold: Household | null;
  onOpenHouseholdModal: () => void;
  onOpenAuthModal?: () => void;
  onClose?: () => void;
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
  onClose,
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
    if (p === 50) return "Quantum Coin Flip 🪙 (1 to 1 odds • 50/50)";
    if (p > 50) {
      if (p >= 98) return "Cosmic Certainty 🌌 (99 in 100 fluke)";
      if (p >= 95) return "High Conviction Telescope 🔭 (19 in 20 chance)";
      if (p >= 90) return "Overwhelming Stellar Tide 🌊 (9 in 10 chance)";
      if (p >= 80) return "Strong Probability 🌟 (4 in 5 chance)";
      if (p >= 70) return "Clear Favorite 🌕 (7 in 10 chance)";
      return "Leaning Likely 🌖 (3 in 5 chance)";
    } else {
      if (p <= 5) return "Miracle from the Void ✨ (1 in 20+ longshot)";
      if (p <= 15) return "Long Shot Comet ☄️ (1 in 10 chance)";
      if (p <= 25) return "Underdog Claim 🌑 (1 in 4 chance)";
      if (p <= 35) return "Skeptical Stargazer 🌘 (1 in 3 chance)";
      return "Leaning Against 🌗 (2 in 5 chance)";
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

  const INSPIRATION_PROMPTS = [
    { title: "SpaceX successfully catches Starship Super Heavy booster on first try", days: 90, prob: 80, tags: "Space,Aerospace" },
    { title: "Frontier LLM solves a novel Millennium Prize math problem before 2027", days: 280, prob: 35, tags: "AI,Science" },
    { title: "James Webb Space Telescope detects definitive biosignature on an exoplanet", days: 365, prob: 25, tags: "Astronomy,Discovery" },
    { title: "Commercial robotaxis operate in 10+ major US cities without safety drivers", days: 180, prob: 75, tags: "Tech,Autonomy" },
    { title: "Commercial supersonic passenger flights resume scheduled service by 2029", days: 730, prob: 50, tags: "Aviation,Engineering" },
    { title: "Human astronauts land on the lunar south pole with Artemis III", days: 450, prob: 65, tags: "Space,NASA" },
    { title: "A production humanoid robot completes a full manufacturing shift in automotive plant", days: 160, prob: 70, tags: "Robotics,AI" },
    { title: "I read at least 15 non-fiction books before the end of the year", days: 105, prob: 75, tags: "Personal,Habits" },
    { title: "Our household completes a 1-week digital detox campout this quarter", days: 60, prob: 85, tags: "Household,Wellbeing" },
    { title: "Global solar and wind generation exceeds 35% of total worldwide electricity", days: 320, prob: 60, tags: "Energy,Climate" },
  ];

  const handleSparkIdea = () => {
    const randomPrompt = INSPIRATION_PROMPTS[Math.floor(Math.random() * INSPIRATION_PROMPTS.length)];
    setTitle(randomPrompt.title);
    setProb(randomPrompt.prob);
    setDateOffset(randomPrompt.days);
    if (randomPrompt.tags) {
      setTags(randomPrompt.tags);
    }
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
        <div className="creator-prompt-header">
          <div className="creator-prompt" style={{ marginBottom: 0 }}>
            <Sparkles size={13} />
            <span>New Observation & Probability</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              type="button"
              className="spark-idea-btn"
              onClick={handleSparkIdea}
              title="Roll cosmic dice for an intriguing hypothesis"
            >
              <Sparkles size={11} />
              <span>Spark Idea 🎲</span>
            </button>
            {onClose && (
              <button
                type="button"
                className="creator-close-btn"
                onClick={onClose}
                title="Dismiss"
                aria-label="Close prediction form"
              >
                <X size={16} />
              </button>
            )}
          </div>
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
          aria-label={visibility === "PUBLIC" ? "Public prediction claim or question" : "Household prediction claim or question"}
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
            aria-label="Estimated probability percentage"
            aria-valuenow={prob}
            aria-valuemin={1}
            aria-valuemax={99}
          />

          <div className="scrubber-ticks">
            {ticks.map((val) => (
              <button
                key={val}
                type="button"
                className={`scrubber-tick ${prob === val ? "active" : ""}`}
                onClick={() => setProb(val)}
                aria-label={`Set probability to ${val}%`}
              >
                {val}%
              </button>
            ))}
          </div>
        </div>

        {/* Date Presets & Details Toggle */}
        <div className="creator-bottom">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <label
              htmlFor="creator-resolve-by-input"
              style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.25rem", cursor: "pointer" }}
            >
              <Calendar size={13} /> Target:
            </label>
            <input
              id="creator-resolve-by-input"
              type="date"
              value={resolveBy}
              onChange={(e) => setResolveBy(e.target.value)}
              className="creator-date-input"
              aria-label="Target resolution date"
            />
            <div className="quick-chips">
              <button type="button" className="chip-btn" onClick={() => setDateOffset(7)} aria-label="Add 1 week to target date">+1w</button>
              <button type="button" className="chip-btn" onClick={() => setDateOffset(30)} aria-label="Add 1 month to target date">+1m</button>
              <button type="button" className="chip-btn" onClick={() => setDateOffset(90)} aria-label="Add 3 months to target date">+3m</button>
              <button type="button" className="chip-btn" onClick={setEndOfYear} aria-label="Set target date to end of current year">Year-End</button>
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
