import React from "react";
import { Telescope, X, Check, Compass, Award, Target } from "lucide-react";

interface AboutModalProps {
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ onClose }) => {
  const handleDismiss = () => {
    localStorage.setItem("prognos_seen_about", "true");
    onClose();
  };

  return (
    <div className="dialog-overlay" onClick={handleDismiss}>
      <div 
        className="dialog-box" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "560px", padding: "1.75rem" }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div 
              style={{ 
                background: "rgba(245, 208, 97, 0.12)", 
                border: "1px solid var(--border-brass)",
                borderRadius: "var(--radius-xs)",
                padding: "0.35rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent-brass)"
              }}
            >
              <Telescope size={18} />
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", fontWeight: 600, letterSpacing: "-0.01em" }}>
              About Prognos
            </h2>
          </div>
          <button className="btn-ghost" onClick={handleDismiss} title="Close dialog">
            <X size={18} />
          </button>
        </div>

        {/* Etymology Card */}
        <div 
          style={{ 
            background: "var(--bg-input)", 
            border: "1px solid var(--border-dim)", 
            borderRadius: "var(--radius-xs)", 
            padding: "1.1rem 1.25rem",
            marginBottom: "1.25rem"
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.4rem" }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700, color: "var(--accent-brass)", letterSpacing: "0.02em" }}>
              prog·nos
            </span>
            <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontStyle: "italic" }}>
              /ˈprɒɡ.nɒs/
            </span>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "0.5rem" }}>
            Ancient Greek <b>πρόγνωσις</b> (<em>prógnōsis</em>), from <b>πρό</b> (<em>pro-</em>, "before") + <b>γνῶσις</b> (<em>gnôsis</em>, "knowledge, to know").
          </p>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.5, borderTop: "1px dashed var(--border-dim)", paddingTop: "0.5rem", margin: 0 }}>
            <em>noun</em> — Foreknowledge; knowing beforehand; a calculated forecast of future events based on empirical observation and calibrated probability.
          </p>
        </div>

        {/* Principle & Habit */}
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1.25rem" }}>
          <img
            src="/telescope_future_1200_white.png"
            alt="Astronomer looking through celestial telescope"
            style={{ 
              width: "80px", 
              height: "80px", 
              objectFit: "contain", 
              borderRadius: "var(--radius-xs)",
              background: "rgba(245, 208, 97, 0.04)",
              border: "1px solid var(--border-dim)",
              padding: "0.25rem",
              flexShrink: 0
            }}
          />
          <div>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
              The Habit of Forecasting
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.45, margin: 0 }}>
              Think in probabilities. "Probably" is ambiguous; "80%" is precise. Build a feedback loop by testing your conviction against reality.
            </p>
          </div>
        </div>

        {/* 3 Core Disciplines */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem", fontSize: "0.8rem" }}>
            <div style={{ color: "var(--accent-brass)", marginTop: "2px", flexShrink: 0 }}>
              <Compass size={14} />
            </div>
            <div>
              <strong style={{ color: "var(--text-primary)" }}>1. Frame Claim:</strong> State clear, verifiable criteria with an exact resolution deadline.
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem", fontSize: "0.8rem" }}>
            <div style={{ color: "var(--accent-brass)", marginTop: "2px", flexShrink: 0 }}>
              <Target size={14} />
            </div>
            <div>
              <strong style={{ color: "var(--text-primary)" }}>2. Calibrate Odds:</strong> Assign an honest percentage (0–100%) to measure uncertainty, not wishful thinking.
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem", fontSize: "0.8rem" }}>
            <div style={{ color: "var(--accent-brass)", marginTop: "2px", flexShrink: 0 }}>
              <Award size={14} />
            </div>
            <div>
              <strong style={{ color: "var(--text-primary)" }}>3. Seal & Learn:</strong> Track your Brier score and calibration curve over time to sharpen judgment.
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          className="btn-brass"
          onClick={handleDismiss}
          style={{ width: "100%", padding: "0.65rem 1rem", fontSize: "0.88rem", justifyContent: "center" }}
        >
          <Check size={16} />
          <span>Enter Observatory</span>
        </button>
      </div>
    </div>
  );
};
