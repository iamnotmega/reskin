// Import necessary components
import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./ThemeBundler.css";
import { getTranslationObject } from "./locales/index.js";

export default function ThemeBundler() {
  // Translation object
  const language = localStorage.getItem("reskin_language") || "en";
  const t = getTranslationObject(language);

  // Status variables
  const [isReady, setIsReady] = useState(false);
  const [status, setStatus] = useState(t.bundler.status["status.loading_api"]);
  const [statusType, setStatusType] = useState("info");

  // Form data
  const [formData, setFormData] = useState({
    packageName: "",
    author: "",
    description: t.bundler.manifest.description_default,
    license: ""
  });
  const [themeData, setThemeData] = useState({
    name: "",
    author: "",
    description: "",
    version: "",
    license: "",
    tags: ""
  });
  const [tags, setTags] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(null);

  const storedUser = JSON.parse(localStorage.getItem('reskin_user') || "{}");

  useEffect(() => {
    const checkTauri = () => {
      if (invoke) {
        setIsReady(true);
        setStatus("");
        setStatusType("info");
      } else {
        setTimeout(checkTauri, 100);
      }
    };
    checkTauri();
  }, []);

  const showStatus = (message, type = "info") => {
    setStatus(message);
    setStatusType(type);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setThemeData(prev => ({ ...prev, [name]: value }));
    if (name === "name") setFormData(prev => ({ ...prev, packageName: value }));
    else if (name === "author") setFormData(prev => ({ ...prev, author: value }));
    else if (name === "description") setFormData(prev => ({ ...prev, description: value }));
    else if (name === "license") setFormData(prev => ({ ...prev, license: value }));
  };

  const handleTagsChange = (e) => {
    const value = e.target.value;
    if (value.endsWith(",")) {
      const newTag = value.slice(0, -1).trim();
      if (newTag && !tags.includes(newTag)) setTags([...tags, newTag]);
      e.target.value = "";
    }
  };

  const removeTag = (tag) => setTags(tags.filter(t => t !== tag));

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setDragOver(false); };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const items = e.dataTransfer.items;
    if (items.length > 0) {
      const item = items[0];
      if (item.kind === "file") {
        const entry = item.webkitGetAsEntry();
        if (entry && entry.isDirectory) {
          setSelectedFolder({ name: entry.name, entry: entry });
          showStatus(t.bundler.status["status.success_select"].replace("{folderName}", entry.name), "success");
        } else {
          showStatus(t.bundler.status["status.not_directory"], "error");
        }
      }
    }
  };

  const handleFolderSelect = async () => {
    try {
      const folderPath = await invoke("select_folder");
      const folderName = folderPath.split("/").pop();
      setSelectedFolder({ name: folderName, path: folderPath });
      showStatus(t.bundler.status["status.success_select"].replace("{folderName}", folderName), "success");
    } catch (error) {
      console.error("Error selecting folder:", error);
      showStatus(t.bundler.status["status.select_failed"].replace("{error}", error), "error");
      document.getElementById("folderInput").click();
    }
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      const folderName = files[0].webkitRelativePath.split("/")[0];
      setSelectedFolder({ name: folderName, files: Array.from(files) });
      showStatus(t.bundler.status["status.success_select"].replace("{folderName}", folderName), "success");
    }
  };

  const handleBundle = async () => {
    // Compute final values (handles defaults + disabled author)
    const finalAuthor = storedUser?.username || formData.author || "User";
    const finalName = formData.packageName;
    const finalVersion = themeData.version || "1.0.0";

    if (!finalName || !finalAuthor || !finalVersion) {
      showStatus(t.bundler.status["status.fields_empty"], "error");
      return;
    }

    if (!selectedFolder) {
      showStatus(t.bundler.status["status.no_folder"], "error");
      return;
    }

    try {
      showStatus(t.bundler.status["status.reading_files"], "info");

      let fileData = [];
      if (!selectedFolder.path) fileData = selectedFolder.files || [];

      const manifest = {
        name: finalName,
        author: finalAuthor,
        description: formData.description || t.bundler.manifest.description_default,
        version: finalVersion,
        tags: tags.join(","),
        license: formData.license || "MIT",
      };

      let homeDir = '';
      try { homeDir = await invoke('get_home_dir'); } 
      catch { homeDir = '/home/' + (window.process?.env?.USER || 'user'); }

      const themeDir = `/tmp/reskin`;
      const outputPath = `${themeDir}/${finalName}.reskin`;

      showStatus(t.bundler.status["status.bundling"], "info");

      const request = {
        manifest,
        theme_directory: selectedFolder.path,
        assets: fileData.map(f => f.path),
        output_path: outputPath,
      };

      let result;
      if (selectedFolder.path) result = await invoke("bundle_theme", { request });
      else result = await invoke("bundle_theme_from_directory", { request });

      console.log("Bundle result:", result);
      showStatus(t.bundler.status["status.bundle_success"].replace("{outputPath}", outputPath), "success");
    } catch (error) {
      console.error("Bundle error:", error);
      showStatus(t.bundler.status["status.bundle_failure"].replace("{error}", error.message || error), "error");
    }
  };

  const getStatusColor = () => {
    switch (statusType) {
      case "error": return "#ff5555";
      case "success": return "#50fa7b";
      default: return "#f8f8f2";
    }
  };

  return (
    <div id="theme-bundler-root">
      <h1>📦 {t.bundler.title}</h1>

      <div className="themebundler-meta-row">
        <div className="themebundler-meta-col">
          <input
            name="name"
            placeholder={t.bundler.manifest["manifest.name"]} 
            value={themeData.name}
            onChange={handleInputChange}
            required
            className="themebundler-input themebundler-input-name"
          />
          <input
            name="author"
            placeholder={t.bundler.manifest["manifest.author"]} 
            value={storedUser?.username || themeData.author || "User"}
            onChange={handleInputChange}
            required
            disabled={!!storedUser.username}
            className="themebundler-input"
          />
          <textarea
            name="description"
            placeholder={t.bundler.manifest["manifest.description"]} 
            value={themeData.description}
            onChange={handleInputChange}
            required
            className="themebundler-textarea"
          />
          <div className="themebundler-meta-flex">
            <input
              name="version"
              placeholder={t.bundler.manifest["manifest.version"]} 
              value={themeData.version}
              onChange={e => {
                const filtered = e.target.value.replace(/[^0-9.]/g, "");
                setThemeData(prev => ({ ...prev, version: filtered }));
              }}
              required
              className="themebundler-input themebundler-input-version"
            />
            <select
              name="license"
              value={themeData.license || ""}
              onChange={handleInputChange}
              required
              className={`settings-dropdown`}
              style={{ color: "black" }}
            >
              <option value="">{t.bundler.manifest.license_default}</option>
              <option value="MIT">MIT</option>
              <option value="GPL-3.0">GPL-3.0</option>
              <option value="Apache-2.0">Apache-2.0</option>
              <option value="BSD-3-Clause">BSD-3-Clause</option>
            </select>
            <div className="themebundler-tags-flex">
              {tags.map(tag => (
                <span key={tag} className="themebundler-tag-chip">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="themebundler-tag-remove">×</button>
                </span>
              ))}
              <input
                type="text"
                placeholder={t.bundler.manifest["manifest.tag_placeholder"]} 
                onChange={handleTagsChange}
                className="themebundler-tag-input"
              />
            </div>
          </div>
        </div>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleFolderSelect}
        className={`themebundler-dropzone${dragOver ? " themebundler-dropzone-active" : ""}`}
      >
        {selectedFolder ? (
          <div>
            <p>📁 {(t.bundler.dropzone.selected_title || 'Selected Folder: {folderName}').replace("{folderName}", selectedFolder.name)}</p>
            <p className="themebundler-dropzone-desc">{t.bundler.dropzone.selected_desc}</p>
          </div>
        ) : (
          <div>
            <p>📁 {t.bundler.dropzone.default_title}</p>
            <p className="themebundler-dropzone-desc">{t.bundler.dropzone.default_desc}</p>
          </div>
        )}
      </div>

      <input
        type="file"
        webkitdirectory
        directory
        onChange={handleFileInputChange}
        style={{ display: "none" }}
        id="folderInput"
      />

      <button
        onClick={handleBundle}
        disabled={!isReady || !selectedFolder}
        className={`themebundler-bundle-btn${isReady && selectedFolder ? "" : " themebundler-bundle-btn-disabled"}`}
      >
        📦 {t.bundler.button["button.bundle"]}
      </button>

      <div className="themebundler-status" style={{ color: getStatusColor() }}>
        {status}
      </div>
    </div>
  );
}
