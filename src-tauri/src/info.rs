// Import necessary crates
use serde_json::json;
use std::process::Command;

#[tauri::command]
pub fn get_app_version() -> Result<String, String> {
    Ok(env!("CARGO_PKG_VERSION").to_string()) // Get current application version from Cargo.toml
}

#[tauri::command]
pub fn init() -> Result<serde_json::Value, String> {
    let de_output = Command::new("sh") // Get user's desktop environment
        .arg("-c")
        .arg("echo $XDG_CURRENT_DESKTOP")
        .output()
        .map_err(|e| format!("Failed to get desktop environment: {}", e))?;
    Command::new("sh") // Create /tmp/reskin to store bundled .reskin files
        .arg("-c")
        .arg("mkdir -p /tmp/reskin")
        .output()
        .map_err(|e| format!("Failed to create temporary directory: {}", e))?;
    let de = String::from_utf8_lossy(&de_output.stdout).trim().to_string(); // The user's desktop environment trimmed and converted to a string

    let system_info = json!({
        "de": de,
    });

    Ok(system_info) // Return success with system info
}