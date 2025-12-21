// Import necessary components
import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./ThemeInstaller.css";
import { getTranslationObject } from "./locales/index.js";

export default function ThemeInstaller({ onThemeInstalled }) {
  const language = localStorage.getItem("reskin_language") || "en"; // Use selected language or fall back to English
  const t = getTranslationObject(language); // Translation object

  const [selectedFile, setSelectedFile] = useState(null); // Selected file
  const [themeInfo, setThemeInfo] = useState(null); // Theme info
  const [status, setStatus] = useState(""); // Status message
  const [statusType, setStatusType] = useState("info"); // Status message type (determines the color of it)
  const [isInstalling, setIsInstalling] = useState(false); // Installation state
  const [dragOver, setDragOver] = useState(false);

  const showStatus = (msg, type = "info") => { // Show status message with message and type
    setStatus(msg); // Set status message
    setStatusType(type); // Set status type
  };

  const handleDrop = async (e) => { // Handle drag-and-drop file seection
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file || !file.name.endsWith(".reskin")) { 
      showStatus(t.themeinstaller.status.error_not_reskin, "error"); // Throw an error if the file format is not .reskin
      return;
    }

    setSelectedFile(file); // Set selected file as the uploaded file
    showStatus(
      t.themeinstaller.status.success_select.replace("{filePath}", file.name),
      "success"
    ); // Return success

    try {
      const buffer = await file.arrayBuffer();
      const bytes = Array.from(new Uint8Array(buffer));
      const info = await invoke("extract_theme_info", { fileData: bytes }); // Attempt to extract theme info
      setThemeInfo(info); // Set theme info as the extracted info
      showStatus(t.themeinstaller.status.info_loaded, "success"); // Return success
    } catch {
      showStatus(t.themeinstaller.status.error_info_load, "error"); // Throw error
      setThemeInfo(null); // Reset selected theme info to null
    }
  };

  const handleFileInput = (e) => // Handle file input
    handleDrop({
      dataTransfer: { files: e.target.files },
      preventDefault: () => {}
    });

  const handleInstall = async () => { // Handle theme installation
    if (!selectedFile) {
      showStatus(t.themeinstaller.status.error_no_theme_to_apply, "error"); // Throw error (no theme to apply) if file is not selected
      return;
    }

    setIsInstalling(true); // Set installation state to true
    showStatus(t.themeinstaller.status.installing, "info"); // Show installing status

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const fileData = Array.from(new Uint8Array(arrayBuffer));
      await invoke("install_theme_from_data", { // Install theme from extracted data
        fileData,
        fileName: selectedFile.name,
        autoApply: true
      });

      showStatus(t.themeinstaller.status.install_success, "success"); // Return success
      onThemeInstalled && onThemeInstalled(selectedFile);
    } catch (err) { // Set status to error message on failure
      showStatus(
        t.themeinstaller.status.install_failure.replace(
          "{error.message || error}",
          err.message || err
        ),
        "error"
      );
    }

    setIsInstalling(false); // Set installation state to false
  };

  // Return HTML content
  return (
    <div id="theme-installer-root">
      <h1>{t.themeinstaller.title}</h1>

      <div
        className={`themebundler-dropzone${
          dragOver ? " themebundler-dropzone-active" : ""
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={handleDrop}
        onClick={() => document.getElementById("fileInput").click()}
      >
        {selectedFile ? (
          <div>
            <p>
              {t.themeinstaller.dragdrop.selected_title.replace(
                "{selectedFile.name}",
                selectedFile.name
              )}
            </p>
            <p>{t.themeinstaller.dragdrop.selected_desc}</p>
          </div>
        ) : (
          <div>
            <p>{t.themeinstaller.dragdrop.default_title}</p>
            <p>{t.themeinstaller.dragdrop.default_desc}</p>
          </div>
        )}
      </div>

      <input
        type="file"
        accept=".reskin"
        id="fileInput"
        onChange={handleFileInput}
        style={{ display: "none" }}
      />

      {themeInfo && (
        <div className="theme-info-preview">
          <div>{t.themeinstaller.info_preview.header}</div>
          <div>
            {t.themeinstaller.info_preview.name} {themeInfo.name}
          </div>
          <div>
            {t.themeinstaller.info_preview.author} {themeInfo.author}
          </div>
          <div>
            {t.themeinstaller.info_preview.description} {themeInfo.description}
          </div>
          <div>
            {t.themeinstaller.info_preview.version} {themeInfo.version}
          </div>
          <div>
            {t.themeinstaller.info_preview.tags} {(Array.isArray(themeInfo.tags) ? themeInfo.tags : [themeInfo.tags]).join(", ")}
          </div>
          <div>
            {t.themeinstaller.info_preview.license} {themeInfo.license}
          </div>
        </div>
      )}

      <button onClick={handleInstall} disabled={isInstalling} id="install-button">
        {t.themeinstaller.button.install}
      </button>

      <div id="status" className={statusType}>
        {status}
      </div>
    </div>
  );
}