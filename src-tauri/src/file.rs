// import necessary crates
use std::process::Command;
use std::fs;
use std::env::temp_dir;

#[tauri::command]
pub fn select_folder() -> Result<String, String> {
    // Run zenity to open folder selection dialog
    let output = Command::new("zenity")
        .arg("--file-selection")
        .arg("--directory")
        .arg("--title=Select Theme Folder")
        .output();

    match output {
        Ok(result) => {
            if result.status.success() {
                let path = String::from_utf8_lossy(&result.stdout).trim().to_string();
                if !path.is_empty() {
                    Ok(path)
                } else {
                    Err("No folder selected".to_string()) // Throw error if no folder is selected
                }
            } else {
                Err("Failed to open folder dialog".to_string()) // Throw error if opening the folder dialog fails
            }
        }
        Err(_) => {
            // Fallback to using nautilus or other file manager
            let output = Command::new("sh")
                .arg("-c")
                .arg("nautilus --select ~/")
                .output();
            
            match output {
                Ok(_) => Err("Please manually drag and drop a folder".to_string()),
                Err(_) => Err("No folder dialog available. Please use drag and drop.".to_string())
            }
        }
    }
}

#[tauri::command]
pub fn select_file(title: String) -> Result<String, String> {
    // Run zenity to open file selection dialog allowing only .reskin files
    let output = Command::new("zenity")
        .arg("--file-selection")
        .arg(&format!("--title={}", title))
        .arg("--file-filter=Reskin Files (*.reskin) | *.reskin")
        .output();

    match output {
        Ok(result) => {
            if result.status.success() {
                let path = String::from_utf8_lossy(&result.stdout).trim().to_string();
                if !path.is_empty() {
                    Ok(path)
                } else {
                    Err("No file selected".to_string()) // Throw error when no file is selected
                }
            } else {
                Err("Failed to open file dialog".to_string()) // Throw error when opening the file dialog failed
            }
        }
        Err(_) => {
            Err("No file dialog available. Please use drag and drop.".to_string()) // Fallback to drag and drop if opening file dialog fails
        }
    }
}

#[tauri::command]
fn _ensure_reskin_folder() -> Result<(), String> { // Ensure /tmp/reskin exists
	let mut path = temp_dir(); // Define path as /tmp
	path.push("reskin"); // Append reskin to the end of /tmp, resulting in /tmp/reskin
	fs::create_dir_all(&path).map_err(|e| e.to_string())?; // Create /tmp/reskin with all neccessary parent directories
	Ok(()) // Return success
}

#[tauri::command]
fn _theme_file_exists(theme_name: String) -> bool {
	let mut path = temp_dir();
	path.push("reskin");
	path.push(format!("{}.reskin", theme_name));
	fs::metadata(&path).is_ok()
}