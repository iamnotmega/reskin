// Import necessary components
import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import ThemeRow from "./ThemeRow";
import { getTranslationObject } from "./locales/index.js";

const downloadTheme = async (args) => await invoke('download_theme', args);
const fetchMarketplaceThemes = async (args) => await invoke('fetch_marketplace_themes', args);

export default function Marketplace({ onThemeClick, onNavigate }) {
  const language = localStorage.getItem("reskin_language") || "en"; // Get selected language or fallback to English
  const t = getTranslationObject(language); // Translation object

  const [themes, setThemes] = useState(null); // Available themes
  const [loading, setLoading] = useState(true); // Loading state

  useEffect(() => {
    const loadThemes = async () => {
      try {
        const args = { // Appwrite credientials
          projectId: "reskin",
          endpoint: import.meta.env.VITE_APPWRITE_ENDPOINT || "",
          databaseId: "reskin",
          collectionId: "themes",
          apiKey: import.meta.env.VITE_APPWRITE_apiKey || ""
        };
        const data = await fetchMarketplaceThemes(args); // Fetch marketplace themes with Appwrite credientials
        setThemes(data.documents); // Set themes as the available themes from the themes document
      } catch (error) {
        console.error(`${t.marketplace.status["loading"]} ${error}`); // Throw error on failure
      } finally {
        setLoading(false);
      }
    };

    loadThemes();
  }, [t]);

  // Return HTML content
  return (
    <div className="marketplace">
      <button
        onClick={() => onNavigate("uploadtheme")}
        style={{
          padding: "10px 16px",
          borderRadius: 8,
          background: "#2a7cff",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          marginBottom: 16
        }}
      >
        {t.marketplace.button["upload"]}
      </button>

      {loading ? (
        <p>{t.marketplace.status["loading"]}</p>
      ) : (
        <ThemeRow
          title={t.marketplace.header["title"]}
          themes={themes || []}
          onThemeClick={onThemeClick}
        />
      )}
    </div>
  );
}
