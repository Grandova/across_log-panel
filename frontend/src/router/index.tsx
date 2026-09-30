import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout.tsx';
import { Dashboard } from '../pages/Dashboard/index.tsx';
import { HostRanking } from '../pages/HostRanking/index.tsx';
import { HostDetail } from '../pages/HostDetail/index.tsx';
import { UserDetail } from '../pages/UserDetail/index.tsx';
import { DomainLookup } from '../pages/DomainLookup/index.tsx';
import { LogExplorer } from '../pages/LogExplorer/index.tsx';
import { IpAnalysis } from '../pages/IpAnalysis/index.tsx';
import { NodeAnalysis } from '../pages/NodeAnalysis/index.tsx';
import { AuditLogs } from '../pages/AuditLogs/index.tsx';
import { Settings } from '../pages/Settings/index.tsx';
import { Login } from '../pages/Login/index.tsx';

interface AppRoutesProps {
  darkMode: boolean;
  onToggleTheme: () => void;
}

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('token');
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export const AppRoutes: React.FC<AppRoutesProps> = ({ darkMode, onToggleTheme }) => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <MainLayout darkMode={darkMode} onToggleTheme={onToggleTheme} />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard darkMode={darkMode} />} />
        <Route path="hosts/ranking" element={<HostRanking />} />
        <Route path="hosts/:host" element={<HostDetail />} />
        <Route path="users" element={<UserDetail />} />
        <Route path="users/:uid" element={<UserDetail />} />
        <Route path="lookup/domain" element={<DomainLookup />} />
        <Route path="logs" element={<LogExplorer />} />
        <Route path="ips" element={<IpAnalysis />} />
        <Route path="ips/:ip" element={<IpAnalysis />} />
        <Route path="nodes" element={<NodeAnalysis />} />
        <Route path="nodes/:nodeId" element={<NodeAnalysis />} />
        <Route path="audit" element={<AuditLogs />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
};
