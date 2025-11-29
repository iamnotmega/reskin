use std::fs;
use std::fs::File;
use std::io::Read;
use std::io::Seek;
use std::path::Path;
use crate::types::ThemeManifest;

#[tauri::command]
pub fn extract_theme_info(file_data: Vec<u8>) -> Result<ThemeManifest, String> {
    // Read the RSKN header and extract manifest
    if file_data.len() < 12 {
        return Err("Invalid .reskin file: too small".to_string());
    }

    // Check RSKN magic header
    if !file_data.starts_with(b"RSKN") {
        return Err("Invalid .reskin file: missing RSKN header".to_string());
    }

    // Read manifest size (8 bytes after magic, as usize)
    let manifest_size = u64::from_le_bytes([
        file_data[4], file_data[5], file_data[6], file_data[7], file_data[8], file_data[9], file_data[10], file_data[11]
    ]) as usize;

    // Ensure file has enough data for the manifest
    if file_data.len() < 12 + manifest_size {
        return Err("Invalid .reskin file: manifest size mismatch".to_string()); // Return error if manifest size is incorrect
    }

    // Extract manifest JSON
    let manifest_bytes = &file_data[12..12 + manifest_size];
    let manifest_str = String::from_utf8_lossy(manifest_bytes);

    // Parse manifest JSON
    match serde_json::from_str::<ThemeManifest>(&manifest_str) {
        Ok(manifest) => Ok(manifest), // Return success
        Err(e) => Err(format!("Failed to parse manifest: {}", e)) // Throw error
    }
}

#[tauri::command]
pub fn extract_theme_info_from_file(file_path: String) -> Result<ThemeManifest, String> {
    // Read entire file into memory
    match fs::read(&file_path) {
        Ok(file_data) => extract_theme_info(file_data), // Extract theme info from file data
        Err(e) => Err(format!("Failed to read file '{}': {}", file_path, e)) // Throw error on failure
    }
}

#[tauri::command]
pub fn extract_theme(bundle_path: String) -> Result<String, String> {
    // Open the .reskin bundle file
    let mut file = File::open(&bundle_path)
        .map_err(|e| format!("Failed to open bundle: {}", e))?;

    // Read first 4 bytes for RSKN magic
    let mut magic = [0u8; 4];
    file.read_exact(&mut magic)
        .map_err(|e| format!("Failed to read magic: {}", e))?;
    if &magic[..] != b"RSKN" { // Compare only first 4 bytes
        return Err("Invalid bundle format".to_string()); // Error if magic mismatch
    }

    let mut len_bytes = [0u8; 8]; // File length as bytes
    file.read_exact(&mut len_bytes) // Read length as bytes from the file
        .map_err(|e| format!("Failed to reach manifest length: {}", e))?; // Throw error on failure
    let manifest_len = u64::from_le_bytes(len_bytes) as usize;

    let temp_dir = format!("/tmp/reskin_extract_{}", std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH).unwrap().as_secs());
    fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to create temp dir: {}", e))?;

    // Read manifest JSON
    let mut manifest_json = vec![0u8; manifest_len];
    file.read_exact(&mut manifest_json) // Read manifest data from file
        .map_err(|e| format!("Failed to read manifest data: {}", e))?; // Throw error on failure

    // Parse manifest
    let manifest: ThemeManifest = serde_json::from_slice(&manifest_json)
        .map_err(|e| format!("Failed to parse manifest: {}", e))?;

    // Prepare output directory
    let output_dir = format!("/tmp/{}", manifest.name); // Extraction output directory
    fs::create_dir_all(&output_dir)
        .map_err(|e| format!("Failed to create output dir: {}", e))?;

    // Write manifest to output directory
    fs::write(Path::new(&output_dir).join("reskin.json"), &manifest_json)
        .map_err(|e| format!("Failed to write reskin.json: {}", e))?;

    // Extract assets safely
    loop {
        let mut filename_len_bytes = [0u8; 4];
        if file.read_exact(&mut filename_len_bytes).is_err() {
            break; // EOF reached, stop loop
        }
        let filename_len = u32::from_le_bytes(filename_len_bytes) as usize;

        // Sanity check filename length
        if filename_len == 0 || filename_len > 4096 {
            // Invalid filename length, stop extraction
            break;
        }

        // Read filename bytes
        let mut filename_bytes = vec![0u8; filename_len];
        if file.read_exact(&mut filename_bytes).is_err() {
            break; // Failed to read, stop safely
        }
        let filename = String::from_utf8_lossy(&filename_bytes).to_string();

        // Read asset length
        let mut asset_len_bytes = [0u8; 4];
        if file.read_exact(&mut asset_len_bytes).is_err() {
            break;
        }
        let asset_len = u32::from_le_bytes(asset_len_bytes) as usize;

        // Skip assets that are too large
        if asset_len > 500_000_000 {
            let _ = file.seek(std::io::SeekFrom::Current(asset_len as i64));
            continue;
        }

        // Read asset data
        let mut asset_data = vec![0u8; asset_len];
        if file.read_exact(&mut asset_data).is_err() {
            break;
        }

        // Write asset to disk
        let asset_path = Path::new(&output_dir).join(&filename);
        if let Some(parent) = asset_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create parent directory for {}: {}", filename, e))?;
        }
        fs::write(&asset_path, &asset_data)
            .map_err(|e| format!("Failed to write asset {}: {}", filename, e))?;
    }

    Ok(format!("{}", output_dir)) // Extraction success
}