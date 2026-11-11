import { createRoot } from "react-dom/client";
import Dashboard from "../app/dashboard";
import latest from "../public/data/latest.json";
import "../app/globals.css";
createRoot(document.getElementById("root")!).render(
  <Dashboard initial={latest} />,
);
