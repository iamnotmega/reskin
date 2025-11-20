// Import necessary crates
use std::fs;

// Check if theme has GTK or window manager components
pub fn has_gtk_or_wm_components(theme_path: &std::path::Path) -> bool {
    let gtk_wm_dirs = ["gtk-2.0", "gtk-3.0", "gtk-4.0", "xfwm4", "gnome-shell", 
                       "cinnamon", "metacity-1", "openbox-3", "plank"];
    
    gtk_wm_dirs.iter().any(|dir| theme_path.join(dir).exists())
}

// Check if theme has icons
pub fn has_icons(theme_path: &std::path::Path) -> bool {
    // Look for common icon directories or files
    let icon_indicators = ["icons", "scalable", "16x16", "22x22", "24x24", "32x32", 
                          "48x48", "64x64", "128x128", "256x256", "apps", "places", 
                          "devices", "mimetypes", "actions"];
    
    icon_indicators.iter().any(|dir| theme_path.join(dir).exists()) ||
    theme_path.join("index.theme").exists()
}

// Check if theme has cursors
pub fn has_cursors(theme_path: &std::path::Path) -> bool {
    theme_path.join("cursors").exists() ||
    theme_path.join("cursor.theme").exists()
}

// Check if theme has fonts
pub fn has_fonts(theme_path: &std::path::Path) -> bool {
    if let Ok(entries) = fs::read_dir(theme_path) {
        for entry in entries.flatten() {
            if let Some(ext) = entry.path().extension() {
                if ["ttf", "otf", "woff", "woff2", "eot"].contains(&ext.to_str().unwrap_or("")) {
                    return true; // Return true if theme directory contains a font file
                }
            }
        }
    }
    false
}