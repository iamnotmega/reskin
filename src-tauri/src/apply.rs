// Import necessary components
use std::process::Command;

#[tauri::command]
pub fn apply_theme(theme_name: String) -> Result<String, String> {
    let mut results = Vec::new();
    let mut warnings = Vec::new();
    
    // Apply GTK theme using gsettings
    let gtk_output = Command::new("gsettings")
        .arg("set")
        .arg("org.gnome.desktop.interface")
        .arg("gtk-theme")
        .arg(&theme_name)
        .output()
        .map_err(|e| format!("Failed to execute gsettings for GTK theme: {}", e))?;
    
    if gtk_output.status.success() {
        results.push("GTK theme".to_string());
    } else {
        // Throw error on failure
        let error = String::from_utf8_lossy(&gtk_output.stderr);
        warnings.push(format!("GTK theme failed: {}", error));
    }
    
    // Check if user-theme extension schema exists
    let schema_check = Command::new("gsettings")
        .arg("list-schemas")
        .output()
        .map_err(|e| format!("Failed to check schemas: {}", e))?;
    
    let schemas = String::from_utf8_lossy(&schema_check.stdout);
    
    if schemas.contains("org.gnome.shell.extensions.user-theme") {
        // Apply Shell theme using gsettings
        let shell_output = Command::new("gsettings")
            .arg("set")
            .arg("org.gnome.shell.extensions.user-theme")
            .arg("name")
            .arg(&theme_name)
            .output()
            .map_err(|e| format!("Failed to execute gsettings for Shell theme: {}", e))?;
        
        if shell_output.status.success() {
            results.push("Shell theme".to_string());
        } else {
            let shell_error = String::from_utf8_lossy(&shell_output.stderr);
            warnings.push(format!("Shell theme failed: {}", shell_error));
        }
    } else {
        // Try alternative methods to apply shell theme
        let alt_result = try_alternative_shell_theme_methods(&theme_name);
        match alt_result {
            Ok(method) => results.push(format!("Shell theme (via {})", method)),
            Err(e) => warnings.push(format!("Shell theme not applied: user-theme extension not found. Install it with: `gnome-extensions install user-theme@gnome-shell-extensions.gcampax.github.com` or via GNOME Extensions app. Error: {}", e))
        }
    }
    
    // Apply window manager theme (for other DEs)
    let wm_result = apply_window_manager_theme(&theme_name);
    match wm_result {
        Ok(wm) => results.push(wm),
        Err(_) => {} // Silently ignore WM theme failures as not all DEs support this
    }
    
    let mut message = String::new();
    
    if !results.is_empty() {
        message.push_str(&format!("✅ Applied: {}\n", results.join(", ")));
    }
    
    if !warnings.is_empty() {
        message.push_str(&format!("⚠️  Warnings:\n{}", warnings.join("\n")));
    }
    
    if results.is_empty() {
        Err("Failed to apply any theme components".to_string())
    } else {
        Ok(message)
    }
}

// Try alternative methods to apply shell theme when user-theme extension isn't available
fn try_alternative_shell_theme_methods(theme_name: &str) -> Result<String, String> {
    let home_dir = std::env::var("HOME")
        .map_err(|_| "Failed to get HOME directory".to_string())?;
    
    // Method 1: Try to enable user-theme extension first
    let enable_output = Command::new("gnome-extensions")
        .arg("enable")
        .arg("user-theme@gnome-shell-extensions.gcampax.github.com")
        .output();
    
    if let Ok(output) = enable_output {
        if output.status.success() {
            // Wait a moment for the extension to load
            std::thread::sleep(std::time::Duration::from_millis(500));
            
            // Try applying the theme again
            let shell_output = Command::new("gsettings")
                .arg("set")
                .arg("org.gnome.shell.extensions.user-theme")
                .arg("name")
                .arg(theme_name)
                .output();
                
            if let Ok(result) = shell_output {
                if result.status.success() {
                    return Ok("auto-enabled user-theme extension".to_string());
                }
            }
        }
    }
    
    // Method 2: Try direct file manipulation (less reliable)
    let dconf_path = format!("{}/.config/dconf/user", home_dir);
    if std::path::Path::new(&dconf_path).exists() {
        // This is more complex and risky, skip it for now
    }
    
    Err("user-theme extension not available and auto-enable failed".to_string())
}

// Apply window manager themes for non-GNOME desktop environments
fn apply_window_manager_theme(theme_name: &str) -> Result<String, String> {
    // Try XFCE
    let xfce_output = Command::new("xfconf-query")
        .arg("-c")
        .arg("xfwm4")
        .arg("-p")
        .arg("/general/theme")
        .arg("-s")
        .arg(theme_name)
        .output();
    
    if let Ok(output) = xfce_output {
        if output.status.success() {
            return Ok("XFCE window manager theme".to_string());
        }
    }
    
    // Try KDE
    let kde_output = Command::new("kwriteconfig5")
        .arg("--file")
        .arg("kwinrc")
        .arg("--group")
        .arg("org.kde.kdecoration2")
        .arg("--key")
        .arg("theme")
        .arg(theme_name)
        .output();
    
    if let Ok(output) = kde_output {
        if output.status.success() {
            return Ok("KDE window manager theme".to_string());
        }
    }
    
    // Return Err if no compatible window manager is found
    Err("No compatible window manager found".to_string())
}