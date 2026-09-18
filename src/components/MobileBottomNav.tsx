import React from "react";
import { Telescope, Trophy, Target, PlusCircle, User as UserIcon } from "lucide-react";
import { User } from "../types";

interface MobileBottomNavProps {
  activeTab: "observatory" | "leaderboard" | "instrument";
  onTabChange: (tab: "observatory" | "leaderboard" | "instrument") => void;
  currentUser: User | null;
  onOpenPredict: () => void;
  onOpenProfile: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  currentUser,
  onOpenPredict,
  onOpenProfile,
}) => {
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      {/* 1. Ledger View */}
      <button
        type="button"
        className={`mobile-nav-btn ${activeTab === "observatory" ? "active" : ""}`}
        onClick={() => onTabChange("observatory")}
      >
        <Telescope size={20} />
        <span>Ledger</span>
      </button>

      {/* 2. Record & Reliability Instrument */}
      <button
        type="button"
        className={`mobile-nav-btn ${activeTab === "instrument" ? "active" : ""}`}
        onClick={() => onTabChange("instrument")}
      >
        <Target size={20} />
        <span>Record</span>
      </button>

      {/* 3. Center Highlight: New Forecast Trigger */}
      <button
        type="button"
        className="mobile-nav-btn-highlight"
        onClick={onOpenPredict}
        title="Formulate New Prediction"
        aria-label="New Prediction"
      >
        <div className="mobile-nav-highlight-inner">
          <PlusCircle size={24} />
        </div>
        <span>Predict</span>
      </button>

      {/* 4. Leaderboard */}
      <button
        type="button"
        className={`mobile-nav-btn ${activeTab === "leaderboard" ? "active" : ""}`}
        onClick={() => onTabChange("leaderboard")}
      >
        <Trophy size={20} />
        <span>Ranks</span>
      </button>

      {/* 5. Profile / Account */}
      <button
        type="button"
        className="mobile-nav-btn"
        onClick={onOpenProfile}
        aria-label="Account Settings"
      >
        {currentUser?.avatar && currentUser.avatar.startsWith("http") ? (
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="mobile-nav-avatar"
            referrerPolicy="no-referrer"
          />
        ) : currentUser?.avatar ? (
          <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>{currentUser.avatar}</span>
        ) : (
          <UserIcon size={20} />
        )}
        <span>{currentUser ? "Account" : "Sign In"}</span>
      </button>
    </nav>
  );
};
