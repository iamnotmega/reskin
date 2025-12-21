// Import necessary components
import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./Settings.css";
import { getTranslationObject, getLanguageOptions } from "./locales/index.js";

export default function Settings() {
    const [installLocation, setInstallLocation] = useState(
        localStorage.getItem("reskin_install_location") || "~/.themes" // Install location for themes
    );
    const [autoApply, setAutoApply] = useState(
        localStorage.getItem("reskin_auto_apply") === "true" // Automatically apply themes after installation
    );
    const [backupConfig, setBackupConfig] = useState(
        localStorage.getItem("reskin_backup_config") === "true" // Back up current configuration file before applying a new one
    );
    const [theme, setTheme] = useState(
        localStorage.getItem("reskin_theme") || "dark" // Application theme
    )
    const [language, setLanguage] = useState(
        localStorage.getItem("reskin_language") || "en" // Application language
    );
    const [appVersion, setAppVersion] = useState("Unknown"); // Application version
    const [fade, setFade] = useState(false);

    const t = getTranslationObject(language); // Translation object
    const languageOptions = getLanguageOptions(); // Get available language options

    useEffect(() => {
        const getVersion = async () => {
            try {
                const ver = await invoke("get_app_version"); // Get app version
                setAppVersion(ver || "Unknown"); // Set app version to obtained version or fallback to Unknown
            } catch (err) {
                console.error("Failed to get app version:", err); // Throw error on failure
                setAppVersion(`Unknown (${err?.toString() || "error"})`);
            }
        };
        getVersion();
    }, []);

    useEffect(() => { // Set localStorage entries for the settings to match the frontend
        localStorage.setItem("reskin_install_location", installLocation);
    }, [installLocation]);

    useEffect(() => {
        localStorage.setItem("reskin_auto_apply", autoApply.toString());
    }, [autoApply]);

    useEffect(() => {
        localStorage.setItem("reskin_backup_config", backupConfig.toString());
    }, [backupConfig]);

    useEffect(() => {
        localStorage.setItem("reskin_language", language);
    }, [language]);

    useEffect(() => {
        localStorage.setItem("reskin_theme", theme);

        if (theme === "light") {
            document.body.classList.add("reskin-light");
        } else {
            document.body.classList.remove("reskin-light");
        }
    }, [theme]);

    // Return HTML content
    return (
        <div className={`settings-container${fade ? " settings-fade" : ""}`}>
            <h2>{t.settings["title"]}</h2>
            <div className="settings-section">
                <h3>{t.settings.section["section.general"]}</h3>
                <div className="settings-row">
                    <label htmlFor="installLocation" title={t.settings.tooltip["tooltip.install_location"]}>
                        {t.settings.label["label.install_location"]}
                    </label>
                    <input
                        id="installLocation"
                        type="text"
                        value={installLocation}
                        onChange={(e) => setInstallLocation(e.target.value)}
                    />
                </div>
                <div className="settings-row">
                    <label htmlFor="autoApply" title={t.settings.tooltip["tooltip.auto_apply"]}>
                        {t.settings.label["label.auto_apply"]}
                    </label>
                    <input
                        id="autoApply"
                        type="checkbox"
                        checked={autoApply}
                        onChange={(e) => setAutoApply(e.target.checked)}
                    />
                </div>
                <div className="settings-row">
                    <label htmlFor="backupConfig" title={t.settings.tooltip["tooltip.backup_config"]}>
                        {t.settings.label["label.backup_config"]}
                    </label>
                    <input
                        id="backupConfig"
                        type="checkbox"
                        checked={backupConfig}
                        onChange={(e) => setBackupConfig(e.target.checked)}
                    />
                </div>
                <div className="settings-row">
                    <label htmlFor="theme" title={t.settings.tooltip["tooltip.theme"]}>
                        {t.settings.label["label.theme"]}
                    </label>
                    <select
                        id="theme"
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                        style={{ color: "black" }}
                    >
                        <option value="dark">{t.settings.option["option.theme_dark"]}</option>
                        <option value="light">{t.settings.option["option.theme_light"]}</option>
                    </select>
                </div>
                <div className="settings-row">
                    <label htmlFor="language" title={t.settings.tooltip["tooltip.language"]}>
                        {t.settings.label["label.language"]}
                    </label>
                    <select
                        id="language"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        style={{ color: "black" }}
                    >
                        {languageOptions.map((opt) => (
                            <option key={opt.code} value={opt.code}>
                                {opt.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="settings-section">
                <h3>{t.settings.section["section.about"]}</h3>
                <div className="settings-row">
                    <span>{t.settings.label["label.app_version"]}</span>
                    <span>{appVersion || "Unknown"}</span>
                </div>
            </div>
            <div
                style={{
                    textAlign: "center",
                    marginTop: "32px",
                    fontSize: "1.05em",
                    color: "#888",
                }}
            >
                Made with <span style={{ color: "#e25555" }}>❤️</span> by NotMega
            </div>
        </div>
    );
}
