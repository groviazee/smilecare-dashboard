import React from "react";
import ReactDOM from "react-dom/client";
import { Dashboard } from "./App.jsx";
import "./index.css";
import "./theme.js";
const chan = { on() { return chan; }, subscribe() { return chan; } };
const fake = { channel: () => chan, removeChannel() {}, auth: { signOut: async () => {} } };
const q = new URLSearchParams(location.search);
if (q.get("dark") === "1") document.documentElement.classList.add("dark");
localStorage.setItem("smilecare_dark_mode", q.get("dark") === "1" ? "1" : "0");
ReactDOM.createRoot(document.getElementById("root")).render(
  <Dashboard config={{ url: "http://127.0.0.1:9", key: "x" }} session={{ user: { email: "reception@smilecare.in" } }} userEmail="reception@smilecare.in" onLogout={() => {}} supabase={fake} />
);
