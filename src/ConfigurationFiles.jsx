// Import necessary components
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./ConfigurationFiles.css";
import { getTranslationObject } from "./locales/index.js";

// Pre-defined config types
const configMap = {
  gtk: "~/.config/gtk-3.0/settings.ini",
  kvantum: "~/.config/Kvantum/Kvantum.kvconfig",
  kitty: "~/.config/kitty/kitty.yml",
  waybar: "~/.config/waybar/config.jsonc",
  bashrc: "~/.bashrc",
  zshrc: "~/.zshrc",
  alacritty: "~/.config/alacritty/alacritty.yml",
  i3: "~/.config/i3/config",
  wofi: "~/.config/wofi/style.css",
  hyprland: "~/.config/hypr/hyprland.conf",
  nvim: "~/.config/nvim/init.lua",
  vimrc: "~/.vimrc",
  fish: "~/.config/fish/config.fish",
  neofetch: "~/.config/neofetch/config.conf",
  fastfetch: "~/.config/fastfetch/config.jsonc"
};

export default function ConfigInstaller() {
  const language = localStorage.getItem("reskin_language") || "en"; // Get selected language or fallback to English
  const t = getTranslationObject(language); // Translation object

  const [selectedFile, setSelectedFile] = useState(null); // Selected file
  const [configType, setConfigType] = useState(""); // Selected config type
  const [status, setStatus] = useState(""); // Status message
  const [customPath, setCustomPath] = useState(""); // Custom path
  const [customName, setCustomName] = useState(""); // Custom name
  const [editingFile, setEditingFile] = useState(false); // Editing filename
  const [editingPath, setEditingPath] = useState(false); // Editing file path

  const getMatchingConfigType = (path, name) => {
    for (const [type, dest] of Object.entries(configMap)) {
      if (dest === `${path}/${name}`) return type;
    }
    return "custom";
  };

  const handleFileChange = (e) => { // Handle file change
    if (e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setCustomName(e.target.files[0].name);
      setStatus("");
      setConfigType("");
      setCustomPath("");
    }
  };

  const handleApply = async () => { // Handle config file application
    if (!selectedFile || (!configType && !customPath)) {
      setStatus(t.configurationfiles.status["status.no_file"]); // Throw error when there is no config file or type selected
      return;
    }

    const destPath = (customPath && customName)
      ? `${customPath}/${customName}`
      : configMap[configType];

    const backupConfig = localStorage.getItem("reskin_backup_config"); // Backup current configuration file before applying a new one
    if (backupConfig) {
      try {
        await invoke("backup_config_file", { srcPath: destPath }); // Backup current config if setting is enabled
        console.log("Backup created successfully");
      } catch (err) {
        console.warn("Backup failed:", err); // Throw error on failure
        return;
      }
    }

    setStatus(t.configurationfiles.status["status.applying"].replace("{selectedFile.name}", selectedFile.name).replace("{destPath}", destPath));
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const fileData = Array.from(new Uint8Array(arrayBuffer));
      await invoke("apply_config_file", { // Apply the config file
        fileData,
        fileName: selectedFile.name,
        destPath
      });
      setStatus(t.configurationfiles.status["status.success"]); // Return success
    } catch (err) {
      console.error(err);
      setStatus(t.configurationfiles.status["status.failure"]); // Throw error on failure
    }
  };

  // Return HTML content
  return (
    <div className={`reskin-${localStorage.getItem("reskin_theme") || "dark"}`}>
      <h1>{t.configurationfiles.title}</h1>

      <input type="file" onChange={handleFileChange} />

      <select
        className="configType"
        value={configType}
        onChange={(e) => setConfigType(e.target.value)}
      >
        <option value="">{t.configurationfiles.dropdown["dropdown.default"]}</option>
        {Object.keys(configMap).map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
        <option value="custom">{t.configurationfiles.dropdown["dropdown.custom"]}</option>
      </select>

      {selectedFile && (
        <div style={{ marginTop: 16 }}>
          <p>
            {t.configurationfiles.info["info.file_label"]}{" "}
            {editingFile ? (
              <input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onBlur={() => {
                  setEditingFile(false);
                  setConfigType(getMatchingConfigType(customPath, customName));
                }}
                autoFocus
              />
            ) : (
              <>
                {customName}{" "}
                <button onClick={() => setEditingFile(true)}>✏️</button>
              </>
            )}
          </p>

          <p>
            {t.configurationfiles.info["info.destination_label"]}{" "}
            {editingPath ? (
              <input
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                onBlur={() => {
                  setEditingPath(false);
                  setConfigType(getMatchingConfigType(customPath, customName));
                }}
                autoFocus
              />
            ) : (
              <>
                {customPath || (configType && configMap[configType])}{" "}
                <button onClick={() => setEditingPath(true)}>✏️</button>
              </>
            )}
          </p>
        </div>
      )}

      <button onClick={handleApply} style={{ marginTop: 16 }}>
        {t.configurationfiles.button["button.apply"]}
      </button>

      {status && <p style={{ marginTop: 12 }}>{status}</p>}
    </div>
  );
}
