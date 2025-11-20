// Import necessary crates
use std::path::{Path, PathBuf};
use crate::types::BundleRequest;
use std::fs::{self, File};
use std::io::Write;

// Helper function to recursively find all files relative to the root directory
fn collect_relative_files_recursive(root_dir: &Path, dir: &Path, files: &mut Vec<String>) -> Result<(), String> {
    let entries = fs::read_dir(dir).map_err(|e| format!("Failed to read directory {}: {}", dir.display(), e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();

        // Skip hidden directories (like .git, .vscode)
        if path.is_dir() {
            if let Some(dir_name) = path.file_name() {
                if dir_name.to_string_lossy().starts_with('.') {
                    continue;
                }
            }
            collect_relative_files_recursive(root_dir, &path, files)?; // Recursive call
        } else if path.is_file() {
            let relative_path = path
                .strip_prefix(root_dir)
                .map_err(|e| format!("Failed to strip prefix for {}: {}", path.display(), e))?
                .to_string_lossy()
                .into_owned();
            files.push(relative_path); // Push relative path
        }
    }

    Ok(())
}

#[tauri::command]
#[allow(non_snake_case)] // Allow variables to be camelCase
pub fn _create_theme_dir(path: String) -> Result<String, String> {
    fs::create_dir_all(&path)
        .map_err(|e| format!("Failed to create directory: {}", e))?;
    Ok("Directory created successfully".to_string())
}

#[tauri::command]
#[allow(non_snake_case)] // Allow variables to be camelCase
pub fn bundle_theme(mut request: BundleRequest) -> Result<String, String> {
    let magic = b"RSKN"; // Magic number

    let manifest_json = serde_json::to_string(&request.manifest)
        .map_err(|e| format!("Failed to serialize manifest: {}", e))?;

    let theme_root = request.theme_directory
        .as_ref()
        .map(PathBuf::from)
        .ok_or_else(|| "Theme directory must be provided if assets are listed".to_string())?;

    // Auto-collect files if assets list is empty
    if request.assets.is_empty() {
        println!("Auto-collecting assets from theme directory...");
        let mut relative_files = Vec::new();
        collect_relative_files_recursive(&theme_root, &theme_root, &mut relative_files)?;
        println!("Found {} files", relative_files.len());
        request.assets = relative_files;
    }

    // Create .reskin output file
    let mut file = File::create(&request.output_path)
        .map_err(|e| format!("Failed to create file: {}", e))?;

    // Write header (magic + manifest length + manifest JSON)
    file.write_all(magic).map_err(|e| format!("Write error: {}", e))?;
    let len_bytes = (manifest_json.len() as u64).to_le_bytes();
    file.write_all(&len_bytes).map_err(|e| format!("Failed to write manifest length: {}", e))?;
    file.write_all(manifest_json.as_bytes()).map_err(|e| format!("Failed to write manifest data: {}", e))?;

    // Write each asset
    for relative_path_str in &request.assets {
        let full_path = theme_root.join(relative_path_str);
        println!("Bundling asset: {}", full_path.display());

        let asset_data = fs::read(&full_path)
            .map_err(|e| format!("Failed to read asset {}: {}", full_path.display(), e))?;

        let filename_bytes = relative_path_str.as_bytes();
        let filename_len = (filename_bytes.len() as u32).to_le_bytes();
        let asset_len = (asset_data.len() as u64).to_le_bytes();

        file.write_all(&filename_len).map_err(|e| format!("Failed to write filename length: {}", e))?; // Write filename length
        file.write_all(filename_bytes).map_err(|e| format!("Failed to write filename: {}", e))?; // Write filename bytes
        file.write_all(&asset_len).map_err(|e| format!("Failed to write asset length: {}", e))?; // Write asset length
        file.write_all(&asset_data).map_err(|e| format!("Failed to write asset data: {}", e))?; // Write asset data
    }

    Ok(format!("Bundle created successfully at {}", request.output_path)) // Return success
}

#[tauri::command]
#[allow(non_snake_case)] // Allow variables to be camelCase
pub fn bundle_theme_from_directory(mut request: BundleRequest) -> Result<String, String> {
    let dir = request.theme_directory.clone().ok_or_else(|| "No base directory provided".to_string())?;
    let dir_path = Path::new(&dir);

    if !dir_path.exists() || !dir_path.is_dir() {
        return Err(format!("Theme directory '{}' does not exist or is not a directory", dir)); // Return error if directory doesn't exist or isn't a directory
    }

    // Collect all files
    let mut relative_files = Vec::new();
    collect_relative_files_recursive(dir_path, dir_path, &mut relative_files)?;

    if relative_files.is_empty() {
        eprintln!("Warning: No files found in theme directory {}", dir); // Return error when theme directory is empty
    } else {
        println!("Collected {} asset(s):", relative_files.len());
        for f in &relative_files {
            println!(" - {}", f);
        }
    }

    request.assets = relative_files;
    bundle_theme(request) // Bundle theme with the request data
}
