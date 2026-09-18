import React, { useEffect, useState } from "react";
import { Users, Home, Plus, Key, Copy, Check, Shield, UserPlus, X, Trash2 } from "lucide-react";
import { Household, HouseholdMember, User } from "../types";
import { createHousehold, fetchHouseholdMembers, fetchHouseholds, joinHousehold, adminDeleteHousehold } from "../api";
import { UserAvatar } from "./UserAvatar";

interface HouseholdManagerModalProps {
  currentUser: User | null;
  activeHousehold: Household | null;
  onSelectHousehold: (household: Household | null) => void;
  onClose: () => void;
}

export const HouseholdManagerModal: React.FC<HouseholdManagerModalProps> = ({
  currentUser,
  activeHousehold,
  onSelectHousehold,
  onClose,
}) => {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [createName, setCreateName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [activeTab, setActiveTab] = useState<"switch" | "create" | "join">("switch");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const loadHouseholds = async () => {
    if (!currentUser) return;
    try {
      const list = await fetchHouseholds(currentUser.id);
      setHouseholds(list);
      if (list.length > 0 && !activeHousehold) {
        onSelectHousehold(list[0]);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadMembers = async (householdId: string) => {
    try {
      const list = await fetchHouseholdMembers(householdId);
      setMembers(list);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadHouseholds();
  }, [currentUser]);

  useEffect(() => {
    if (activeHousehold) {
      loadMembers(activeHousehold.id);
    }
  }, [activeHousehold]);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim() || !currentUser) return;
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const created = await createHousehold(createName.trim(), currentUser.id);
      setHouseholds((prev) => [...prev, created]);
      onSelectHousehold(created);
      setCreateName("");
      setActiveTab("switch");
      setSuccessMsg(`Created circle "${created.name}"! Share code ${created.invite_code} with members.`);
    } catch (err: any) {
      setError(err.message || "Failed to create household");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || !currentUser) return;
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await joinHousehold(joinCode.trim().toUpperCase(), currentUser.id);
      setHouseholds((prev) => {
        const exists = prev.some((h) => h.id === res.household.id);
        return exists ? prev : [...prev, res.household];
      });
      onSelectHousehold(res.household);
      setJoinCode("");
      setActiveTab("switch");
      setSuccessMsg(`Successfully joined "${res.household.name}"!`);
    } catch (err: any) {
      setError(err.message || "Failed to join household. Verify invite code.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCircle = async (householdId: string, circleName: string) => {
    if (!currentUser) return;
    const isOwner = households.find(h => h.id === householdId)?.creator_id === currentUser.id;
    const msg = currentUser.isAdmin && !isOwner
      ? `Administrator Action: Permanently delete circle "${circleName}" and remove all members?`
      : `Permanently delete circle "${circleName}" and remove all members?`;
    if (!window.confirm(msg)) return;

    try {
      await adminDeleteHousehold(currentUser.id, householdId);
      setHouseholds(prev => prev.filter(h => h.id !== householdId));
      if (activeHousehold?.id === householdId) {
        onSelectHousehold(null);
      }
      setSuccessMsg(`Circle "${circleName}" removed.`);
    } catch (err: any) {
      setError(err.message || "Failed to delete circle");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="household-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "560px" }}
      >
        {/* Modal Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Home size={20} style={{ color: "var(--accent-brass)" }} />
            <h2 id="household-modal-title" style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", margin: 0 }}>
              Household & Private Circles
            </h2>
          </div>
          <button type="button" className="btn-ghost" onClick={onClose} style={{ padding: "0.3rem" }} title="Close dialog" aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="segmented-control" style={{ marginBottom: "1.25rem", width: "100%", display: "flex", margin: "0 0 1.25rem 0" }}>
          <button
            type="button"
            className={`segmented-tab-btn ${activeTab === "switch" ? "active" : ""}`}
            onClick={() => { setActiveTab("switch"); setError(""); setSuccessMsg(""); }}
            style={{ flex: 1, justifyContent: "center" }}
          >
            My Circles ({households.length})
          </button>
          <button
            type="button"
            className={`segmented-tab-btn ${activeTab === "join" ? "active" : ""}`}
            onClick={() => { setActiveTab("join"); setError(""); setSuccessMsg(""); }}
            style={{ flex: 1, justifyContent: "center" }}
          >
            Join Circle
          </button>
          <button
            type="button"
            className={`segmented-tab-btn ${activeTab === "create" ? "active" : ""}`}
            onClick={() => { setActiveTab("create"); setError(""); setSuccessMsg(""); }}
            style={{ flex: 1, justifyContent: "center" }}
          >
            Create New Circle
          </button>
        </div>

        {successMsg && (
          <div style={{ padding: "0.6rem 0.85rem", background: "rgba(45, 212, 191, 0.1)", border: "1px solid var(--mark-yes)", borderRadius: "var(--radius-xs)", color: "var(--mark-yes)", fontSize: "0.8rem", marginBottom: "1rem" }}>
            {successMsg}
          </div>
        )}

        {error && (
          <div style={{ padding: "0.6rem 0.85rem", background: "var(--mark-no-bg)", border: "1px solid var(--mark-no)", borderRadius: "var(--radius-xs)", color: "var(--mark-no)", fontSize: "0.8rem", marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        {/* Tab 1: Current Circles */}
        {activeTab === "switch" && (
          <div>
            {households.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem 1rem", background: "var(--bg-input)", borderRadius: "var(--radius-sm)" }}>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                  You don't belong to any household circles yet. Create one for your family or join with an invite code.
                </p>
                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                  <button type="button" className="btn-brass" onClick={() => setActiveTab("create")}>
                    Create Circle
                  </button>
                  <button type="button" className="btn-subtle" onClick={() => setActiveTab("join")}>
                    Join with Code
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {households.map((h) => {
                  const isActive = activeHousehold?.id === h.id;
                  return (
                    <div
                      key={h.id}
                      style={{
                        padding: "0.85rem 1rem",
                        background: isActive ? "rgba(245, 208, 97, 0.08)" : "var(--bg-input)",
                        border: `1px solid ${isActive ? "var(--border-brass)" : "var(--border-dim)"}`,
                        borderRadius: "var(--radius-sm)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.6rem"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.95rem", color: isActive ? "var(--accent-brass)" : "var(--text-primary)" }}>
                            {h.name}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span>Role: <b>{h.role || "member"}</b></span>
                            <span>•</span>
                            <span>{h.member_count || 1} members</span>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          {!isActive ? (
                            <button
                              type="button"
                              className="btn-subtle"
                              onClick={() => onSelectHousehold(h)}
                              style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}
                            >
                              Set Active
                            </button>
                          ) : (
                            <span style={{ fontSize: "0.72rem", color: "var(--accent-brass)", fontWeight: 700 }}>
                              Active Filter
                            </span>
                          )}

                          {(h.creator_id === currentUser?.id || currentUser?.isAdmin) && (
                            <button
                              type="button"
                              className="btn-ghost"
                              onClick={() => handleDeleteCircle(h.id, h.name)}
                              style={{ color: "var(--mark-no)", padding: "0.25rem 0.4rem", fontSize: "0.72rem" }}
                              title={currentUser?.isAdmin && h.creator_id !== currentUser?.id ? "Delete Circle as Administrator" : "Delete Circle"}
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Invite Code Bar */}
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.35rem 0.6rem",
                        background: "var(--bg-surface)",
                        borderRadius: "var(--radius-xs)",
                        fontSize: "0.78rem"
                      }}>
                        <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <Key size={12} /> Invite Code: <b style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{h.invite_code}</b>
                        </span>
                        <button
                          type="button"
                          className="chip-btn"
                          onClick={() => handleCopy(h.invite_code)}
                          style={{ padding: "0.15rem 0.45rem", fontSize: "0.72rem" }}
                        >
                          {copiedCode === h.invite_code ? <Check size={11} style={{ color: "var(--mark-yes)" }} /> : <Copy size={11} />}
                          <span>{copiedCode === h.invite_code ? "Copied" : "Copy Code"}</span>
                        </button>
                      </div>

                      {/* Members list preview if active */}
                      {isActive && members.length > 0 && (
                        <div style={{ borderTop: "1px solid var(--border-dim)", paddingTop: "0.5rem", marginTop: "0.25rem" }}>
                          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.35rem" }}>
                            Circle Members ({members.length})
                          </div>
                          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                            {members.map((m) => (
                              <div key={m.id} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: "var(--bg-surface)", padding: "0.2rem 0.5rem", borderRadius: "12px", fontSize: "0.75rem" }}>
                                <UserAvatar avatar={m.avatar} name={m.name} size={16} fontSize="0.85rem" />
                                <span style={{ fontWeight: 500 }}>{m.name}</span>
                                {m.role === "owner" && <span style={{ fontSize: "0.65rem", color: "var(--accent-brass)" }}>(owner)</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Join by Invite Code */}
        {activeTab === "join" && (
          <form onSubmit={handleJoin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0 }}>
              Enter the unique invite code provided by your household or circle admin (e.g. <code>KEPLER-77</code>).
            </p>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.3rem" }}>
                Household Invite Code
              </label>
              <input
                type="text"
                placeholder="e.g. KEPLER-77"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                style={{
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  background: "var(--bg-input)",
                  border: "1px solid var(--border-medium)",
                  borderRadius: "var(--radius-xs)",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  fontSize: "0.95rem"
                }}
                required
              />
            </div>
            <button type="submit" className="btn-brass" disabled={loading || !joinCode.trim()}>
              <UserPlus size={14} />
              <span>{loading ? "Joining..." : "Join Household Circle"}</span>
            </button>
          </form>
        )}

        {/* Tab 3: Create Circle */}
        {activeTab === "create" && (
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0 }}>
              Create a private household circle. Predictions scoped to this circle are only visible to members you share your invite code with.
            </p>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.3rem" }}>
                Circle / Household Name
              </label>
              <input
                type="text"
                placeholder="e.g. 742 Evergreen Circle, Orbital Labs, Family"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  background: "var(--bg-input)",
                  border: "1px solid var(--border-medium)",
                  borderRadius: "var(--radius-xs)",
                  color: "var(--text-primary)",
                  fontSize: "0.85rem"
                }}
                required
              />
            </div>
            <button type="submit" className="btn-brass" disabled={loading || !createName.trim()}>
              <Plus size={14} />
              <span>{loading ? "Creating..." : "Establish Circle"}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
