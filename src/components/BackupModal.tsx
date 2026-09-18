import React, { useState, useEffect } from "react";
import { X, Download, Upload, Sparkles, Database, CheckCircle2, Shield } from "lucide-react";
import { importBackup, seedDemoData } from "../api";
import { User } from "../types";

interface BackupModalProps {
  currentUser?: User | null;
  onClose: () => void;
  onRefreshData: () => Promise<void>;
}

export const BackupModal: React.FC<BackupModalProps> = ({ currentUser, onClose, onRefreshData }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleExport = () => {
    window.location.href = `/api/export?userId=${encodeURIComponent(currentUser?.id || "")}`;
    setMessage("Export downloaded successfully!");
    setTimeout(() => setMessage(""), 3000);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      await importBackup(jsonData, currentUser?.id);
      await onRefreshData();
      setMessage("Archive restored successfully!");
      setTimeout(() => {
        setMessage("");
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to parse and import backup archive");
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDemo = async () => {
    if (!confirm("Populate database with calibrated sample predictions?")) return;
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await seedDemoData(currentUser?.id);
      await onRefreshData();
      setMessage("Sample predictions and calibration record loaded!");
      setTimeout(() => {
        setMessage("");
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to load sample data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="backup-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Database size={18} style={{ color: "var(--accent-brass)" }} />
            <h2 id="backup-modal-title" style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 600 }}>
              Archival Storage & Backup
            </h2>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.2rem",
                fontSize: "0.62rem",
                fontWeight: 700,
                color: "var(--accent-brass)",
                background: "rgba(245, 208, 97, 0.12)",
                padding: "0.15rem 0.4rem",
                borderRadius: "4px",
                letterSpacing: "0.04em",
                textTransform: "uppercase"
              }}
            >
              <Shield size={10} /> Admin Only
            </span>
          </div>
          <button className="btn-ghost" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "1.25rem", lineHeight: 1.4 }}>
          All observations are stored locally in <code>data/predictions.db</code> with zero cloud telemetry.
        </p>

        {message && (
          <div style={{ padding: "0.5rem 0.75rem", background: "var(--mark-yes-bg)", border: "1px solid var(--mark-yes)", borderRadius: "var(--radius-xs)", color: "var(--mark-yes)", marginBottom: "1rem", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <CheckCircle2 size={15} /> {message}
          </div>
        )}

        {error && (
          <div style={{ padding: "0.5rem 0.75rem", background: "var(--mark-no-bg)", border: "1px solid var(--mark-no)", borderRadius: "var(--radius-xs)", color: "var(--mark-no)", marginBottom: "1rem", fontSize: "0.8rem" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {/* Export */}
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

          {/* Import */}
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

          {/* Seed Demo Data */}
          <div style={{ padding: "0.85rem", background: "rgba(245, 208, 97, 0.04)", borderRadius: "var(--radius-xs)", border: "1px solid var(--border-brass)" }}>
            <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--accent-brass)", marginBottom: "0.2rem" }}>
              Sample Observations & Track Record
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "0.65rem" }}>
              Populate realistic predictions across tech, space, and personal habits with pre-resolved outcomes.
            </p>
            <button className="btn-brass" onClick={handleSeedDemo} disabled={loading} style={{ padding: "0.35rem 0.75rem", fontSize: "0.78rem" }}>
              <Sparkles size={13} />
              <span>{loading ? "Loading..." : "Load Sample Observations"}</span>
            </button>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.25rem" }}>
          <button className="btn-ghost" onClick={onClose} style={{ fontSize: "0.82rem" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
