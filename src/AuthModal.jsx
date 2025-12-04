// Import necessary components
import React, { useState } from "react";
import { ID,  Client, Account } from "appwrite";
console.log('Appwrite imports:', { Client, Account });
import "./AuthModal.css";
import { getTranslationObject } from "./locales/index.js";

// Define server credientials
const client = new Client();
client
  .setEndpoint("https://cloud.appwrite.io/v1")
  .setProject("reskin");

let account;
// Attempt to initialize Appwrite
try {
  account = new Account(client);
  console.log('Appwrite initialized:', { client, account });
} catch (e) {
  console.error('Error initializing Appwrite:', e);
}

export default function AuthModal({ open, onClose, onAuth }) {
  const language = localStorage.getItem("reskin_language") || "en"; // Get selected language or fallback to English
  const t = getTranslationObject(language); // Translation object
  const [mode, setMode] = useState("login"); // The auth modal mode ("login" by defaults)
  const [username, setUsername] = useState(""); // Entered username
  const [email, setEmail] = useState(""); // Entered email
  const [password, setPassword] = useState(""); // Entered password
  const [error, setError] = useState(""); // Error message
  const [loading, setLoading] = useState(false); // Loading state
  const [showRecovery, setShowRecovery] = useState(false); // Recovery screen state
  const [recoveryEmail, setRecoveryEmail] = useState(""); // Entered recovery email
  const [recoveryMsg, setRecoveryMsg] = useState(""); // Recovery message

  React.useEffect(() => {
    (async () => {
      try {
        const user = await account.get(); // Get currently logged in user
        if (user) {
          onAuth && onAuth(user);
        }
      } catch (err) {}
    })();
  }, []);

  const handleLogin = async (e) => { // Handle login
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (!email.includes('@')) {
        throw new Error(t.authmodal.status["status.email_required"]); // If email is invalid (does not contain @ symbol), throw an error
      }
      await account.createEmailPasswordSession(email, password); // Create a session using the Appwrite SDK
      const fullUser = await account.get(); 
      const userData = {
        id: fullUser.$id,
        email: fullUser.email,
        username: fullUser.name || fullUser.username || (fullUser.prefs && fullUser.prefs.username) || fullUser.email.split('@')[0],
        prefs: fullUser.prefs || {},
      };
      onAuth(userData);
      localStorage.setItem('reskin_user', JSON.stringify(userData)); // Store currently logged in user in localStorage
      onClose();
    } catch (err) {
      console.error(err);
      console.error(err.stack)
      setError(err.message || t.authmodal.status["status.login_failed"]); // Throw error on failure
    }
    setLoading(false);
  };

  const handleSignup = async (e) => { // Handle signup
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await account.create(ID.unique(), email, password, username); // Create a new user account with entered information
      await account.createEmailPasswordSession(email, password); // Create session with the newly created user
      const fullUser = await account.get();
      const userData = {
        id: fullUser.$id,
        email: fullUser.email,
        username: fullUser.name || fullUser.username || (fullUser.prefs && fullUser.prefs.username) || fullUser.email.split('@')[0],
        prefs: fullUser.prefs || {},
      };
      onAuth(userData);
      localStorage.setItem('reskin_user', JSON.stringify(userData)); // Store currently logged in user in localStorage
      onClose();
    } catch (err) {
      setError(err.message || t.authmodal.status["status.signup_failed"]); // Throw error on failure
    }
    setLoading(false);
  };

  const handleRecovery = async (e) => { // Handle recovery
    e.preventDefault();
    setRecoveryMsg("");
    setLoading(true);
    try {
      await account.createRecovery(recoveryEmail, window.location.origin + "/set-new-password"); // Create recovery email using Appwrite SDK
      setRecoveryMsg(t.setnewpassword.status["status.recovery_sent"]); // Return success
    } catch (err) {
      setRecoveryMsg(err.message || t.setnewpassword.status["status.recovery_send_failure"]); // Throw error
    }
    setLoading(false);
  };

  if (!open) return null;

  // Return HTML content
  return (
    <div className="auth-modal-overlay" style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      background: "rgba(0,0,0,0.5)",
      zIndex: 3000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <div className="auth-modal-content" style={{
        background: "var(--color-bg-dark)",
        color: "var(--color-text-dark)",
        borderRadius: 16,
        padding: 32,
        minWidth: 340,
        boxShadow: "0 4px 32px #0006",
        position: "relative"
      }}>
        <button onClick={onClose} style={{ 
          position: "absolute", 
          top: 24, 
          right: 24, 
          background: "none", 
          border: "none", 
          color: "var(--color-text-dark)", 
          fontSize: 24, 
          cursor: "pointer" 
        }}>✖</button>
        <h2 style={{ color: "var(--color-text-dark)", marginBottom: 18 }}>
          {showRecovery
            ? t.authmodal.title["title.reset"]
            : mode === "login"
              ? t.authmodal.title["title.login"]
              : t.authmodal.title["title.signup"]}
        </h2>
        <p>{t.authmodal.disclaimer}</p>
        {!showRecovery ? (
          <>
            <form onSubmit={mode === "login" ? handleLogin : handleSignup} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <input
                type="email"
                placeholder={mode === "login"
                  ? t.authmodal.placeholder["placeholder.email_login"]
                  : t.authmodal.placeholder["placeholder.email_signup"]}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              {mode === "signup" && (
                <input
                  type="text"
                  placeholder={t.authmodal.placeholder["placeholder.username"]}
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                />
              )}
              <input
                type="password"
                placeholder={t.authmodal.placeholder["placeholder.password"]}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              {error && <div style={{ color: "#e23c3c", fontWeight: 500 }}>{error}</div>}
              <button type="submit" disabled={loading} style={{
                padding: "12px 0",
                borderRadius: 8,
                background: "#2a7cff",
                color: "#fff",
                fontWeight: 600,
                border: "none",
                cursor: "pointer"
              }}>{loading ? (mode === "login" ? t.authmodal.status["status.logging_in"] : t.authmodal.status["status.signing_up"]) : (mode === "login" ? t.authmodal.button["button.login"] : t.authmodal.button["button.signup"])}</button>
            </form>
            <div style={{ marginTop: 18, color: "#bbb", fontSize: "0.98em" }}>
              {mode === "login" ? (
                <>
                  {t.authmodal.link["link.no_account_prefix"]} <button style={{ color: "#2a7cff", background: "none", border: "none", cursor: "pointer" }} onClick={() => setMode("signup")}>{t.authmodal.link["link.sign_up"]}</button><br />
                  <button style={{ color: "#2a7cff", background: "none", border: "none", cursor: "pointer", marginTop: 8 }} onClick={() => setShowRecovery(true)}>{t.authmodal.link["link.forgot_password"]}</button>
                </>
              ) : (
                <>{t.authmodal.link["link.have_account_prefix"]} <button style={{ color: "#2a7cff", background: "none", border: "none", cursor: "pointer" }} onClick={() => setMode("login")}>{t.authmodal.link["link.log_in"]}</button></>
              )}
            </div>
          </>
        ) : (
          <form onSubmit={handleRecovery} style={{ color: "white", display: "flex", flexDirection: "column", gap: 16 }}>
            <input
              type="email"
              placeholder={t.setnewpassword.placeholder["placeholder.recovery_email"]}
              value={recoveryEmail}
              onChange={e => setRecoveryEmail(e.target.value)}
              required
            />
            <button type="submit" disabled={loading} style={{
              padding: "12px 0",
              borderRadius: 8,
              background: "#2a7cff",
              color: "#fff",
              fontWeight: 600,
              border: "none",
              cursor: "pointer"
            }}>{loading ? t.setnewpassword.status["status.sending_recovery"] : t.setnewpassword.button["button.send_recovery"]}</button>
            {recoveryMsg && <div style={{ color: recoveryMsg.includes('sent') ? '#2a7cff' : '#e23c3c', fontWeight: 500 }}>{recoveryMsg}</div>}
            <button type="button" style={{ color: "#bbb", background: "none", border: "none", cursor: "pointer", marginTop: 8 }} onClick={() => setShowRecovery(false)}>{t.setnewpassword.button["button.back_to_login"]}</button>
          </form>
        )}
      </div>
    </div>
  );
}
