// Import necessary components
import React, { useState } from "react";
import { Client, Storage, Databases, Account, Query } from "appwrite";
import { invoke } from "@tauri-apps/api/core";

export default function UploadTheme({ onNavigate }) {
  // Use stored language or fallback to English
  const language = localStorage.getItem("reskin_language") || "en";

  const [file, setFile] = useState(null); // The .reskin file to upload to the marketplace
  const [themeInfo, setThemeInfo] = useState(null); // Manifest extracted from the uploaded file
  const [status, setStatus] = useState("Pick a .reskin file"); // Status message
  const [loading, setLoading] = useState(false); // Loading state

  // Initialize Appwrite
  const client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject("reskin");
  
  // Create necessary Appwrite objects
  const storage = new Storage(client);
  const databases = new Databases(client);
  const account = new Account(client);

  const bucketId = "themes"; // Storage bucket ID
  const databaseId = "reskin"; // Database ID
  const collectionId = "themes"; // Collection ID

  // Function to change status message
  const showStatus = (msg) => setStatus(msg);

  // Get the currently logged in user, return null if no user is logged in
  const getUser = async () => {
    let user = JSON.parse(localStorage.getItem("reskin_user"));
    if (user && user.$id) return user;
    try {
      user = await account.get();
      localStorage.setItem("reskin_user", JSON.stringify(user));
      return user;
    } catch {
      return null;
    }
  };

  // Get unique SHA-256 hash of the .reskin file
  const getFileHash = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  };

  // Funcrtion to handle file change
  const handleFileChange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    showStatus("Reading theme metadata...");
    try {
      const arrayBuffer = await f.arrayBuffer();
      const uint8Array = Array.from(new Uint8Array(arrayBuffer));
      const info = await invoke("extract_theme_info", { fileData: uint8Array }); // Invoke backend to extract theme info from the .reskin file
      const safeTags = typeof info.tags === "string" // Separate tags with commas
        ? info.tags.slice(0, 32)
        : Array.isArray(info.tags)
          ? info.tags.join(",").slice(0, 32)
          : "";
      setThemeInfo({ ...info, tags: safeTags }); // Set theme info to the extracted info
      showStatus("Metadata loaded! Ready to upload");
    } catch (err) {
      // Throw error on failure
      console.error(err);
      showStatus("Failed to read theme metadata");
    }
  };

  // Handle uploading
  const handleUpload = async () => {
    if (!file || !themeInfo) return;
    setLoading(true);
    showStatus("Checking login...");
    // Check if user is logged in
    const user = await getUser();
    if (!user) {
      showStatus("Not logged in. Please log in first!");
      setLoading(false);
      return;
    }

    showStatus("Checking for duplicates...");
    // Check for a duplicate file on the marketplace
    try {
      const hash = await getFileHash(file);

      const existing = await databases.listDocuments(databaseId, collectionId, [
        Query.equal("hash", hash)
      ]);

      if (existing.total > 0) {
        showStatus("This theme file already exists!");
        setLoading(false);
        return;
      }

      // Upload the file into the marketplace
      showStatus("Uploading file...");
      const uploadedFile = await storage.createFile(bucketId, "unique()", file);
      const fileId = uploadedFile.$id;

      showStatus("Saving metadata...");
      // Define metadata to upload
      const docData = {
        name: themeInfo.name,
        description: themeInfo.description || "",
        author: themeInfo.author || "Unknown",
        version: themeInfo.version || "",
        tags: themeInfo.tags || "",
        license: themeInfo.license || "MIT",
        file: fileId,
        hash,
      };

      // Define Appwrite permissions
      const permissions = [
        `read("user:${user.$id}")`,
        `write("user:${user.$id}")`
      ];

      // Create document with the theme metadata on the server
      await databases.createDocument(databaseId, collectionId, "unique()", docData, permissions, permissions);
      // Return to marketplace
      showStatus("Upload successful!");
      onNavigate?.("marketplace");
    } catch (err) {
      // Throw error on failure
      console.error(err);
      showStatus(`Upload failed: ${err.message || err}`);
    } finally {
      // Once upload is finished, set loading state to false
      setLoading(false);
    }
  };

  // Return HTML content
  return (
    <div>
      <h1>📤 Upload Theme</h1>
      {/* .reskin File Input */}
      <input type="file" accept=".reskin" onChange={handleFileChange} />
      {/* Theme Info Preview */}
      {themeInfo && (
        <div style={{ marginTop: "1rem" }}>
          <h3>Preview:</h3>
          <p><strong>Name:</strong> {themeInfo.name}</p>
          <p><strong>Author:</strong> {themeInfo.author}</p>
          <p><strong>Description:</strong> {themeInfo.description}</p>
          <p><strong>Version:</strong> {themeInfo.version}</p>
          <p><strong>Tags:</strong> {themeInfo.tags}</p>
          <p><strong>License:</strong> {themeInfo.license}</p>
        </div>
      )}
      {/* Upload Button */}
      <button disabled={!file || !themeInfo || loading} onClick={handleUpload}>
        {loading ? "Uploading..." : "Upload Theme"}
      </button>
      <p>{status}</p>
    </div>
  );
}
