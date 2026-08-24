import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { Accedi } from "./Accedi.js";
import { Chat } from "./Chat.js";
import { Landing } from "./Landing.js";
import "./index.css";

const container = document.getElementById("root");
if (!container) throw new Error("Elemento #root mancante");

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/accedi" element={<Accedi />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
