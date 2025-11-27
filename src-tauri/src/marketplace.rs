// Import necessary crates
use std::fs;
use std::path::Path;
use reqwest::Client;
use dotenv::dotenv;
use std::env;
use serde_json::{json, Value};

#[tauri::command]
#[allow(non_snake_case)]
pub async fn get_theme_info(databaseId: &str, collectionId: &str, documentId: &str) -> Result<Value, String> { // Get info about a theme on the marketplace
    dotenv().ok();
    // Import Appwrite credientials from .env
    let endpoint = env::var("VITE_APPWRITE_ENDPOINT").map_err(|_| "APPWRITE_ENDPOINT not set".to_string())?; // Get Appwrite endpoint
    let projectId = env::var("VITE_APPWRITE_PROJECT_ID").map_err(|_| "APPWRITE_PROJECT_ID not set".to_string())?; // Get Appwrite project ID
    let apiKey = env::var("VITE_APPWRITE_API_KEY").map_err(|_| "APPWRITE_API_KEY not set".to_string())?; // Get Appwrite API key

    let client = Client::new(); // Create new Appwrite client object
    let url = format!("{}/databases/{}/collections/{}/documents/{}", endpoint, databaseId, collectionId, documentId); // Theme info document
    let response = client // Response using the client object
        .get(&url) // Get the specified URL using the client object
        .header("X-Appwrite-Project", projectId) // Add Appwrite project ID header to response
        .header("X-Appwrite-Key", apiKey) // Add Appwrite API key header to response
        .header("Content-Type", "application/json") // Add JSON content type header to response
        .send() // Send response
        .await // Wait for response
        .map_err(|e| format!("Failed to get theme info: {}", e))?; // Throw error on failure
    if response.status().is_success() {
        let theme_data = response.text().await.map_err(|e| format!("Failed to read response: {}", e))?; // Read theme data from response, throw error on failure
        let parsed: serde_json::Value = serde_json::from_str(&theme_data).unwrap_or(json!({}));
        return Ok(parsed); // Return success if response status is success
    } else {
        let status_code = response.status().as_u16(); // Return status code as u16
        let error_text = response.text().await.unwrap_or_default(); // Response error message
        return Err(format!("Failed to get theme info: status {} - {}", status_code, error_text)); // Throw error with status code and error message
    }
}

#[tauri::command]
#[allow(non_snake_case)]
pub async fn fetch_marketplace_themes(databaseId: &str, collectionId: &str) -> Result<Value, String> { // Fetch all available marketplace themes
    dotenv().ok();
    // Import Appwrite credientials from .env
    let endpoint = env::var("VITE_APPWRITE_ENDPOINT").map_err(|_| "APPWRITE_ENDPOINT not set".to_string())?; // Get Appwrite endpoint
    let projectId = env::var("VITE_APPWRITE_PROJECT_ID").map_err(|_| "APPWRITE_PROJECT_ID not set".to_string())?; // Get Appwrite project ID
    let apiKey = env::var("VITE_APPWRITE_API_KEY").map_err(|_| "APPWRITE_API_KEY not set".to_string())?; // Get Appwrite API key
    
    let client = Client::new(); // Create new Appwrite client object
    let url = format!("{}/databases/{}/collections/{}/documents", endpoint, databaseId, collectionId); // Theme info document
    let response = client // Response using the client object
        .get(&url) // Get the specified URL using the client object
        .header("X-Appwrite-Project", projectId) // Add Appwrite project ID header to response
        .header("X-Appwrite-Key", apiKey) // Add Appwrite API key header to response
        .header("Content-Type", "application/json") // Add JSON content type header to response
        .send() // Send response
        .await // Wait for response
        .map_err(|e| format!("Failed to fetch themes: {}", e))?; // Throw error on failure
    if response.status().is_success() {
        let theme_data = response.text().await.map_err(|e| format!("Failed to read response: {}", e))?; // Read theme data from response, throw error on failure
        let parsed: serde_json::Value = serde_json::from_str(&theme_data).unwrap_or(json!({}));
        return Ok(parsed); // Return success if response status is success
    } else {
        let status_code = response.status().as_u16(); // Return status code as u16
        let error_text = response.text().await.unwrap_or_default(); // Response error message
        return Err(format!("Failed to fetch themes: status {} - {}", status_code, error_text)); // Throw error with status code and error message
    }
}

#[tauri::command]
#[allow(non_snake_case)]
pub async fn download_theme(themeFileId: String, themeName: String) -> Result<(), String> { // Download a theme file from the marketplace
    dotenv().ok();
    // Import Appwrite credientials from .env
    let endpoint = env::var("VITE_APPWRITE_ENDPOINT").map_err(|_| "APPWRITE_ENDPOINT not set".to_string())?; // Get Appwrite endpoint 
    let projectId = env::var("VITE_APPWRITE_PROJECT_ID").map_err(|_| "APPWRITE_PROJECT_ID not set".to_string())?; // Get Appwrite project ID
    let apiKey = env::var("VITE_APPWRITE_API_KEY").map_err(|_| "APPWRITE_API_KEY not set".to_string())?; // Get Appwrite API key

    let client = Client::new(); // Create new Appwrite client object
    let url = format!("{}/storage/buckets/{}/files/{}/download", endpoint, "themes", themeFileId); // Theme files storage bucket
    let response = client // Response using the client object
        .get(&url) // Get the specified URL using the client object
        .header("X-Appwrite-Project", projectId) // Add Appwrite project ID header to response
        .header("X-Appwrite-Key", apiKey) // Add Appwrite API key header to response
        .header("Content-Type", "application/json") // Add JSON content type header to response
        .send() // Send response
        .await // Wait for response
        .map_err(|e| format!("Failed to download theme: {}", e))?; // Throw error on failure
    if response.status().is_success() {
        let bytes = response.bytes().await.map_err(|e| format!("Failed to read theme bytes: {}", e))?; // Read theme file bytes from the response
        
        let home_dir = env::home_dir().ok_or("Failed to get home directory".to_string())?; // Get user's home directory
        let reskin_dir = Path::new(&home_dir).join(".reskin-themes"); // Reskin themes directory
        let theme_path = reskin_dir.join(format!("{}.reskin", themeName)); // Theme file destination

        fs::create_dir_all(&reskin_dir).map_err(|e| format!("Failed to create directory: {}", e))?; // Create themes directory and all parent directories

        fs::write(&theme_path, &bytes).map_err(|e| format!("Failed to save theme file: {}", e))?; // Write theme file to the destination path
        
        Ok(()) // Return success
    } else {
        let status_code = response.status().as_u16(); // Return status code as u16
        let error_text = response.text().await.unwrap_or_default(); // Response error message
        Err(format!("Failed to download theme: status {} - {}", status_code, error_text)) // Throw error with status code and error message
    }
}