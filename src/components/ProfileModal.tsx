import React, { useEffect, useState } from "react";
import { X, LogOut, ShieldCheck, Sparkles, AlertCircle, Shield, Database } from "lucide-react";
import { User } from "../types";
import { fetchGoogleConfig, verifyGoogleCredential } from "../api";

interface ProfileModalProps {
  currentUser: User | null;
  onLoginSuccess: (user: User) => void;
  onLogout: () => void;
  onClose: () => void;
  onOpenBackupModal?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  currentUser,
  onLoginSuccess,
  onLogout,
  onClose,
  onOpenBackupModal,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const initGoogleGsi = (clientId: string) => {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if ((window as any).google?.accounts?.id) {
        clearInterval(interval);
        try {
          (window as any).google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response: any) => {
              try {
                setLoading(true);
                setError("");
                const res = await verifyGoogleCredential(response.credential);
                onLoginSuccess(res.user);
                onClose();
              } catch (err: any) {
                setError(err.message || "Google sign-in verification failed");
              } finally {
                setLoading(false);
              }
            },
            auto_select: false,
          });

          const btnContainer = document.getElementById("google-signin-btn-container");
          if (btnContainer) {
            btnContainer.innerHTML = "";
            (window as any).google.accounts.id.renderButton(btnContainer, {
              type: "standard",
              theme: "filled_black",
              size: "large",
              text: "signin_with",
              shape: "rectangular",
              logo_alignment: "left",
              width: 280,
            });
          }
        } catch (e: any) {
          console.error("GSI initialize error:", e);
        }
      } else if (attempts > 30) {
        clearInterval(interval);
      }
    }, 200);
  };

  useEffect(() => {
    fetchGoogleConfig()
      .then((cfg) => {
        if (cfg.hasGoogleAuth && cfg.clientId) {
          initGoogleGsi(cfg.clientId);
        }
      })
      .catch((err) => {
        console.error("Failed to load Google auth config:", err);
      });
  }, []);

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
        aria-labelledby="profile-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "440px" }}
      >
        {/* Modal Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            <h2 id="profile-modal-title" style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 500, margin: 0 }}>
              {currentUser ? "Google Account" : "Google Sign-In"}
            </h2>
          </div>
          <button className="btn-ghost" onClick={onClose} title="Close dialog" aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.65rem 0.85rem",
            background: "var(--mark-no-bg)",
            border: "1px solid var(--mark-no)",
            borderRadius: "var(--radius-xs)",
            color: "var(--mark-no)",
            marginBottom: "1.25rem",
            fontSize: "0.82rem"
          }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* LOGGED IN VIEW */}
        {currentUser ? (
          <div>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              padding: "1.25rem",
              background: "var(--bg-input)",
              border: "1px solid var(--border-brass)",
              borderRadius: "var(--radius-sm)",
              marginBottom: "1.5rem"
            }}>
              <div style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "rgba(245, 208, 97, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.75rem",
                overflow: "hidden",
                border: "2px solid var(--accent-brass)",
                flexShrink: 0
              }}>
                {currentUser.avatar && currentUser.avatar.startsWith("http") ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span>{currentUser.avatar || "🔭"}</span>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.15rem" }}>
                  <span style={{ fontWeight: 600, fontSize: "1.05rem", color: "var(--text-primary)" }}>
                    {currentUser.name}
                  </span>
                  <span
                    title="Authenticated Google Account"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      color: "var(--mark-yes)",
                      fontSize: "0.75rem",
                      fontWeight: 600
                    }}
                  >
                    <ShieldCheck size={16} />
                  </span>
                  {currentUser.isAdmin && (
                    <span
                      style={{
                        fontSize: "0.65rem",
                        padding: "0.1rem 0.4rem",
                        borderRadius: "4px",
                        background: "rgba(245, 208, 97, 0.2)",
                        color: "var(--accent-brass)",
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                      }}
                    >
                      ADMIN
                    </span>
                  )}
                </div>

                <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {currentUser.email || "Google Account"}
                </div>

                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                  User ID: {currentUser.id}
                </div>
              </div>
            </div>

            {currentUser.isAdmin && (
              <div
                style={{
                  marginBottom: "1.25rem",
                  padding: "0.85rem 1rem",
                  background: "rgba(245, 208, 97, 0.06)",
                  border: "1px solid var(--border-brass)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--accent-brass)",
                    marginBottom: "0.6rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <Database size={14} style={{ color: "var(--accent-brass)" }} />
                  Archival Storage & Backups
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {onOpenBackupModal && (
                    <button
                      type="button"
                      className="btn-brass"
                      onClick={() => {
                        onClose();
                        onOpenBackupModal();
                      }}
                      style={{
                        padding: "0.45rem 0.95rem",
                        fontSize: "0.82rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.45rem",
                        cursor: "pointer",
                      }}
                    >
                      <Database size={14} />
                      <span>Archival & Backups</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  color: "var(--mark-no)",
                  borderColor: "rgba(251, 113, 133, 0.3)",
                  background: "rgba(251, 113, 133, 0.06)",
                  padding: "0.45rem 1.25rem",
                  fontSize: "0.85rem",
                  fontWeight: 600
                }}
              >
                <LogOut size={15} />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        ) : (
          /* LOGGED OUT VIEW */
          <div>
            <div style={{ textAlign: "center", padding: "1.25rem 0.5rem 1.5rem" }}>
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "rgba(245, 208, 97, 0.1)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1rem",
                border: "1px solid var(--border-brass)"
              }}>
                <Sparkles size={22} style={{ color: "var(--accent-brass)" }} />
              </div>

              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                Authentication Required
              </h3>

              <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.5, maxWidth: "340px", margin: "0 auto 1.5rem" }}>
                Sign in with your Google account to record predictions, create private household circles, and compete on the leaderboard.
              </p>

              {/* Official Google Sign-In Container */}
              <div style={{ display: "flex", justifyContent: "center", minHeight: "44px", marginBottom: "0.5rem" }}>
                <div id="google-signin-btn-container" />
              </div>

              {loading && (
                <div style={{ fontSize: "0.82rem", color: "var(--accent-brass)", marginTop: "0.5rem" }}>
                  Authenticating with Google...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
