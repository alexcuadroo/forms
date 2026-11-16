import { createRoot } from "react-dom/client";
import { App } from "./App";
import { appName } from "./config";
import "./styles/index.css";
document.title = appName;
createRoot(document.getElementById("root")!).render(<App />);
