import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// >>> PR10B add Leaflet CSS
import "leaflet/dist/leaflet.css";
// <<< PR10B

createRoot(document.getElementById("root")!).render(<App />);
