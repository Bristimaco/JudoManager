import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./AuthContext";
import "./index.css";
import RequireAuth from "./RequireAuth";
import LoginPage from "./LoginPage";
import Home from "./Home";
import MembersPage from "./MembersPage";
import MemberCreatePage from "./MemberCreatePage";
import MemberDetailPage from "./MemberDetailPage";
import AdminPage from "./AdminPage";
import LookupListPage from "./LookupListPage";


ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <RequireAuth>
                <Home />
              </RequireAuth>
            }
          />

          <Route
            path="/admin"
            element={
              <RequireAuth>
                <AdminPage />
              </RequireAuth>
            }
          />

          <Route
            path="/admin/lookups/:type"
            element={
              <RequireAuth>
                <LookupListPage />
              </RequireAuth>
            }
          />

          <Route
            path="/members"
            element={
              <RequireAuth>
                <MembersPage />
              </RequireAuth>
            }
          />

          <Route
            path="/members/new"
            element={
              <RequireAuth>
                <MemberCreatePage />
              </RequireAuth>
            }
          />

          <Route
            path="/members/:id"
            element={
              <RequireAuth>
                <MemberDetailPage />
              </RequireAuth>
            }
          />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
