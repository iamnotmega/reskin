use std::fs;
use std::path::Path;
use crate::check::{has_gtk_or_wm_components, has_icons, has_cursors, has_fonts};
use crate::extract::extract_theme;
use crate::types::ThemeManifest;
use crate::utils::{install_icons, install_cursors, install_fonts, copy_dir_recursive};
use crate::apply::apply_theme;
use crate::recent::add_recent_theme;

#[tauri::command]
#[allow(non_snake_case)]
pub fn install_theme_from_data(file_data: Vec<u8>, file_name: String, autoApply: bool) -> Result<String, String> {
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let temp_dir = format!("/tmp/reskin_install_{}", timestamp);
    let temp_file_path = format!("{}/{}", temp_dir, file_name);

    if let Err(e) = fs::create_dir_all(&temp_dir) {
        return Err(format!("Failed to create temp directory: {}", e));
    }

    if let Err(e) = fs::write(&temp_file_path, &file_data) {
        return Err(format!("Failed to write temp file: {}", e));
    }

    let extracted_path = match extract_theme(temp_file_path.clone()) {
        Ok(path) => path,
        Err(e) => {
            return Err(format!("Failed to extract theme: {}", e));
        }
    };

    let manifest_path = format!("{}/reskin.json", extracted_path);
    let manifest_bytes = match fs::read(&manifest_path) {
        Ok(bytes) => bytes,
        Err(e) => {
            return Err(format!("Failed to read manifest: {}", e));
        }
    };

    if let Err(e) = serde_json::from_slice::<ThemeManifest>(&manifest_bytes) {
        return Err(format!("Failed to parse manifest: {}", e));
    }

    let result = match install_theme(extracted_path.clone(), autoApply) {
        Ok(r) => r,
        Err(e) => {
            return Err(e);
        }
    };

    let _ = fs::remove_dir_all(&temp_dir);
    Ok(result)
}

#[tauri::command]
#[allow(non_snake_case)]
pub fn install_theme(theme_path: String, autoApply: bool) -> Result<String, String> {
    if !Path::new(&theme_path).exists() {
        return Err(format!("Theme not found at '{}'", theme_path));
    }

    let theme_name = Path::new(&theme_path)
        .file_name()
        .ok_or("Invalid theme path")?
        .to_string_lossy()
        .to_string();

    let home_dir = std::env::var("HOME").unwrap_or("/home/user".into());

    let mut installed_components = Vec::new();
    let staging_path = Path::new(&theme_path);

    if has_gtk_or_wm_components(&staging_path) {
        let themes_dir = format!("{}/.themes", home_dir);
        let dest_dir = format!("{}/{}", themes_dir, theme_name);

        let _ = fs::create_dir_all(&themes_dir);
        if Path::new(&dest_dir).exists() {
            let _ = fs::remove_dir_all(&dest_dir);
        }

        copy_dir_recursive(&theme_path, &dest_dir)
            .map_err(|e| format!("Failed to copy theme: {}", e))?;

        installed_components.push("GTK/Window Manager theme");
    }

    if has_icons(&staging_path) {
        install_icons(&theme_path, &theme_name, &home_dir)?;
        installed_components.push("Icons");
    }

    if has_cursors(&staging_path) {
        install_cursors(&theme_path, &theme_name, &home_dir)?;
        installed_components.push("Cursors");
    }

    if has_fonts(&staging_path) {
        install_fonts(&theme_path, &theme_name, &home_dir)?;
        installed_components.push("Fonts");
    }

    let components_str = if installed_components.is_empty() {
        "No compatible components found".into()
    } else {
        installed_components.join(", ")
    };

    let mut result_message = format!(
        "Theme '{}' installed successfully!\nComponents: {}",
        theme_name, components_str
    );

    let manifest_path = format!("{}/reskin.json", theme_path);

    let (_name, author, description) = if let Ok(bytes) = fs::read(&manifest_path) {
        if let Ok(manifest) = serde_json::from_slice::<ThemeManifest>(&bytes) {
            (manifest.name.clone(), manifest.author.clone(), manifest.description.clone())
        } else {
            ("Unknown".into(), "Unknown".into(), "".into())
        }
    
    } else {
        ("Unknown".into(), "Unknown".into(), "".into())
    };

    let _ = add_recent_theme(theme_name.clone(), author, description);

    if autoApply {
        match apply_theme(theme_name.clone()) {
            Ok(msg) => {
                result_message.push_str("\n\n");
                result_message.push_str(&msg);
            }
            Err(e) => {
                result_message.push_str("\n\n⚠️ Failed to auto-apply: ");
                result_message.push_str(&e);
            }
        }
    }

    Ok(result_message)
}
