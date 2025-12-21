// Import necessary components
import { useEffect, useState } from "react";
import AuthModal from "./AuthModal";
import { Client, Account } from "appwrite";
import "./SideNav.css";
import { getTranslationObject } from "./locales/index.js";

// Initialize Appwrite
const client = new Client();
client.setEndpoint("https://cloud.appwrite.io/v1").setProject("reskin");
const account = new Account(client);

export default function ({ onNavigate, user, setUser }) {
  // Translation object
  const language = localStorage.getItem("reskin_language") || "en";
  const t = getTranslationObject(language);

  // Define side navigation component states
  const [open, setOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  // Set the current user to the userObj variable
  const handleAuth = (userObj) => {
    setUser(userObj);
  };

  const handleLogout = async () => {
    try {
      // Attempt to delete current session when logout button is pressed, return error on failure
      await account.deleteSession('current');
    } catch (err) {
      console.error(t.sidenav.label["label.log_out"] + " failed:", err);
    }
    setUser(null);
  };

  // Define available navigation buttons
  const navs = [
    { label: t.sidenav.label["label.home"], icon: "🏠", nav: "home" },
    { label: t.sidenav.label["label.marketplace"], icon: "🛒", nav: "marketplace" },
    { label: t.sidenav.label["label.theme_bundler"], icon: "📦", nav: "bundler" },
    { label: t.sidenav.label["label.theme_installer"], icon: "🎨", nav: "installer" },
    { label: t.sidenav.label["label.configurationfiles"], icon: "🔧", nav: "configurationfiles" },
    { label: t.sidenav.label["label.settings"], icon: "⚙️", nav: "settings" },
  ];

  // Return HTML content
  return (
    <>
      {!open && (
        <button
          className="hamburger-btn"
          onClick={() => setOpen(true)}
          aria-label={t.sidenav.label["label.home"]}
          style={{
            position: "absolute",
            top: "4.5rem",
            left: "1.5rem",
            zIndex: 2001,
            width: "48px",
            height: "48px",
            border: "none",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "none",
            cursor: "pointer"
          }}
        >
          <span style={{ fontSize: "28px", color: "var(--color-text)" }}>☰</span>
        </button>
      )}

      {open && (
        <div
          className="sidenav-overlay"
          style={{
            position: "fixed",
            top: "3rem",
            left: "0",
            width: 340,
            height: `calc(100vh - 3rem)`,
            zIndex: 2000,
            display: "flex",
            flexDirection: "column",
            padding: 0
          }}
        >
          {/* X button at top right of overlay */}
          <button
            aria-label={t.sidenav.label["label.log_out"]}
            onClick={() => setOpen(false)}
            style={{
              position: 'absolute',
              top: 24,
              right: 24,
              width: 48,
              height: 48,
              background: 'var(--color-bg)',
              border: 'none',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2100,
              cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: 28, color: 'var(--color-text)' }}>✖</span>
          </button>

          {/* Login section at top */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '32px 24px 18px 24px',
            borderBottom: '1px solid #333',
            background: 'var(--color-panel)'
          }}>
            {user ? (
              <></>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                style={{
                  width: '100%',
                  padding: '14px 0',
                  fontSize: '1.1em',
                  fontWeight: 600,
                  color: '#fff',
                  background: '#2a7cff',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px #0002'
                }}
              >
                {t.sidenav.label["label.log_in"]}
              </button>
            )}
          </div>

          <AuthModal open={showAuth} onClose={() => setShowAuth(false)} onAuth={handleAuth} />

          <nav style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 32 }}>
            {navs.map((btn, idx) => (
              <button
                key={btn.nav}
                className="sidenav-menu-btn"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  fontSize: "1.2rem",
                  fontWeight: 500,
                  background: idx === 0 ? "var(--color-active-bg)" : "var(--color-tag-bg)",
                  color: idx === 0 ? "var(--color-bg)" : "var(--color-text)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 24,
                  padding: "12px 32px",
                  margin: "0 24px",
                  cursor: "pointer",
                  boxShadow: idx === 0 ? "0 2px 8px rgba(0,0,0,0.08)" : "none"
                }}
                onClick={() => {
                  setOpen(false);
                  onNavigate && onNavigate(btn.nav);
                }}
              >
                <span style={{ fontSize: 22 }}>{btn.icon}</span>
                {btn.label}
              </button>
            ))}
          </nav>

          {/* Log out button at bottom if logged in */}
          {user && (
            <button
              onClick={handleLogout}
              style={{
                position: 'absolute',
                left: 24,
                bottom: 32,
                width: 'calc(100% - 48px)',
                padding: '14px 0',
                fontSize: '1.08em',
                fontWeight: 600,
                color: '#fff',
                background: '#e23c3c',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                boxShadow: '0 2px 8px #0002'
              }}
            >
              {t.sidenav.label["label.log_out"]}
            </button>
          )}
        </div>
      )}
    </>
  );
}
