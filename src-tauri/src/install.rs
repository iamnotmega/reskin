// Import necessary crates
use std::fs;
use std::path::Path;
use crate::check::{has_gtk_or_wm_components, has_icons, has_cursors, has_fonts};
use crate::extract::{extract_theme, extract_theme_info};
use crate::utils::{install_icons, install_cursors, install_fonts, copy_dir_recursive};
use crate::apply::apply_theme;

#[tauri::command]
#[allow(non_snake_case)]
pub fn install_theme_from_data(file_data: Vec<u8>, file_name: String, autoApply: bool) -> Result<String, String> {
    // Create temp directory reskin_install_{}, where {} is the Unix timestamp of when the theme was installed
    let temp_dir = format!("/tmp/reskin_install_{}", 
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs()
    );
    
    // Save file to temp location
    let temp_file_path = format!("{}/{}", temp_dir, file_name);
    
    if let Err(e) = fs::create_dir_all(&temp_dir) { // Create /tmp with all parent directories
        return Err(format!("Failed to create temp directory: {}", e)); // Throw error on failure
    }
    
    if let Err(e) = fs::write(&temp_file_path, file_data) {
        return Err(format!("Failed to write temp file: {}", e)); // Throw error on failure
    }
    
    // First extract the theme to get the theme name
    extract_theme(temp_file_path.clone())?;
    
    // Get theme info to find the theme name
    let theme_info = extract_theme_info(fs::read(&temp_file_path)
        .map_err(|e| format!("Failed to read temp file: {}", e))?)?; // Throw error on failure
    
    // Install using the theme name
    let result = install_theme(theme_info.name.clone(), autoApply)?;
    
    // Clean up temp file
    let _ = fs::remove_dir_all(&temp_dir);
    
    Ok(result) // Return success
}

#[tauri::command]
#[allow(non_snake_case)] // Allow non-snake case variable names (camelCase)
pub fn install_theme(theme_path: String, autoApply: bool) -> Result<String, String> {
    if !Path::new(&theme_path).exists() { // Check if theme path exists
        return Err(format!("Theme not found at '{}'", theme_path)); // Throw error on failure
    }

    let theme_name = Path::new(&theme_path)
        .file_name()
        .ok_or("Invalid theme path")?
        .to_string_lossy()
        .to_string();

    let home_dir = std::env::var("HOME").map_err(|_| "Failed to get HOME directory".to_string())?; // Get user's home directory
    
    let mut installed_components = Vec::new();
    let staging_path = Path::new(&theme_path);

    // Use staging_path for all component checks and installs
    if has_gtk_or_wm_components(&staging_path) {
        let themes_dir = format!("{}/.themes", home_dir);
        let dest_dir = format!("{}/{}", themes_dir, theme_name);
        fs::create_dir_all(&themes_dir) // Create ~/.themes with all parent directories
            .map_err(|e| format!("Failed to create ~/.themes directory: {}", e))?; // Throw error on failure
        if Path::new(&dest_dir).exists() {
            fs::remove_dir_all(&dest_dir)
                .map_err(|e| format!("Failed to remove existing theme: {}", e))?;
        }
        copy_dir_recursive(&theme_path, &dest_dir)
            .map_err(|e| format!("Failed to install theme: {}", e))?;
        installed_components.push("GTK/Window Manager theme");
    }

    if has_icons(&staging_path) {
        install_icons(&theme_path, &theme_name, &home_dir)?; // Install icons
        installed_components.push("Icons"); // Push Icons to installed components list
    }

    if has_cursors(&staging_path) {
        install_cursors(&theme_path, &theme_name, &home_dir)?; // Install cursors
        installed_components.push("Cursors"); // Push Cursors to installed components list
    }

    if has_fonts(&staging_path) {
        install_fonts(&theme_path, &theme_name, &home_dir)?; // Install fonts
        installed_components.push("Fonts"); // Push Fonts to installed components list
    }

    let components_str = if installed_components.is_empty() {
        "No compatible components found".to_string()
    } else {
        installed_components.join(", ")
    };

    let mut result_message = format!(
    "Theme '{}' installed successfully!\nComponents: {}",
    theme_name, components_str
    ); // Return success

    if autoApply { // Runs if autoApply setting is enabled
        match apply_theme(theme_name.clone()) { // Attempt to apply theme
            Ok(apply_msg) => {
                result_message.push_str("\n\n");
                result_message.push_str(&apply_msg); 
            }, // Return success
            Err(e) => {
                result_message.push_str("\n\n⚠️ Failed to auto-apply: ");
                result_message.push_str(&e);
            } // Throw error on failure
        }
    }

    Ok(result_message) // Return success

}