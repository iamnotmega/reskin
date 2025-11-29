// Import necessary components
import "./App.css";
import ThemeRow from "./ThemeRow";
import ThemeBundler from "./ThemeBundler";
import ThemeInstaller from "./ThemeInstaller";
import SideNav from "./SideNav";
import Titlebar from "./Titlebar";
import React, { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import ThemeDetails from "./ThemeDetails";
import Settings from "./Settings";
import UploadTheme from "./UploadTheme";
import Marketplace from "./Marketplace";
import ConfigurationFiles from "./ConfigurationFiles";

export default function App(props) {
  const [currentView, setCurrentView] = useState('home'); // Current view of the app
  const [installedThemes, setInstalledThemes] = useState([]); // Installed themes
  const [selectedTheme, setSelectedTheme] = useState(null); // Selected theme
  const [user, setUser] = useState(null); // Currently logged in user


  // Get recently installed themes from localStorage
  useEffect(() => {
	invoke("ensure_reskin_folder").catch(() => {}); // Ensure /tmp/reskin exists
	(async () => {
	  try {
		const recent = await invoke("get_recent_themes");
		const homeDir = window.__TAURI__ ? await invoke('get_home_dir') : '';
		const hydrated = await Promise.all(
		  (recent || []).map(async (t) => {
			try {
			  const bundlePath = `${homeDir}/.themes/${t.name}/reskin.json`;
			  const loaded = await invoke('extract_theme_info_from_file', { filePath: bundlePath });
			  // Use manifest from ~/.themes
			  return { ...loaded, installs: t.installs, installed_at: t.installed_at };
			} catch {
			  return { name: t.name, author: t.author, description: t.description, installs: t.installs, installed_at: t.installed_at };
			}
		  })
		);
		setInstalledThemes(hydrated);
	  } catch {}
	})();
  }, []);

  // Store recent themes in backend
  const saveInstalledThemes = async (themes) => {
	try {
	  await invoke("save_recent_themes", { themes });
	} catch {}
  };

  const addToRecentlyInstalled = async (theme) => {
	let manifest = null;
	try {
	  const bundlePath = `${window.__TAURI__ ? await invoke('get_home_dir') : ''}/.themes/${theme.name}/${theme.name}.reskin`;
	  const loaded = await invoke('extract_theme_info_from_file', { filePath: bundlePath });
	  manifest = { ...loaded };
	} catch (e) {
	  manifest = { name: theme.name, author: theme.author, description: theme.description };
	}
	setInstalledThemes(prev => {
	  const filtered = prev.filter(t => t.name !== manifest.name);
	  const updated = [manifest, ...filtered].slice(0, 10);
	  saveInstalledThemes(updated);
	  return updated;
	});
  };

  const handleThemeClick = (theme) => {
	setSelectedTheme(theme);
	setCurrentView('themeDetails');
  };

  const renderView = () => {
  switch(currentView) {
	case 'bundler':
	  return <ThemeBundler />;
	case 'installer':
	  return (
		<ThemeInstaller
		  onThemeInstalled={addToRecentlyInstalled}
		  setCurrentView={setCurrentView}
		/>
	  );
	case 'themeDetails':
	  return (
		<ThemeDetails
		  theme={selectedTheme}
		  onBack={() => setCurrentView('home')}
		/>
	  );
	case 'settings':
	  return <Settings />;
	case 'marketplace':
	  return <Marketplace onThemeClick={handleThemeClick} onNavigate={setCurrentView} />;
	case 'uploadtheme':
	  return <UploadTheme />;
	case 'configurationfiles':
		return <ConfigurationFiles />;
	case 'home':
	default:
	  return (
		<div id="home">
		  <ThemeRow
			title="Recently Installed"
			themes={installedThemes}
			onThemeClick={handleThemeClick}
		  />
		</div>
	  );
  }
  };

  // Get theme from localStorage for global appearance
  const themeClass = `reskin-${localStorage.getItem("reskin_theme") || "dark"}`;
  return (
	<div id="main-window" className={themeClass}>
	  <Titlebar />
	  <SideNav onNavigate={setCurrentView} user={user} setUser={setUser}   />
	  {renderView()}
	</div>
  );
}