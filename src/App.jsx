// src/App.js
import React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import "./styles/Global.css";
import AppRoutes from "./routes/AppRoutes";

const App = () => {
  return (
    <Router>
      <div className="app-container">
        <AppRoutes />
      </div>
    </Router>
  );
};

export default App;
