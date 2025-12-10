// Import necessary components
import { invoke } from "@tauri-apps/api/core";
import { Minus, Square, X } from "lucide-react";
import logo from "/assets/logo.svg";
import "./Titlebar.css";

export default function Titlebar() {
  // Return HTML content
  return (
    <div data-tauri-drag-region className="titlebar">
      <div className="flex items-center">
        <img src={logo} alt="Logo" className="logo" />
      </div>
      <div className="titlebar-drag-region" />
      <div className="titlebar-buttons">
        {/* Minimize */}
        <button onClick={() => invoke("minimize")} className="titlebar-btn">
          <Minus size={18} />
        </button>
        {/* Maximize */}
        <button onClick={() => invoke("toggle_maximize")} className="titlebar-btn">
          <Square size={18} />
        </button>
        {/* Close */}
        <button onClick={() => invoke("close")} className="titlebar-btn hover:bg-red-600">
          <X size={18} />
        </button>
      </div>
    </div>
  );
}