// Import necessary crates
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct ThemeManifest { // Theme manifest
    pub name: String, // Theme name
    pub author: String, // Theme author
    pub description: String, // Theme description
    pub version: String, // Theme version
    pub tags: String, // Theme tags
    pub license: String, // Theme license
}
#[derive(Serialize, Deserialize, Clone)]
pub struct BundleRequest { // Data to bundle the theme with
    pub manifest: ThemeManifest, // Theme manifest
    pub output_path: String, // Output for the bundled .reskin file
    pub assets: Vec<String>, // Theme assets
    pub theme_directory: Option<String>, // Directory where theme files are located
}

#[derive(Serialize, Deserialize, Clone)]
pub struct RecentTheme { // Entry to recently installed themes
    pub name: String, // Theme name
    pub author: String, // Theme author
    pub description: String, // Theme description
    pub installed_at: u64, // Theme installation Unix timestamp
}