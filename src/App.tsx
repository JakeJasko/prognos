import React, { useEffect, useState, useMemo } from "react";
import { Search, Telescope, Sparkles, Globe, Home, UserCheck, Trophy, Tag, Settings, X } from "lucide-react";
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
import { AboutModal } from "./components/AboutModal";
import { AdminModal } from "./components/AdminModal";
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
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isMobilePredictOpen, setIsMobilePredictOpen] = useState(false);
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
    const seenAbout = localStorage.getItem("prognos_seen_about");
    if (!seenAbout) {
      setIsAboutOpen(true);
    }
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
    setIsMobilePredictOpen(false);
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
  const filteredPredictions = useMemo(() => {
    return predictions.filter((p) => {
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
  }, [predictions, statusFilter, selectedTag, searchQuery]);

  const activeCount = predictions.filter((p) => !p.resolved).length;
  const resolvedCount = predictions.filter((p) => p.resolved).length;

  return (
    <div className="app-shell">
      <h1 className="sr-only">Prognos Observatory — Personal & Household Forecasting Ledger</h1>
      {/* Observatory Header */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeNavTab}
        onTabChange={setActiveNavTab}
        activeHousehold={activeHousehold}
        onOpenHouseholdModal={() => setIsHouseholdOpen(true)}
        onOpenProfileModal={() => setIsProfileOpen(true)}
        onOpenBackupModal={() => setIsBackupOpen(true)}
        onOpenAboutModal={() => setIsAboutOpen(true)}
        onOpenAdminModal={() => setIsAdminOpen(true)}
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
            onOpenProfileModal={() => setIsProfileOpen(true)}
          />
        </main>
      ) : (
        <main className="observatory-layout">
          {/* Left Column: The Astronomer's Ledger */}
          <section className="ledger-column">
            {/* In-Situ Fast Prediction Creator */}
            <div className={`prediction-creator-wrapper ${isMobilePredictOpen ? "mobile-open" : "mobile-hidden"}`}>
              <InlinePredictionCreator
                currentUser={currentUser}
                households={households}
                activeHousehold={activeHousehold}
                onOpenHouseholdModal={() => setIsHouseholdOpen(true)}
                onOpenAuthModal={() => setIsProfileOpen(true)}
                onSubmit={handleCreatePrediction}
                onClose={() => setIsMobilePredictOpen(false)}
              />
            </div>

            {/* Unified Filter Bar */}
            <div className="unified-filter-bar">
              {/* Scope Selector */}
              <div className="filter-group filter-scope-group">
                <button
                  type="button"
                  className={`unified-pill ${scopeFilter === "all" ? "active" : ""}`}
                  onClick={() => handleScopeChange("all")}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`unified-pill ${scopeFilter === "public" ? "active" : ""}`}
                  onClick={() => handleScopeChange("public")}
                  title="Public Commons"
                >
                  <Globe size={12} />
                  <span>Public</span>
                </button>
                <button
                  type="button"
                  className={`unified-pill ${scopeFilter === "household" ? "active" : ""}`}
                  onClick={() => handleScopeChange("household")}
                  title={activeHousehold ? `Circle: ${activeHousehold.name}` : "Circles"}
                >
                  <Home size={12} />
                  <span>{activeHousehold ? activeHousehold.name : "Circles"}</span>
                </button>
                {scopeFilter === "household" && (
                  <button
                    type="button"
                    className="toolbar-icon-btn"
                    onClick={() => setIsHouseholdOpen(true)}
                    title="Circle settings & invites"
                  >
                    <Settings size={12} />
                  </button>
                )}
                <button
                  type="button"
                  className={`unified-pill ${scopeFilter === "my" ? "active" : ""}`}
                  onClick={() => handleScopeChange("my")}
                  title="My Claims"
                >
                  <UserCheck size={12} />
                  <span>Mine</span>
                </button>
              </div>

              <div className="filter-divider" />

              {/* Status Selector */}
              <div className="filter-group filter-status-group">
                <button
                  type="button"
                  className={`unified-pill ${statusFilter === "active" ? "active" : ""}`}
                  onClick={() => setStatusFilter("active")}
                >
                  Active <span className="pill-count">{activeCount}</span>
                </button>
                <button
                  type="button"
                  className={`unified-pill ${statusFilter === "due" ? "active" : ""}`}
                  onClick={() => setStatusFilter("due")}
                  title="Resolving within 7 days"
                >
                  Due Soon
                </button>
                <button
                  type="button"
                  className={`unified-pill ${statusFilter === "resolved" ? "active" : ""}`}
                  onClick={() => setStatusFilter("resolved")}
                >
                  Resolved <span className="pill-count">{resolvedCount}</span>
                </button>
                <button
                  type="button"
                  className={`unified-pill ${statusFilter === "all" ? "active" : ""}`}
                  onClick={() => setStatusFilter("all")}
                >
                  All <span className="pill-count">{predictions.length}</span>
                </button>
              </div>

              <div className="filter-spacer" />

              {/* Search & Tags */}
              <div className="filter-group filter-search-group">
                {allTags.length > 0 && (
                  <div className="unified-tag-wrapper">
                    <Tag size={12} style={{ color: selectedTag ? "var(--accent-brass)" : "var(--text-muted)", flexShrink: 0 }} />
                    <select
                      className="unified-tag-select"
                      value={selectedTag || ""}
                      onChange={(e) => setSelectedTag(e.target.value || null)}
                      aria-label="Filter by tag"
                    >
                      <option value="">All Tags</option>
                      {allTags.map((t) => (
                        <option key={t} value={t}>#{t}</option>
                      ))}
                    </select>
                    {selectedTag && (
                      <button
                        type="button"
                        className="search-clear-btn"
                        onClick={() => setSelectedTag(null)}
                        title="Clear tag filter"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                )}

                <div className="unified-search-wrapper">
                  <Search size={13} style={{ opacity: 0.6, flexShrink: 0 }} />
                  <input
                    type="text"
                    placeholder="Filter claims..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Filter claims by keyword"
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
            onOpenProfileModal={() => setIsProfileOpen(true)}
          />
        </main>
      )}

      {/* Modals */}
      {isAboutOpen && (
        <AboutModal
          onClose={() => setIsAboutOpen(false)}
        />
      )}

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
          onOpenAdminModal={() => {
            setIsProfileOpen(false);
            setIsAdminOpen(true);
          }}
          onOpenBackupModal={() => {
            setIsProfileOpen(false);
            setIsBackupOpen(true);
          }}
        />
      )}

      {isBackupOpen && (
        <BackupModal
          currentUser={currentUser}
          onClose={() => setIsBackupOpen(false)}
          onRefreshData={loadInitialData}
        />
      )}

      {isAdminOpen && currentUser && (
        <AdminModal
          currentUser={currentUser}
          onClose={() => setIsAdminOpen(false)}
          onRefreshData={loadInitialData}
        />
      )}

      {/* Mobile Bottom Thumb Navigation */}
      <MobileBottomNav
        activeTab={activeNavTab}
        onTabChange={(tab) => {
          if (tab === "observatory" && activeNavTab === "observatory" && isMobilePredictOpen) {
            setIsMobilePredictOpen(false);
          }
          setActiveNavTab(tab);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        currentUser={currentUser}
        isPredictOpen={isMobilePredictOpen}
        onOpenPredict={() => {
          if (activeNavTab !== "observatory") {
            setActiveNavTab("observatory");
            setIsMobilePredictOpen(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
            setTimeout(() => {
              const input = document.querySelector(".creator-input") as HTMLInputElement | null;
              if (input) input.focus();
            }, 150);
            return;
          }

          setIsMobilePredictOpen((prev) => {
            const next = !prev;
            if (next) {
              window.scrollTo({ top: 0, behavior: "smooth" });
              setTimeout(() => {
                const input = document.querySelector(".creator-input") as HTMLInputElement | null;
                if (input) input.focus();
              }, 150);
            }
            return next;
          });
        }}
        onOpenProfile={() => setIsProfileOpen(true)}
      />
    </div>
  );
};
