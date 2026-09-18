import React, { useEffect, useState } from "react";
import { Search, Telescope, Sparkles, Globe, Home, UserCheck, Trophy, X } from "lucide-react";
import {
  fetchPredictions,
  fetchStats,
  fetchUsers,
  fetchHouseholds,
  createPrediction,
  addForecast,
  resolvePrediction,
  deletePrediction,
} from "./api";
import { Household, Prediction, Stats, User } from "./types";
import { Navbar } from "./components/Navbar";
import { InlinePredictionCreator } from "./components/InlinePredictionCreator";
import { PredictionLedgerItem } from "./components/PredictionLedgerItem";
import { ObservatoryInstrument } from "./components/ObservatoryInstrument";
import { LeaderboardView } from "./components/LeaderboardView";
import { HouseholdManagerModal } from "./components/HouseholdManagerModal";
import { ProfileModal } from "./components/ProfileModal";
import { BackupModal } from "./components/BackupModal";
import { MobileBottomNav } from "./components/MobileBottomNav";

export const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [activeHousehold, setActiveHousehold] = useState<Household | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  const [activeNavTab, setActiveNavTab] = useState<"observatory" | "leaderboard" | "instrument">("observatory");
  const [scopeFilter, setScopeFilter] = useState<"all" | "public" | "household" | "my">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "resolved" | "due">("active");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isHouseholdOpen, setIsHouseholdOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const fetchedUsers = await fetchUsers();
      setUsers(fetchedUsers);

      const savedUserId = localStorage.getItem("prognos_local_user_id");
      const matched = fetchedUsers.find((u) => u.id === savedUserId);
      const active = matched || null;
      setCurrentUser(active);

      if (active) {
        await refreshUserData(active.id);
      } else {
        await refreshPredictionsAndStats(undefined, "all");
      }
    } catch (err) {
      console.error("Error loading initial data:", err);
    } finally {
      setLoading(false);
    }
  };

  const refreshUserData = async (userId: string) => {
    try {
      const userHouseholds = await fetchHouseholds(userId);
      setHouseholds(userHouseholds);
      if (userHouseholds.length > 0 && !activeHousehold) {
        setActiveHousehold(userHouseholds[0]);
      }
      await refreshPredictionsAndStats(userId, scopeFilter, activeHousehold?.id);
    } catch (err) {
      console.error("Error refreshing user data:", err);
    }
  };

  const refreshPredictionsAndStats = async (
    userId?: string,
    currentScope: "all" | "public" | "household" | "my" = scopeFilter,
    householdId?: string
  ) => {
    try {
      const scopeParam = currentScope === "all" ? undefined : currentScope;
      const [preds, fetchedStats] = await Promise.all([
        fetchPredictions({
          scope: scopeParam,
          householdId: currentScope === "household" ? (householdId || activeHousehold?.id) : undefined,
          userId,
        }),
        fetchStats(userId),
      ]);
      setPredictions(preds);
      setStats(fetchedStats);
    } catch (err) {
      console.error("Error refreshing predictions/stats:", err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleLoginSuccess = async (user: User) => {
    setCurrentUser(user);
    localStorage.setItem("prognos_local_user_id", user.id);
    setUsers((prev) => {
      const exists = prev.some((u) => u.id === user.id);
      return exists ? prev.map((u) => u.id === user.id ? user : u) : [...prev, user];
    });
    await refreshUserData(user.id);
  };

  const handleLogout = async () => {
    localStorage.removeItem("prognos_local_user_id");
    localStorage.removeItem("fatebook_local_user_id");
    setCurrentUser(null);
    setHouseholds([]);
    setActiveHousehold(null);
    if ((window as any).google?.accounts?.id) {
      (window as any).google.accounts.id.disableAutoSelect();
    }
    await refreshPredictionsAndStats(undefined, "all");
    if (scopeFilter === "my" || scopeFilter === "household") {
      setScopeFilter("all");
    }
  };

  const handleScopeChange = (newScope: "all" | "public" | "household" | "my") => {
    setScopeFilter(newScope);
    refreshPredictionsAndStats(currentUser?.id, newScope, activeHousehold?.id);
  };

  const handleSelectHousehold = (h: Household | null) => {
    setActiveHousehold(h);
    if (scopeFilter === "household") {
      refreshPredictionsAndStats(currentUser?.id, "household", h?.id);
    }
  };

  const handleCreatePrediction = async (data: any) => {
    if (!currentUser) {
      setIsProfileOpen(true);
      return;
    }
    await createPrediction({ ...data, userId: currentUser.id });
    await refreshPredictionsAndStats(currentUser.id, scopeFilter, activeHousehold?.id);
  };

  const handleAddForecast = async (predictionId: string, probability: number, comment?: string) => {
    if (!currentUser) {
      setIsProfileOpen(true);
      return;
    }
    await addForecast(predictionId, { userId: currentUser.id, probability, comment });
    await refreshPredictionsAndStats(currentUser.id, scopeFilter, activeHousehold?.id);
  };

  const handleResolve = async (predictionId: string, resolution: string, resolutionNotes?: string) => {
    await resolvePrediction(predictionId, { resolution, resolutionNotes });
    await refreshPredictionsAndStats(currentUser?.id, scopeFilter, activeHousehold?.id);
  };

  const handleDelete = async (predictionId: string) => {
    if (!currentUser) {
      setIsProfileOpen(true);
      return;
    }
    try {
      await deletePrediction(predictionId, currentUser.id);
      await refreshPredictionsAndStats(currentUser.id, scopeFilter, activeHousehold?.id);
    } catch (err: any) {
      alert(err.message || "Failed to delete prediction");
    }
  };

  // Collect unique tags from currently loaded predictions
  const allTags = Array.from(new Set(predictions.flatMap((p) => p.tags))).filter(Boolean);

  // Filter ledger items
  const filteredPredictions = predictions.filter((p) => {
    if (statusFilter === "active" && p.resolved) return false;
    if (statusFilter === "resolved" && !p.resolved) return false;
    if (statusFilter === "due") {
      if (p.resolved) return false;
      const resolveDate = new Date(p.resolve_by).getTime();
      const nextWeek = Date.now() + 7 * 24 * 60 * 60 * 1000;
      if (resolveDate > nextWeek) return false;
    }

    if (selectedTag && !p.tags.includes(selectedTag)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchNotes = p.notes?.toLowerCase().includes(q);
      if (!matchTitle && !matchNotes) return false;
    }

    return true;
  });

  const activeCount = predictions.filter((p) => !p.resolved).length;
  const resolvedCount = predictions.filter((p) => p.resolved).length;

  return (
    <div className="app-shell">
      {/* Observatory Header */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeNavTab}
        onTabChange={setActiveNavTab}
        activeHousehold={activeHousehold}
        onOpenHouseholdModal={() => setIsHouseholdOpen(true)}
        onOpenProfileModal={() => setIsProfileOpen(true)}
        onOpenBackupModal={() => setIsBackupOpen(true)}
      />

      {/* Main Content Area */}
      {activeNavTab === "leaderboard" ? (
        <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "1.5rem 1rem", width: "100%" }}>
          <LeaderboardView currentUser={currentUser} />
        </main>
      ) : activeNavTab === "instrument" ? (
        <main className="mobile-instrument-page" style={{ maxWidth: "720px", margin: "0 auto", width: "100%", padding: "0 0.25rem" }}>
          <ObservatoryInstrument
            stats={stats}
            currentUser={currentUser}
            users={users}
            onOpenProfileModal={() => setIsProfileOpen(true)}
          />
        </main>
      ) : (
        <main className="observatory-layout">
          {/* Left Column: The Astronomer's Ledger */}
          <section className="ledger-column">
            {/* In-Situ Fast Prediction Creator */}
            <InlinePredictionCreator
              currentUser={currentUser}
              households={households}
              activeHousehold={activeHousehold}
              onOpenHouseholdModal={() => setIsHouseholdOpen(true)}
              onOpenAuthModal={() => setIsProfileOpen(true)}
              onSubmit={handleCreatePrediction}
            />

            {/* Scope Bar (Public Commons vs Household Circle vs My Predictions) */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-dim)",
              borderRadius: "var(--radius-sm)",
              padding: "0.5rem 0.85rem",
              marginBottom: "1rem",
              flexWrap: "wrap",
              gap: "0.5rem"
            }}>
              <div className="filter-pills" style={{ display: "flex", gap: "0.25rem" }}>
                <button
                  type="button"
                  className={`filter-pill ${scopeFilter === "all" ? "active" : ""}`}
                  onClick={() => handleScopeChange("all")}
                  style={{ fontSize: "0.78rem" }}
                >
                  All Visible
                </button>
                <button
                  type="button"
                  className={`filter-pill ${scopeFilter === "public" ? "active" : ""}`}
                  onClick={() => handleScopeChange("public")}
                  style={{ fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                >
                  <Globe size={12} />
                  <span>Public Commons</span>
                </button>
                <button
                  type="button"
                  className={`filter-pill ${scopeFilter === "household" ? "active" : ""}`}
                  onClick={() => handleScopeChange("household")}
                  style={{ fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                >
                  <Home size={12} />
                  <span>{activeHousehold ? activeHousehold.name : "Household"}</span>
                </button>
                <button
                  type="button"
                  className={`filter-pill ${scopeFilter === "my" ? "active" : ""}`}
                  onClick={() => handleScopeChange("my")}
                  style={{ fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                >
                  <UserCheck size={12} />
                  <span>My Claims</span>
                </button>
              </div>

              {scopeFilter === "household" && (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setIsHouseholdOpen(true)}
                  style={{ fontSize: "0.72rem", color: "var(--accent-brass)", padding: "0.2rem 0.5rem" }}
                >
                  Circle Settings & Invites
                </button>
              )}
            </div>

            {/* Ledger Filter Section */}
            <div className="ledger-filter-container">
              <div className="ledger-filter-row">
                <div className="filter-pills">
                  <button
                    type="button"
                    className={`filter-pill ${statusFilter === "active" ? "active" : ""}`}
                    onClick={() => setStatusFilter("active")}
                  >
                    Active ({activeCount})
                  </button>

                  <button
                    type="button"
                    className={`filter-pill ${statusFilter === "due" ? "active" : ""}`}
                    onClick={() => setStatusFilter("due")}
                  >
                    Due Soon
                  </button>

                  <button
                    type="button"
                    className={`filter-pill ${statusFilter === "resolved" ? "active" : ""}`}
                    onClick={() => setStatusFilter("resolved")}
                  >
                    Resolved ({resolvedCount})
                  </button>

                  <button
                    type="button"
                    className={`filter-pill ${statusFilter === "all" ? "active" : ""}`}
                    onClick={() => setStatusFilter("all")}
                  >
                    All ({predictions.length})
                  </button>
                </div>

                <div className="search-input-wrapper">
                  <Search size={14} style={{ opacity: 0.6, flexShrink: 0 }} />
                  <input
                    type="text"
                    placeholder="Filter observations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="search-clear-btn"
                      title="Clear search query"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {allTags.length > 0 && (
                <div className="ledger-tags-row">
                  <span className="tags-label">Tags:</span>
                  <div className="tags-scroll-container">
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className={`chip-btn ${selectedTag === tag ? "active" : ""}`}
                        style={{
                          borderColor: selectedTag === tag ? "var(--accent-brass)" : undefined,
                          color: selectedTag === tag ? "var(--accent-brass)" : undefined,
                        }}
                        onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                      >
                        #{tag}
                      </button>
                    ))}
                    {selectedTag && (
                      <button
                        type="button"
                        className="chip-btn clear-tag-btn"
                        onClick={() => setSelectedTag(null)}
                      >
                        Clear tag filter ×
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Predictions Ledger List */}
            <div className="ledger-list">
              {filteredPredictions.length > 0 ? (
                filteredPredictions.map((p) => (
                  <PredictionLedgerItem
                    key={p.id}
                    prediction={p}
                    currentUser={currentUser}
                    onUpdateForecast={handleAddForecast}
                    onResolve={handleResolve}
                    onDelete={handleDelete}
                  />
                ))
              ) : (
                <div style={{ padding: "3rem 1.5rem", textAlign: "center", background: "var(--bg-surface)", border: "1px dashed var(--border-dim)", borderRadius: "var(--radius-md)" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔭</div>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", marginBottom: "0.35rem" }}>
                    {searchQuery || selectedTag ? "No matching observations" : "Ledger is quiet"}
                  </h3>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", maxWidth: "380px", margin: "0 auto 1.25rem" }}>
                    {searchQuery || selectedTag
                      ? "Try adjusting search query or active category filters."
                      : scopeFilter === "household"
                      ? "No private observations recorded for this household circle yet. Log one above!"
                      : "Formulate a concrete prediction above and assign a calibrated probability."}
                  </p>
                  <button
                    type="button"
                    className="btn-subtle"
                    onClick={() => setIsBackupOpen(true)}
                    style={{ margin: "0 auto" }}
                  >
                    <Sparkles size={14} />
                    <span>Load Sample Observations</span>
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Right Column: The Observatory Instrument */}
          <ObservatoryInstrument
            stats={stats}
            currentUser={currentUser}
            users={users}
            onOpenProfileModal={() => setIsProfileOpen(true)}
          />
        </main>
      )}

      {/* Modals */}
      {isHouseholdOpen && (
        <HouseholdManagerModal
          currentUser={currentUser}
          activeHousehold={activeHousehold}
          onSelectHousehold={handleSelectHousehold}
          onClose={() => setIsHouseholdOpen(false)}
        />
      )}

      {isProfileOpen && (
        <ProfileModal
          currentUser={currentUser}
          onLoginSuccess={handleLoginSuccess}
          onLogout={handleLogout}
          onClose={() => setIsProfileOpen(false)}
        />
      )}

      {isBackupOpen && (
        <BackupModal
          onClose={() => setIsBackupOpen(false)}
          onRefreshData={loadInitialData}
        />
      )}

      {/* Mobile Bottom Thumb Navigation */}
      <MobileBottomNav
        activeTab={activeNavTab}
        onTabChange={(tab) => {
          setActiveNavTab(tab);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        currentUser={currentUser}
        onOpenPredict={() => {
          setActiveNavTab("observatory");
          window.scrollTo({ top: 0, behavior: "smooth" });
          setTimeout(() => {
            const input = document.querySelector(".creator-input") as HTMLInputElement | null;
            if (input) input.focus();
          }, 150);
        }}
        onOpenProfile={() => setIsProfileOpen(true)}
      />
    </div>
  );
};
