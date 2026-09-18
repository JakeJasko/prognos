import React, { useState, useEffect } from "react";
import { Telescope, Database, Sun, Moon, Trophy, Home, HelpCircle, Shield } from "lucide-react";
import { Household, User } from "../types";

interface NavbarProps {
  currentUser: User | null;
  activeTab: "observatory" | "leaderboard" | "instrument";
  onTabChange: (tab: "observatory" | "leaderboard" | "instrument") => void;
  activeHousehold: Household | null;
  onOpenHouseholdModal: () => void;
  onOpenProfileModal: () => void;
  onOpenBackupModal: () => void;
  onOpenAboutModal: () => void;
  onOpenAdminModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  onTabChange,
  activeHousehold,
  onOpenHouseholdModal,
  onOpenProfileModal,
  onOpenBackupModal,
  onOpenAboutModal,
  onOpenAdminModal,
}) => {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = (localStorage.getItem("prognos_theme") || localStorage.getItem("fatebook_theme")) as "dark" | "light" | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("prognos_theme", next);
  };

  return (
    <header className="observatory-header">
      <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
        {/* Brand Emblem */}
        <div className="brand-emblem" onClick={() => onTabChange("observatory")} style={{ cursor: "pointer" }}>
          <div className="brand-symbol">
            <Telescope size={20} />
          </div>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span className="brand-title">Prognos</span>
            <span className="brand-subtitle desktop-only">Observatory</span>
          </div>
        </div>

        {/* Desktop View Tabs */}
        <nav className="desktop-nav-tabs" style={{ alignItems: "center", gap: "0.25rem" }}>
          <button
            type="button"
            className={`filter-pill ${activeTab === "observatory" ? "active" : ""}`}
            onClick={() => onTabChange("observatory")}
            style={{ fontSize: "0.82rem", padding: "0.35rem 0.85rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
          >
            <Telescope size={14} />
            <span>Ledger</span>
          </button>

          <button
            type="button"
            className={`filter-pill ${activeTab === "leaderboard" ? "active" : ""}`}
            onClick={() => onTabChange("leaderboard")}
            style={{ fontSize: "0.82rem", padding: "0.35rem 0.85rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
          >
            <Trophy size={14} />
            <span>Leaderboard</span>
          </button>
        </nav>
      </div>

      <div className="header-tools">
        {/* About Prognos & Principles */}
        <button
          className="btn-subtle nav-about-btn"
          onClick={onOpenAboutModal}
          title="About Prognos & Forecasting Principles"
          style={{ padding: "0.45rem 0.65rem", display: "flex", alignItems: "center", gap: "0.35rem" }}
        >
          <HelpCircle size={15} style={{ color: "var(--accent-brass)" }} />
          <span className="desktop-only" style={{ fontSize: "0.75rem", fontWeight: 600 }}>About</span>
        </button>

        {/* Household Circle Switcher Button */}
        <button
          className="btn-subtle nav-household-btn"
          onClick={onOpenHouseholdModal}
          title="Manage household & private circles (invite codes, membership)"
          style={{
            padding: "0.4rem 0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            background: activeHousehold ? "rgba(245, 208, 97, 0.08)" : undefined,
            borderColor: activeHousehold ? "var(--border-brass)" : undefined
          }}
        >
          <Home size={14} style={{ color: "var(--accent-brass)" }} />
          <span className="nav-household-label" style={{ fontSize: "0.78rem", fontWeight: 600 }}>
            {activeHousehold ? activeHousehold.name : "Circles"}
          </span>
        </button>

        {/* Admin Console Trigger (Only visible to Administrators) */}
        {currentUser?.isAdmin && onOpenAdminModal && (
          <button
            className="btn-subtle nav-admin-btn"
            onClick={onOpenAdminModal}
            title="Observatory Administration Console (Manage Users, Circles, Forecasts)"
            style={{
              padding: "0.4rem 0.65rem",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              background: "rgba(245, 208, 97, 0.12)",
              borderColor: "var(--border-brass)",
            }}
          >
            <Shield size={14} style={{ color: "var(--accent-brass)" }} />
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--accent-brass)", letterSpacing: "0.04em" }}>
              ADMIN
            </span>
          </button>
        )}

        {/* Theme Mode Switcher */}
        <button
          className="btn-subtle theme-toggle-btn"
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to Field Ledger (Light Mode)" : "Switch to Night Observatory (Dark Mode)"}
          style={{ padding: "0.45rem 0.65rem", display: "flex", alignItems: "center", gap: "0.35rem" }}
        >
          {theme === "dark" ? <Sun size={15} style={{ color: "var(--accent-brass)" }} /> : <Moon size={15} style={{ color: "var(--accent-brass)" }} />}
          <span className="desktop-only" style={{ fontSize: "0.75rem", fontWeight: 600 }}>{theme === "dark" ? "Light" : "Dark"}</span>
        </button>

        {/* User Account / Google Sign-In Pill */}
        {currentUser ? (
          <button
            className="observer-pill"
            onClick={onOpenProfileModal}
            title={`Account: ${currentUser.name}${currentUser.isAdmin ? " (Administrator)" : ""}`}
            style={{
              borderColor: currentUser.isAdmin ? "var(--border-brass)" : undefined
            }}
          >
            {currentUser.avatar && currentUser.avatar.startsWith("http") ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                style={{ width: "20px", height: "20px", borderRadius: "50%", objectFit: "cover" }}
                referrerPolicy="no-referrer"
              />
            ) : (
              <span style={{ fontSize: "1.05rem" }}>{currentUser.avatar || "🔭"}</span>
            )}
            <span style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {currentUser.name}
            </span>
            {currentUser.isAdmin && (
              <span 
                style={{ 
                  fontSize: "0.62rem", 
                  padding: "0.1rem 0.35rem", 
                  borderRadius: "4px", 
                  background: "rgba(245, 208, 97, 0.2)", 
                  color: "var(--accent-brass)", 
                  fontWeight: 700,
                  marginLeft: "0.15rem"
                }}
              >
                ADMIN
              </span>
            )}
          </button>
        ) : (
          <button
            className="btn-brass"
            onClick={onOpenProfileModal}
            title="Sign In with Google"
            style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "0.45rem" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            <span>Sign In</span>
          </button>
        )}

        {/* Archival Storage & Backup (STRICTLY ADMIN ONLY) */}
        {currentUser?.isAdmin && (
          <button
            className="btn-subtle"
            onClick={onOpenBackupModal}
            title="Archival Storage, Database Exports & Seeding (Administrator Only)"
            style={{ padding: "0.45rem 0.65rem", display: "flex", alignItems: "center" }}
          >
            <Database size={15} style={{ color: "var(--accent-brass)" }} />
          </button>
        )}
      </div>
    </header>
  );
};
