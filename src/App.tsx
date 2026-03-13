/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { PropertyProvider } from './store/PropertyContext';
import { AuthProvider, useAuth } from './store/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import MapSearch from './pages/MapSearch';
import PropertyDetail from './pages/PropertyDetail';
import Registration from './pages/Registration';
import Admin from './pages/Admin';
import Login from './pages/Login';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export default function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <PropertyProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="map" element={<MapSearch />} />
                <Route path="property/:id" element={<PropertyDetail />} />
                <Route path="register" element={<Registration />} />
                <Route path="admin" element={
                  <ProtectedRoute>
                    <Admin />
                  </ProtectedRoute>
                } />
              </Route>
            </Routes>
          </BrowserRouter>
        </PropertyProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}
