import React, { useEffect, useState } from "react";
import {
  Shield,
  X,
  Users,
  Home,
  Telescope,
  Database,
  Search,
  Trash2,
  Edit2,
  Check,
  AlertCircle,
  CheckCircle2,
  Download,
  Upload,
  Sparkles,
  RefreshCw,
  Award
} from "lucide-react";
import { AdminOverview, Household, Prediction, User } from "../types";
import { UserAvatar } from "./UserAvatar";
import {
  fetchAdminOverview,
  fetchAdminHouseholds,
  fetchUsers,
  fetchPredictions,
  adminUpdateUser,
  adminDeleteUser,
  adminUpdateHousehold,
  adminDeleteHousehold,
  deletePrediction,
  resolvePrediction,
  importBackup,
  seedDemoData,
} from "../api";

interface AdminModalProps {
  currentUser: User;
  onClose: () => void;
  onRefreshData: () => Promise<void>;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  currentUser,
  onClose,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "circles" | "claims" | "backup">("overview");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Search queries for tabs
  const [userSearch, setUserSearch] = useState("");
  const [circleSearch, setCircleSearch] = useState("");
  const [claimSearch, setClaimSearch] = useState("");

  // Inline user editing
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState("");

  // Inline circle editing
  const [editingHouseholdId, setEditingHouseholdId] = useState<string | null>(null);
  const [editHouseholdName, setEditHouseholdName] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [ov, uList, hList, pList] = await Promise.all([
        fetchAdminOverview(currentUser.id),
        fetchUsers(),
        fetchAdminHouseholds(currentUser.id),
        fetchPredictions({ scope: undefined, userId: currentUser.id }),
      ]);
      setOverview(ov);
      setUsers(uList);
      setHouseholds(hList);
      setPredictions(pList);
    } catch (err: any) {
      setError(err.message || "Failed to load administrator data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const notify = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3500);
  };

  // ---------------- User Handlers ----------------
  const handleSaveUser = async (userId: string) => {
    if (!editUserName.trim()) return;
    try {
      const updated = await adminUpdateUser(currentUser.id, userId, { name: editUserName.trim() });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, name: updated.name } : u)));
      setEditingUserId(null);
      notify(`Updated user name to "${updated.name}"`);
      await onRefreshData();
    } catch (err: any) {
      setError(err.message || "Failed to update user");
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Permanently delete observer "${userName}"? All their predictions, forecasts, and circles will be removed.`)) {
      return;
    }
    try {
      await adminDeleteUser(currentUser.id, userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      notify(`Observer "${userName}" deleted.`);
      await onRefreshData();
    } catch (err: any) {
      setError(err.message || "Failed to delete user");
    }
  };

  // ---------------- Circle Handlers ----------------
  const handleSaveHousehold = async (householdId: string) => {
    if (!editHouseholdName.trim()) return;
    try {
      await adminUpdateHousehold(currentUser.id, householdId, editHouseholdName.trim());
      setHouseholds((prev) => prev.map((h) => (h.id === householdId ? { ...h, name: editHouseholdName.trim() } : h)));
      setEditingHouseholdId(null);
      notify(`Renamed circle to "${editHouseholdName.trim()}"`);
      await onRefreshData();
    } catch (err: any) {
      setError(err.message || "Failed to rename circle");
    }
  };

  const handleDeleteHousehold = async (householdId: string, circleName: string) => {
    if (!window.confirm(`Permanently delete circle "${circleName}" and disband membership?`)) {
      return;
    }
    try {
      await adminDeleteHousehold(currentUser.id, householdId);
      setHouseholds((prev) => prev.filter((h) => h.id !== householdId));
      notify(`Circle "${circleName}" deleted.`);
      await onRefreshData();
    } catch (err: any) {
      setError(err.message || "Failed to delete circle");
    }
  };

  // ---------------- Claim Handlers ----------------
  const handleDeleteClaim = async (claimId: string, claimTitle: string) => {
    if (!window.confirm(`Admin Action: Permanently delete claim "${claimTitle}"?`)) {
      return;
    }
    try {
      await deletePrediction(claimId, currentUser.id);
      setPredictions((prev) => prev.filter((p) => p.id !== claimId));
      notify(`Prediction "${claimTitle}" removed.`);
      await onRefreshData();
    } catch (err: any) {
      setError(err.message || "Failed to delete prediction");
    }
  };

  const handleForceResolve = async (claimId: string, resolution: "YES" | "NO" | "AMBIGUOUS") => {
    const notes = prompt(`Admin note for resolving as ${resolution} (optional):`) || undefined;
    try {
      await resolvePrediction(claimId, { resolution, resolutionNotes: notes });
      setPredictions((prev) =>
        prev.map((p) => (p.id === claimId ? { ...p, resolved: true, resolution } : p))
      );
      notify(`Claim marked as ${resolution}`);
      await onRefreshData();
    } catch (err: any) {
      setError(err.message || "Failed to resolve claim");
    }
  };

  // ---------------- Backup Handlers ----------------
  const handleExport = () => {
    window.location.href = `/api/export?userId=${encodeURIComponent(currentUser.id)}`;
    notify("Export downloaded successfully!");
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      await importBackup(json, currentUser.id);
      await loadData();
      await onRefreshData();
      notify("Archival backup imported successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to import backup");
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    if (!window.confirm("Reload demo sample predictions?")) return;
    setLoading(true);
    try {
      await seedDemoData(currentUser.id);
      await loadData();
      await onRefreshData();
      notify("Sample observations reloaded.");
    } catch (err: any) {
      setError(err.message || "Failed to seed demo data");
    } finally {
      setLoading(false);
    }
  };

  // Filtered lists
  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const filteredCircles = households.filter((h) =>
    h.name.toLowerCase().includes(circleSearch.toLowerCase()) ||
    h.invite_code.toLowerCase().includes(circleSearch.toLowerCase())
  );

  const filteredClaims = predictions.filter(
    (p) =>
      p.title.toLowerCase().includes(claimSearch.toLowerCase()) ||
      (p.creator_name && p.creator_name.toLowerCase().includes(claimSearch.toLowerCase()))
  );

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
        aria-labelledby="admin-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "880px",
          width: "95vw",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          padding: "1.5rem"
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Shield size={22} style={{ color: "var(--accent-brass)" }} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h2 id="admin-modal-title" style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>
                  Observatory Administrator Console
                </h2>
                <span
                  style={{
                    fontSize: "0.62rem",
                    background: "rgba(245, 208, 97, 0.2)",
                    color: "var(--accent-brass)",
                    fontWeight: 700,
                    padding: "0.15rem 0.4rem",
                    borderRadius: "4px",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase"
                  }}
                >
                  Admin Mode
                </span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                Full modification authority over Users, Circles, Claims, and Database Backups.
              </div>
            </div>
          </div>

          <button className="btn-ghost" onClick={onClose} title="Close Console">
            <X size={18} />
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div style={{ padding: "0.5rem 0.75rem", background: "var(--mark-no-bg)", border: "1px solid var(--mark-no)", borderRadius: "var(--radius-xs)", color: "var(--mark-no)", marginBottom: "0.85rem", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div style={{ padding: "0.5rem 0.75rem", background: "var(--mark-yes-bg)", border: "1px solid var(--mark-yes)", borderRadius: "var(--radius-xs)", color: "var(--mark-yes)", marginBottom: "0.85rem", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <CheckCircle2 size={14} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{ display: "flex", gap: "0.35rem", borderBottom: "1px solid var(--border-dim)", paddingBottom: "0.5rem", marginBottom: "1rem", overflowX: "auto" }}>
          <button
            type="button"
            className={`unified-pill ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
            style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem" }}
          >
            <Shield size={13} />
            <span>Overview</span>
          </button>
          <button
            type="button"
            className={`unified-pill ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
            style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem" }}
          >
            <Users size={13} />
            <span>Users ({users.length})</span>
          </button>
          <button
            type="button"
            className={`unified-pill ${activeTab === "circles" ? "active" : ""}`}
            onClick={() => setActiveTab("circles")}
            style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem" }}
          >
            <Home size={13} />
            <span>Circles ({households.length})</span>
          </button>
          <button
            type="button"
            className={`unified-pill ${activeTab === "claims" ? "active" : ""}`}
            onClick={() => setActiveTab("claims")}
            style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem" }}
          >
            <Telescope size={13} />
            <span>All Claims ({predictions.length})</span>
          </button>
          <button
            type="button"
            className={`unified-pill ${activeTab === "backup" ? "active" : ""}`}
            onClick={() => setActiveTab("backup")}
            style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem" }}
          >
            <Database size={13} />
            <span>Storage & Backup</span>
          </button>
        </div>

        {/* Tab Body */}
        <div style={{ flex: 1, overflowY: "auto", minHeight: "320px", paddingRight: "0.25rem" }}>
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem" }}>
                <div style={{ background: "var(--bg-input)", border: "1px solid var(--border-dim)", borderRadius: "var(--radius-xs)", padding: "0.85rem" }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Observers</div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.2rem" }}>{overview?.totalUsers ?? users.length}</div>
                </div>
                <div style={{ background: "var(--bg-input)", border: "1px solid var(--border-dim)", borderRadius: "var(--radius-xs)", padding: "0.85rem" }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Circles</div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--accent-brass)", marginTop: "0.2rem" }}>{overview?.totalHouseholds ?? households.length}</div>
                </div>
                <div style={{ background: "var(--bg-input)", border: "1px solid var(--border-dim)", borderRadius: "var(--radius-xs)", padding: "0.85rem" }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Claims</div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.2rem" }}>{overview?.totalQuestions ?? predictions.length}</div>
                </div>
                <div style={{ background: "var(--bg-input)", border: "1px solid var(--border-dim)", borderRadius: "var(--radius-xs)", padding: "0.85rem" }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Forecasts</div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--mark-yes)", marginTop: "0.2rem" }}>{overview?.totalForecasts ?? "—"}</div>
                </div>
              </div>

              {/* Admin Accounts List */}
              <div style={{ background: "var(--bg-input)", border: "1px solid var(--border-dim)", borderRadius: "var(--radius-xs)", padding: "1rem" }}>
                <h3 style={{ fontSize: "0.88rem", fontWeight: 600, marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <Shield size={14} style={{ color: "var(--accent-brass)" }} />
                  <span>Designated Administrators (.env)</span>
                </h3>
                <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "0.75rem", lineHeight: 1.4 }}>
                  Configured via <code>ADMIN_EMAILS</code>. These accounts hold system-wide modification privileges.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {(overview?.adminEmails || ["jakejasko@gmail.com"]).map((email) => (
                    <span
                      key={email}
                      style={{
                        fontSize: "0.75rem",
                        padding: "0.2rem 0.55rem",
                        background: "rgba(245, 208, 97, 0.12)",
                        border: "1px solid var(--border-brass)",
                        borderRadius: "var(--radius-xs)",
                        color: "var(--accent-brass)",
                        fontFamily: "var(--font-mono)"
                      }}
                    >
                      {email}
                    </span>
                  ))}
                </div>
              </div>

              {/* Server Diagnostics */}
              <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)", borderRadius: "var(--radius-xs)", padding: "1rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                <div>Node Environment: <b>{overview?.nodeVersion || process.version}</b></div>
                <div style={{ marginTop: "0.2rem" }}>Server Time: <b>{overview?.serverTime || new Date().toISOString()}</b></div>
                <div style={{ marginTop: "0.2rem" }}>Active Database: <code>data/predictions.db</code> (SQLite WAL Mode)</div>
              </div>
            </div>
          )}

          {/* TAB 2: USERS */}
          {activeTab === "users" && (
            <div>
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.85rem" }}>
                <div className="unified-search-wrapper" style={{ flex: 1, width: "auto" }}>
                  <Search size={13} style={{ opacity: 0.6 }} />
                  <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                  {userSearch && (
                    <button type="button" onClick={() => setUserSearch("")} className="search-clear-btn">
                      <X size={12} />
                    </button>
                  )}
                </div>
                <button type="button" className="btn-subtle" onClick={loadData} title="Refresh Users" style={{ padding: "0.35rem 0.65rem" }}>
                  <RefreshCw size={13} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {filteredUsers.map((u) => {
                  const isSelf = u.id === currentUser.id;
                  const isEditing = editingUserId === u.id;
                  return (
                    <div
                      key={u.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.65rem 0.85rem",
                        background: "var(--bg-input)",
                        border: `1px solid ${u.isAdmin ? "var(--border-brass)" : "var(--border-dim)"}`,
                        borderRadius: "var(--radius-xs)",
                        gap: "0.75rem",
                        flexWrap: "wrap"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                        <UserAvatar avatar={u.avatar} name={u.name} size={24} fontSize="1.2rem" />
                        <div>
                          {isEditing ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                              <input
                                type="text"
                                value={editUserName}
                                onChange={(e) => setEditUserName(e.target.value)}
                                style={{
                                  padding: "0.2rem 0.45rem",
                                  background: "var(--bg-surface)",
                                  border: "1px solid var(--accent-brass)",
                                  borderRadius: "4px",
                                  color: "var(--text-primary)",
                                  fontSize: "0.82rem"
                                }}
                              />
                              <button type="button" className="btn-brass" onClick={() => handleSaveUser(u.id)} style={{ padding: "0.2rem 0.5rem", fontSize: "0.72rem" }}>
                                <Check size={12} />
                              </button>
                              <button type="button" className="btn-ghost" onClick={() => setEditingUserId(null)} style={{ padding: "0.2rem 0.4rem", fontSize: "0.72rem" }}>
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)" }}>{u.name}</span>
                              {u.isAdmin && (
                                <span style={{ fontSize: "0.6rem", background: "rgba(245, 208, 97, 0.2)", color: "var(--accent-brass)", fontWeight: 700, padding: "0.1rem 0.35rem", borderRadius: "3px" }}>
                                  ADMIN
                                </span>
                              )}
                              {isSelf && (
                                <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontStyle: "italic" }}>(You)</span>
                              )}
                            </div>
                          )}
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "1px" }}>
                            {u.email || "No email"} • Joined {new Date(u.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        {!isEditing && (
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => {
                              setEditingUserId(u.id);
                              setEditUserName(u.name);
                            }}
                            title="Edit observer name"
                            style={{ padding: "0.25rem 0.45rem", fontSize: "0.75rem" }}
                          >
                            <Edit2 size={12} />
                          </button>
                        )}

                        {!isSelf && (
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            title="Permanently delete observer"
                            style={{ color: "var(--mark-no)", padding: "0.25rem 0.45rem", fontSize: "0.75rem" }}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: CIRCLES */}
          {activeTab === "circles" && (
            <div>
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.85rem" }}>
                <div className="unified-search-wrapper" style={{ flex: 1, width: "auto" }}>
                  <Search size={13} style={{ opacity: 0.6 }} />
                  <input
                    type="text"
                    placeholder="Search circles by name or invite code..."
                    value={circleSearch}
                    onChange={(e) => setCircleSearch(e.target.value)}
                  />
                  {circleSearch && (
                    <button type="button" onClick={() => setCircleSearch("")} className="search-clear-btn">
                      <X size={12} />
                    </button>
                  )}
                </div>
                <button type="button" className="btn-subtle" onClick={loadData} title="Refresh Circles" style={{ padding: "0.35rem 0.65rem" }}>
                  <RefreshCw size={13} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {filteredCircles.map((h) => {
                  const isEditing = editingHouseholdId === h.id;
                  return (
                    <div
                      key={h.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.65rem 0.85rem",
                        background: "var(--bg-input)",
                        border: "1px solid var(--border-dim)",
                        borderRadius: "var(--radius-xs)",
                        gap: "0.75rem",
                        flexWrap: "wrap"
                      }}
                    >
                      <div>
                        {isEditing ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                            <input
                              type="text"
                              value={editHouseholdName}
                              onChange={(e) => setEditHouseholdName(e.target.value)}
                              style={{
                                padding: "0.2rem 0.45rem",
                                background: "var(--bg-surface)",
                                border: "1px solid var(--accent-brass)",
                                borderRadius: "4px",
                                color: "var(--text-primary)",
                                fontSize: "0.82rem"
                              }}
                            />
                            <button type="button" className="btn-brass" onClick={() => handleSaveHousehold(h.id)} style={{ padding: "0.2rem 0.5rem", fontSize: "0.72rem" }}>
                              <Check size={12} />
                            </button>
                            <button type="button" className="btn-ghost" onClick={() => setEditingHouseholdId(null)} style={{ padding: "0.2rem 0.4rem", fontSize: "0.72rem" }}>
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)" }}>
                            {h.name}
                          </div>
                        )}
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "1px" }}>
                          Invite: <b style={{ fontFamily: "var(--font-mono)", color: "var(--accent-brass)" }}>{h.invite_code}</b> • {h.member_count || 1} members
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        {!isEditing && (
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => {
                              setEditingHouseholdId(h.id);
                              setEditHouseholdName(h.name);
                            }}
                            title="Rename circle"
                            style={{ padding: "0.25rem 0.45rem", fontSize: "0.75rem" }}
                          >
                            <Edit2 size={12} />
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => handleDeleteHousehold(h.id, h.name)}
                          title="Permanently delete circle"
                          style={{ color: "var(--mark-no)", padding: "0.25rem 0.45rem", fontSize: "0.75rem" }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: CLAIMS */}
          {activeTab === "claims" && (
            <div>
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.85rem" }}>
                <div className="unified-search-wrapper" style={{ flex: 1, width: "auto" }}>
                  <Search size={13} style={{ opacity: 0.6 }} />
                  <input
                    type="text"
                    placeholder="Search all claims by title or creator..."
                    value={claimSearch}
                    onChange={(e) => setClaimSearch(e.target.value)}
                  />
                  {claimSearch && (
                    <button type="button" onClick={() => setClaimSearch("")} className="search-clear-btn">
                      <X size={12} />
                    </button>
                  )}
                </div>
                <button type="button" className="btn-subtle" onClick={loadData} title="Refresh Claims" style={{ padding: "0.35rem 0.65rem" }}>
                  <RefreshCw size={13} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {filteredClaims.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      padding: "0.75rem 0.85rem",
                      background: "var(--bg-input)",
                      border: "1px solid var(--border-dim)",
                      borderRadius: "var(--radius-xs)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.45rem"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)" }}>{p.title}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                          By <b>{p.creator_name}</b> • {p.visibility === "HOUSEHOLD" ? `Circle (${p.household_name || "Private"})` : "Public Commons"} • Due: {new Date(p.resolve_by).toLocaleDateString()}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            padding: "0.15rem 0.4rem",
                            borderRadius: "3px",
                            background: p.resolved ? "rgba(45, 212, 191, 0.12)" : "rgba(245, 208, 97, 0.12)",
                            color: p.resolved ? "var(--mark-yes)" : "var(--accent-brass)"
                          }}
                        >
                          {p.resolved ? `Resolved: ${p.resolution}` : "Active"}
                        </span>

                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => handleDeleteClaim(p.id, p.title)}
                          title="Delete prediction as Administrator"
                          style={{ color: "var(--mark-no)", padding: "0.2rem 0.4rem", fontSize: "0.72rem" }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Admin Force Resolve Row */}
                    {!p.resolved && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", borderTop: "1px dashed var(--border-dim)", paddingTop: "0.45rem", fontSize: "0.72rem" }}>
                        <span style={{ color: "var(--text-muted)" }}>Admin Force Resolve:</span>
                        <button
                          type="button"
                          className="chip-btn"
                          onClick={() => handleForceResolve(p.id, "YES")}
                          style={{ color: "var(--mark-yes)", padding: "0.15rem 0.45rem", fontSize: "0.68rem" }}
                        >
                          YES
                        </button>
                        <button
                          type="button"
                          className="chip-btn"
                          onClick={() => handleForceResolve(p.id, "NO")}
                          style={{ color: "var(--mark-no)", padding: "0.15rem 0.45rem", fontSize: "0.68rem" }}
                        >
                          NO
                        </button>
                        <button
                          type="button"
                          className="chip-btn"
                          onClick={() => handleForceResolve(p.id, "AMBIGUOUS")}
                          style={{ color: "var(--mark-ambiguous)", padding: "0.15rem 0.45rem", fontSize: "0.68rem" }}
                        >
                          AMBIGUOUS
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: STORAGE & BACKUP */}
          {activeTab === "backup" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div style={{ padding: "0.85rem", background: "var(--bg-input)", borderRadius: "var(--radius-xs)", border: "1px solid var(--border-dim)" }}>
                <div style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.2rem" }}>
                  Export Archival Backup
                </div>
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.65rem" }}>
                  Download a complete JSON file of all predictions, forecasts, and observers.
                </p>
                <button className="btn-subtle" onClick={handleExport} style={{ padding: "0.35rem 0.75rem", fontSize: "0.78rem" }}>
                  <Download size={13} />
                  <span>Download JSON Backup</span>
                </button>
              </div>

              <div style={{ padding: "0.85rem", background: "var(--bg-input)", borderRadius: "var(--radius-xs)", border: "1px solid var(--border-dim)" }}>
                <div style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.2rem" }}>
                  Restore from Backup
                </div>
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.65rem" }}>
                  Upload a previously exported JSON backup to restore observations.
                </p>
                <label className="btn-subtle" style={{ padding: "0.35rem 0.75rem", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "0.35rem", cursor: "pointer", width: "fit-content" }}>
                  <Upload size={13} />
                  <span>{loading ? "Processing..." : "Choose File"}</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportFile}
                    disabled={loading}
                    style={{ display: "none" }}
                  />
                </label>
              </div>

              <div style={{ padding: "0.85rem", background: "rgba(245, 208, 97, 0.04)", borderRadius: "var(--radius-xs)", border: "1px solid var(--border-brass)" }}>
                <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--accent-brass)", marginBottom: "0.2rem" }}>
                  Sample Observations & Track Record
                </div>
                <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "0.65rem" }}>
                  Populate realistic predictions across tech, space, and personal habits with pre-resolved outcomes.
                </p>
                <button className="btn-brass" onClick={handleSeed} disabled={loading} style={{ padding: "0.35rem 0.75rem", fontSize: "0.78rem" }}>
                  <Sparkles size={13} />
                  <span>{loading ? "Loading..." : "Load Sample Observations"}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem", borderTop: "1px solid var(--border-dim)", paddingTop: "0.75rem" }}>
          <button className="btn-ghost" onClick={onClose} style={{ fontSize: "0.82rem" }}>
            Close Console
          </button>
        </div>
      </div>
    </div>
  );
};
