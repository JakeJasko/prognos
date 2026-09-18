import React, { useState } from "react";
import { ChevronDown, ChevronUp, Calendar, Clock, CheckCircle2, XCircle, HelpCircle, Trash2, ArrowUpRight, Check, Globe, Home, Users, PlusCircle, Sparkles } from "lucide-react";
import { Prediction, User } from "../types";

interface PredictionLedgerItemProps {
  prediction: Prediction;
  currentUser: User | null;
  onUpdateForecast: (predictionId: string, probability: number, comment?: string) => Promise<void>;
  onResolve: (predictionId: string, resolution: string, resolutionNotes?: string) => Promise<void>;
  onDelete: (predictionId: string) => Promise<void>;
}

export const PredictionLedgerItem: React.FC<PredictionLedgerItemProps> = ({
  prediction,
  currentUser,
  onUpdateForecast,
  onResolve,
  onDelete,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newProb, setNewProb] = useState(
    prediction.userProbability !== null && prediction.userProbability !== undefined
      ? Math.round(prediction.userProbability * 100)
      : Math.round(prediction.latestProbability * 100)
  );
  const [updateComment, setUpdateComment] = useState("");
  const [resolvingChoice, setResolvingChoice] = useState<"YES" | "NO" | "AMBIGUOUS" | null>(null);
  const [resolutionRetrospect, setResolutionRetrospect] = useState("");
  const [loading, setLoading] = useState(false);

  // Probability displays
  const consensusPercent = prediction.communityProbability !== undefined
    ? Math.round(prediction.communityProbability * 100)
    : Math.round(prediction.latestProbability * 100);

  const userProbPercent = prediction.userProbability !== null && prediction.userProbability !== undefined
    ? Math.round(prediction.userProbability * 100)
    : null;

  // Date calculation
  const resolveDate = new Date(prediction.resolve_by);
  const diffDays = Math.ceil((resolveDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  let timeText = "";
  if (diffDays > 0) {
    timeText = `${diffDays}d left (${resolveDate.toLocaleDateString()})`;
  } else if (diffDays === 0) {
    timeText = `Resolves today`;
  } else {
    timeText = `Overdue by ${Math.abs(diffDays)}d (${resolveDate.toLocaleDateString()})`;
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onUpdateForecast(prediction.id, newProb / 100, updateComment.trim() || undefined);
      setUpdateComment("");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmResolve = async () => {
    if (!resolvingChoice) return;
    setLoading(true);
    try {
      await onResolve(prediction.id, resolvingChoice, resolutionRetrospect.trim() || undefined);
      setResolvingChoice(null);
    } finally {
      setLoading(false);
    }
  };

  const probStampClass = prediction.resolved
    ? prediction.resolution === "YES"
      ? "has-resolved-yes"
      : prediction.resolution === "NO"
      ? "has-resolved-no"
      : "has-resolved-ambiguous"
    : "";

  return (
    <div className={`ledger-item ${prediction.resolved ? "is-resolved" : ""}`}>
      {/* Header Row */}
      <div
        className="ledger-item-header"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ cursor: "pointer" }}
      >
        <div className="item-main">
          {/* Title & Scope Badges */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
            <h3 className="item-title" style={{ marginBottom: 0 }}>{prediction.title}</h3>
            
            {/* Visibility Tag */}
            {prediction.visibility === "PUBLIC" ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  fontSize: "0.68rem",
                  padding: "0.15rem 0.45rem",
                  borderRadius: "10px",
                  background: "rgba(45, 212, 191, 0.12)",
                  color: "var(--mark-yes)",
                  fontWeight: 600,
                  letterSpacing: "0.02em"
                }}
                title="Public Commons: Anyone can add forecasts and compete on the leaderboard"
              >
                <Globe size={10} /> Public
              </span>
            ) : (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  fontSize: "0.68rem",
                  padding: "0.15rem 0.45rem",
                  borderRadius: "10px",
                  background: "rgba(245, 208, 97, 0.12)",
                  color: "var(--accent-brass)",
                  fontWeight: 600,
                  letterSpacing: "0.02em"
                }}
                title={`Household Circle: ${prediction.household_name || "Private"}`}
              >
                <Home size={10} /> {prediction.household_name || "Household"}
              </span>
            )}
          </div>
          
          <div className="item-meta">
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
              <span>{prediction.creator_avatar}</span>
              <span>{prediction.creator_name}</span>
            </span>

            <span>•</span>

            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
              <Clock size={12} style={{ opacity: 0.7 }} />
              <span>{prediction.resolved ? "Resolved" : timeText}</span>
            </span>

            {prediction.communityCount !== undefined && prediction.communityCount > 1 && (
              <>
                <span>•</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "var(--text-secondary)" }}>
                  <Users size={11} /> {prediction.communityCount} forecasters
                </span>
              </>
            )}

            {prediction.tags && prediction.tags.length > 0 && (
              <>
                <span>•</span>
                <span style={{ color: "var(--accent-brass)", opacity: 0.85 }}>
                  {prediction.tags.map((t) => `#${t}`).join(" ")}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Probability Box & Consensus */}
        <div className="item-prob-box" style={{ textAlign: "right" }}>
          <div className={`prob-stamp ${probStampClass}`}>
            {consensusPercent}%
          </div>

          <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
            {prediction.communityCount && prediction.communityCount > 1 ? "Consensus" : "Probability"}
          </div>

          {prediction.resolved && (
            <span
              className={`badge-resolution ${
                prediction.resolution === "YES"
                  ? "badge-yes"
                  : prediction.resolution === "NO"
                  ? "badge-no"
                  : "badge-ambiguous"
              }`}
              style={{ marginTop: "0.25rem" }}
            >
              {prediction.resolution === "YES" && <CheckCircle2 size={11} />}
              {prediction.resolution === "NO" && <XCircle size={11} />}
              {prediction.resolution === "AMBIGUOUS" && <HelpCircle size={11} />}
              <span>{prediction.resolution}</span>
            </span>
          )}
        </div>
      </div>

      {/* User's Own Quick Status Strip (if active & not expanded) */}
      {!isExpanded && !prediction.resolved && currentUser && (
        <div style={{
          padding: "0.35rem 1.25rem",
          background: userProbPercent !== null ? "rgba(245, 208, 97, 0.03)" : "rgba(45, 212, 191, 0.03)",
          borderTop: "1px dashed var(--border-dim)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "0.75rem"
        }}>
          <div>
            {userProbPercent !== null ? (
              <span style={{ color: "var(--text-secondary)" }}>
                Your estimate: <b style={{ color: "var(--accent-brass)" }}>{userProbPercent}%</b>
                {userProbPercent !== consensusPercent && (
                  <span style={{ opacity: 0.75, marginLeft: "0.3rem" }}>
                    ({userProbPercent > consensusPercent ? `+${userProbPercent - consensusPercent}%` : `${userProbPercent - consensusPercent}%`} vs consensus)
                  </span>
                )}
              </span>
            ) : (
              <span style={{ color: "var(--mark-yes)", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                <Sparkles size={11} /> Open claim — submit your probability to compete on the leaderboard!
              </span>
            )}
          </div>

          <button
            type="button"
            className="btn-ghost"
            onClick={() => setIsExpanded(true)}
            style={{ fontSize: "0.72rem", padding: "0.15rem 0.45rem", color: "var(--text-primary)" }}
          >
            {userProbPercent !== null ? "Revise Forecast" : "Add Forecast"}
          </button>
        </div>
      )}

      {/* Expandable In-Place Content */}
      <div className={`expandable-panel ${isExpanded ? "expanded" : ""}`}>
        <div className="expandable-inner">
          <div className="expanded-body">
            {/* Reasoning & Falsification */}
            {prediction.notes && (
              <div className="evidence-box">
                <div style={{ fontSize: "0.72rem", color: "var(--accent-brass)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
                  Observation Notes & Falsification Criteria
                </div>
                <div>{prediction.notes}</div>
              </div>
            )}

            {/* Resolution Retrospective Notes */}
            {prediction.resolution_notes && (
              <div className="evidence-box" style={{ borderLeftColor: "var(--mark-yes)" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--mark-yes)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
                  Outcome Retrospective
                </div>
                <div>{prediction.resolution_notes}</div>
              </div>
            )}

            {/* Competing Forecasts Log */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Forecaster Log ({prediction.forecasts.length})
                </div>

                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  Consensus Median: <b style={{ color: "var(--accent-brass)" }}>{consensusPercent}%</b>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {prediction.forecasts.map((f) => {
                  const isMe = f.user_id === currentUser?.id;
                  const probVal = Math.round(f.probability * 100);
                  return (
                    <div
                      key={f.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.45rem 0.65rem",
                        background: isMe ? "rgba(245, 208, 97, 0.08)" : "var(--bg-input)",
                        border: isMe ? "1px solid var(--border-brass)" : "1px solid transparent",
                        borderRadius: "var(--radius-xs)",
                        fontSize: "0.8rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span>{f.user_avatar || "🔭"}</span>
                        <span style={{ fontWeight: isMe ? 700 : 600, color: isMe ? "var(--accent-brass)" : "var(--text-primary)" }}>
                          {f.user_name || "Observer"} {isMe && "(You)"}
                        </span>
                        <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
                          ({new Date(f.created_at).toLocaleDateString()})
                        </span>
                        {f.comment && (
                          <span style={{ color: "var(--text-secondary)", fontStyle: "italic", marginLeft: "0.4rem" }}>
                            — "{f.comment}"
                          </span>
                        )}
                      </div>

                      <div style={{ fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                        {probVal}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* In-Place Forecasting / Updating (if active) */}
            {!prediction.resolved && currentUser && (
              <div style={{ borderTop: "1px solid var(--border-dim)", paddingTop: "1rem" }}>
                {resolvingChoice === null ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
                    {/* Add / Revise Forecast Form */}
                    <form onSubmit={handleUpdate} className="ledger-update-form" style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        {userProbPercent !== null ? "Revise your odds:" : "Your prediction:"}
                      </span>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={newProb}
                        onChange={(e) => setNewProb(Number(e.target.value))}
                        className="ledger-prob-input"
                      />
                      <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>%</span>
                      <input
                        type="text"
                        placeholder="Reasoning / Note (optional)"
                        value={updateComment}
                        onChange={(e) => setUpdateComment(e.target.value)}
                        className="ledger-comment-input"
                      />
                      <button type="submit" className="btn-brass ledger-submit-odds-btn" disabled={loading}>
                        {loading ? "Recording..." : userProbPercent !== null ? "Update Odds" : "Submit Forecast"}
                      </button>
                    </form>

                    {/* Trigger Inline Resolution Choice (Creator or Admin) */}
                    <div className="ledger-resolve-row" style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginRight: "0.25rem" }}>Resolve:</span>
                      <button
                        type="button"
                        className="btn-subtle ledger-resolve-btn"
                        onClick={() => setResolvingChoice("YES")}
                        style={{ color: "var(--mark-yes)", borderColor: "rgba(45, 212, 191, 0.3)" }}
                      >
                        YES
                      </button>
                      <button
                        type="button"
                        className="btn-subtle ledger-resolve-btn"
                        onClick={() => setResolvingChoice("NO")}
                        style={{ color: "var(--mark-no)", borderColor: "rgba(251, 113, 133, 0.3)" }}
                      >
                        NO
                      </button>
                      <button
                        type="button"
                        className="btn-subtle ledger-resolve-btn"
                        onClick={() => setResolvingChoice("AMBIGUOUS")}
                        style={{ color: "var(--mark-ambiguous)", borderColor: "rgba(251, 191, 36, 0.3)" }}
                      >
                        AMB
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Expanded Inline Resolution Confirmation Form */
                  <div style={{ background: "var(--bg-input)", padding: "1rem", borderRadius: "var(--radius-xs)", border: "1px solid var(--border-brass)" }}>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                      Confirm Resolution as: <b style={{ color: resolvingChoice === "YES" ? "var(--mark-yes)" : resolvingChoice === "NO" ? "var(--mark-no)" : "var(--mark-ambiguous)" }}>{resolvingChoice}</b>
                    </div>
                    <input
                      type="text"
                      placeholder="What actually happened? Post-mortem reflection note..."
                      value={resolutionRetrospect}
                      onChange={(e) => setResolutionRetrospect(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.4rem 0.65rem",
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border-medium)",
                        borderRadius: "var(--radius-xs)",
                        color: "var(--text-primary)",
                        fontSize: "0.82rem",
                        fontFamily: "var(--font-sans)",
                        marginBottom: "0.75rem"
                      }}
                    />
                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                      <button type="button" className="btn-ghost" onClick={() => setResolvingChoice(null)}>
                        Cancel
                      </button>
                      <button type="button" className="btn-brass" onClick={handleConfirmResolve} disabled={loading} style={{ padding: "0.35rem 0.85rem", fontSize: "0.8rem" }}>
                        {loading ? "Recording..." : "Seal Outcome"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Footer Toolbar */}
            <div className="inline-actions-row">
              <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                ID: {prediction.id}
              </span>

              {Boolean(currentUser && currentUser.id === prediction.creator_id) && (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm("Remove this observation from the ledger?")) {
                      onDelete(prediction.id);
                    }
                  }}
                  style={{ color: "var(--mark-no)", fontSize: "0.75rem" }}
                  title="Delete this prediction (only available to you as the creator)"
                >
                  <Trash2 size={12} />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
