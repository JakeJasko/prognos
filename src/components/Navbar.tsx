import React, { useState, useEffect } from "react";
import { Telescope, Database, Sun, Moon, Trophy, Home, HelpCircle, ChevronDown } from "lucide-react";
import { Household, User } from "../types";
import { UserAvatar } from "./UserAvatar";

interface NavbarProps {
  currentUser: User | null;
  activeTab: "observatory" | "leaderboard" | "instrument";
  onTabChange: (tab: "observatory" | "leaderboard" | "instrument") => void;
  activeHousehold: Household | null;
  onOpenHouseholdModal: () => void;
  onOpenProfileModal: () => void;
  onOpenBackupModal: () => void;
  onOpenAboutModal: () => void;
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
        <div
          className="brand-emblem"
          role="button"
          tabIndex={0}
          aria-label="Prognos Observatory Home"
          onClick={() => onTabChange("observatory")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onTabChange("observatory");
            }
          }}
          style={{ cursor: "pointer" }}
        >
          <div className="brand-symbol">
            <Telescope size={20} />
          </div>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span className="brand-title">Prognos</span>
            <span className="brand-subtitle desktop-only">Observatory</span>
          </div>
        </div>

        {/* Desktop View Tabs */}
        <nav className="desktop-nav-tabs" aria-label="Main Navigation">
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === "observatory" ? "active" : ""}`}
            onClick={() => onTabChange("observatory")}
            aria-current={activeTab === "observatory" ? "page" : undefined}
          >
            <Telescope size={14} />
            <span>Ledger</span>
          </button>

          <button
            type="button"
            className={`nav-tab-btn ${activeTab === "leaderboard" ? "active" : ""}`}
            onClick={() => onTabChange("leaderboard")}
            aria-current={activeTab === "leaderboard" ? "page" : undefined}
          >
            <Trophy size={14} />
            <span>Leaderboard</span>
          </button>
        </nav>
      </div>

      <div className="header-tools">
        {/* Workspace / Circle Context Switcher */}
        <button
          className={`nav-workspace-chip nav-household-btn ${activeHousehold ? "has-circle" : ""}`}
          onClick={onOpenHouseholdModal}
          title="Manage household & private circles (invite codes, membership)"
          aria-label={`Circle workspace: ${activeHousehold ? activeHousehold.name : "All Circles"}`}
        >
          <div className="workspace-icon-wrap">
            <Home size={14} className="workspace-home-icon" />
          </div>
          <span className="nav-workspace-name nav-household-label">
            {activeHousehold ? activeHousehold.name : "Circles"}
          </span>
          <ChevronDown size={12} className="nav-chevron desktop-only" />
        </button>

        <div className="nav-header-divider desktop-only" aria-hidden="true" />

        {/* Ghost Utility Cluster */}
        <div className="nav-utility-cluster" role="toolbar" aria-label="Observatory Utilities">
          {/* Theme Mode Switcher */}
          <button
            className="nav-ghost-action theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to Field Ledger (Light Mode)" : "Switch to Night Observatory (Dark Mode)"}
            aria-label={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === "dark" ? (
              <Sun size={16} className="theme-toggle-icon" />
            ) : (
              <Moon size={16} className="theme-toggle-icon" />
            )}
          </button>

          {/* About Prognos & Principles */}
          <button
            className="nav-ghost-action nav-about-btn"
            onClick={onOpenAboutModal}
            title="About Prognos & Forecasting Principles"
            aria-label="About Prognos"
          >
            <HelpCircle size={16} />
          </button>

          {/* Archival Storage & Backup (STRICTLY ADMIN ONLY) */}
          {currentUser?.isAdmin && (
            <button
              className="nav-ghost-action desktop-only"
              onClick={onOpenBackupModal}
              title="Archival Storage, Database Exports & Seeding (Administrator Only)"
              aria-label="Database Archival & Seeding"
            >
              <Database size={15} />
            </button>
          )}
        </div>

        <div className="nav-header-divider desktop-only" aria-hidden="true" />

        {/* User Account / Google Sign-In Pill */}
        {currentUser ? (
          <button
            className="nav-profile-chip observer-pill"
            onClick={onOpenProfileModal}
            title={`Observer: ${currentUser.name}${currentUser.isAdmin ? " (Administrator)" : ""}`}
            aria-label={`Account profile for ${currentUser.name}`}
          >
            <div className="nav-profile-avatar-wrap">
              <UserAvatar avatar={currentUser.avatar} name={currentUser.name} size={22} fontSize="1.05rem" />
            </div>
            <span className="observer-name">
              {currentUser.name}
            </span>
            {currentUser.isAdmin && (
              <span className="nav-admin-badge desktop-only">
                ADMIN
              </span>
            )}
            <ChevronDown size={12} className="nav-chevron desktop-only" />
          </button>
        ) : (
          <button
            className="btn-brass nav-signin-btn"
            onClick={onOpenProfileModal}
            title="Sign In with Google"
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
      </div>
    </header>
  );
};

