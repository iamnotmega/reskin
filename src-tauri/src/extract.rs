use std::fs;
use std::fs::File;
use std::io::Read;
use crate::types::ThemeManifest;

#[tauri::command]
pub fn extract_theme_info(file_data: Vec<u8>) -> Result<ThemeManifest, String> {
    // Read the RSKN header and extract manifest
    if file_data.len() < 12 {
        return Err("Invalid .reskin file: too small".to_string());
    }

    // Check RSKN magic header
    let magic = &file_data[0..4];
    if magic != b"RSKN" {
        return Err("Invalid .reskin file: missing RSKN header".to_string());
    }

    // Read manifest size (8 bytes after magic, as usize)
    let manifest_size = usize::from_le_bytes([
        file_data[4], file_data[5], file_data[6], file_data[7],
        file_data[8], file_data[9], file_data[10], file_data[11]
    ]);

    if file_data.len() < 12 + manifest_size {
        return Err("Invalid .reskin file: manifest size mismatch".to_string());
    }

    // Extract manifest JSON
    let manifest_bytes = &file_data[12..12 + manifest_size];
    let manifest_str = String::from_utf8_lossy(manifest_bytes);
    
    match serde_json::from_str::<ThemeManifest>(&manifest_str) {
        Ok(manifest) => Ok(manifest),
        Err(e) => Err(format!("Failed to parse manifest: {}", e))
    }
}

#[tauri::command]
pub fn extract_theme_info_from_file(file_path: String) -> Result<ThemeManifest, String> {
    match fs::read(file_path) {
        Ok(file_data) => extract_theme_info(file_data), // Extract theme info from file data
        Err(e) => Err(format!("Failed to read file: {}", e)) // Throw error on failure
    }
}

#[tauri::command]
pub fn extract_theme(bundle_path: String) -> Result<String, String> {
    use std::path::Path;

    let mut file = File::open(&bundle_path) // Attempt to open file
        .map_err(|e| format!("Failed to open bundle: {}", e))?; // Throw error

    let mut magic = [0u8; 4]; // RSKN magic number as bytes
    file.read_exact(&mut magic) // Read magic number from file
        .map_err(|e| format!("Failed to read magic: {}", e))?;
    if &magic != b"RSKN" {
        return Err("Invalid bundle format".to_string()); // Return error when magic number doesn't match
    }

    let mut len_bytes = [0u8; 8]; // File length as bytes
    file.read_exact(&mut len_bytes)
        .map_err(|e| format!("Failed to reach manifest length: {}", e))?;
    let manifest_len = usize::from_le_bytes(len_bytes);

    let mut manifest_json = vec![0u8; manifest_len];
    file.read_exact(&mut manifest_json)
        .map_err(|e| format!("Failed to read manifest data: {}", e))?;

    let manifest: ThemeManifest = serde_json::from_slice(&manifest_json)
        .map_err(|e| format!("Failed to parse manifest: {}", e))?;
    
    let home_dir = std::env::var("HOME").unwrap_or("/home/user".into()); // Unwrap ~ into /home
    let output_dir = format!("/{}/.themes/{}", home_dir, manifest.name); // Extraction output directory

    fs::create_dir_all(&output_dir) // Create output directory and all necessary parent directories
        .map_err(|e| format!("Failed to create output dir: {}", e))?;
    
    fs::write(Path::new(&output_dir).join("reskin.json"), &manifest_json) // Write reskin.json file into output directory
        .map_err(|e| format!("Failed to write reskin.json: {}", e))?;

    // Extract assets from the bundle file
    loop {
        let mut filename_len_bytes = [0u8; 4];
        if file.read_exact(&mut filename_len_bytes).is_err() {
            break; // End of file
        }
        let filename_len = u32::from_le_bytes(filename_len_bytes) as usize;
        let mut filename_bytes = vec![0u8; filename_len];
        file.read_exact(&mut filename_bytes) // Read filename bytes
            .map_err(|e| format!("Failed to read filename: {}", e))?; // Return error on failure
        let filename = String::from_utf8_lossy(&filename_bytes).to_string(); // Convert filename bytes into string

        let mut asset_len_bytes = [0u8; 4];
        file.read_exact(&mut asset_len_bytes) // Read asset length bytes
            .map_err(|e| format!("Failed to read asset length: {}", e))?; // Return error on failure
        let asset_len = u32::from_le_bytes(asset_len_bytes) as usize;
        let mut asset_data = vec![0u8; asset_len];
        file.read_exact(&mut asset_data) // Read asset data
            .map_err(|e| format!("Failed to read asset data: {}", e))?; // Return error on failure

        let out_path = Path::new(&output_dir).join(&filename); // Define output path
        fs::write(out_path, &asset_data) // Write asset data to output path (/tmp/reskin by default)
            .map_err(|e| format!("Failed to write asset {}: {}", filename, e))?; // Return error on failure
    }

    Ok(format!("Theme extracted to {}", output_dir)) // Return Ok on success
}