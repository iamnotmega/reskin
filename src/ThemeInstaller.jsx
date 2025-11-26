import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./ThemeInstaller.css";
import { getTranslationObject } from "./locales/index.js";

export default function ThemeInstaller({ onThemeInstalled }) {
  const language = localStorage.getItem("reskin_language") || "en";
  const t = getTranslationObject(language);

  const [selectedFile, setSelectedFile] = useState(null);
  const [themeInfo, setThemeInfo] = useState(null);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("info");
  const [isInstalling, setIsInstalling] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const showStatus = (msg, type = "info") => {
    setStatus(msg);
    setStatusType(type);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file || !file.name.endsWith(".reskin")) {
      showStatus(t.themeinstaller.status.error_not_reskin, "error");
      return;
    }

    setSelectedFile(file);
    showStatus(
      t.themeinstaller.status.success_select.replace("{filePath}", file.name),
      "success"
    );

    try {
      const buffer = await file.arrayBuffer();
      const bytes = Array.from(new Uint8Array(buffer));
      const info = await invoke("extract_theme_info", { fileData: bytes });
      setThemeInfo(info);
      showStatus(t.themeinstaller.status.info_loaded, "success");
    } catch {
      showStatus(t.themeinstaller.status.error_info_load, "error");
      setThemeInfo(null);
    }
  };

  const handleFileInput = (e) =>
    handleDrop({
      dataTransfer: { files: e.target.files },
      preventDefault: () => {}
    });

  const handleInstall = async () => {
    if (!selectedFile) {
      showStatus(t.themeinstaller.status.error_no_theme_to_apply, "error");
      return;
    }

    setIsInstalling(true);
    showStatus(t.themeinstaller.status.installing, "info");

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const fileData = Array.from(new Uint8Array(arrayBuffer));
      await invoke("install_theme_from_data", {
        fileData,
        fileName: selectedFile.name,
        autoApply: true
      });

      showStatus(t.themeinstaller.status.install_success, "success");
      onThemeInstalled && onThemeInstalled(selectedFile);
    } catch (err) {
      showStatus(
        t.themeinstaller.status.install_failure.replace(
          "{error.message || error}",
          err.message || err
        ),
        "error"
      );
    }

    setIsInstalling(false);
  };

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