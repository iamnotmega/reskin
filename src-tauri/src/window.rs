// Import necessary crates
use tauri::{Window};

#[tauri::command]
pub fn minimize(window: Window) { // Function to minimize the window
    window.minimize().unwrap();
}

#[tauri::command]
pub fn toggle_maximize(window: Window) { // Function to toggle maximize on the window
    if window.is_maximized().unwrap() { // If window is maximized, unmaximize it
        window.unmaximize().unwrap();
    } else { // If window is not maximized, maximize it
        window.maximize().unwrap();
    }
}

#[tauri::command]
pub fn close(window: Window) { // Function to close the window
    window.close().unwrap();
}