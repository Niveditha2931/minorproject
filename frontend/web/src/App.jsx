import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Auth Provider
import { AuthProvider } from './contexts/AuthContext';

// Public Pages
import LandingPage from './components/Landingpage';
import Error404 from './components/Error404';

// Protected Route Components
import { ProtectedRoute, CitizenRoute, GovernmentRoute } from './components/ProtectedRoute';

// Government Dashboard Components
import Dashboard from './components/Dashboard';
import Incidents from './components/Incidents';
import Resources from './components/Resources';
import ResponseTeams from './components/Responseteam';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import RiskPrediction from './components/RiskPrediction';
import ResourceOptimization from './components/ResourceOptimization';

// Citizen Dashboard Components
import CitizenDashboard from './components/citizen/CitizenDashboard';
import ReportIncident from './components/citizen/ReportIncident';
import MyReports from './components/citizen/MyReports';

// Citizen Layout with Sidebar
import CitizenLayout from './components/citizen/CitizenLayout';
// Government Layout
import GovLayout from './components/GovLayout';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Citizen Routes */}
          <Route path="/citizen" element={
            <CitizenRoute>
              <CitizenLayout />
            </CitizenRoute>
          }>
            <Route path="dashboard" element={<CitizenDashboard />} />
            <Route path="report" element={<ReportIncident />} />
            <Route path="my-reports" element={<MyReports />} />
            <Route path="nearby" element={<CitizenDashboard />} />
            <Route path="emergency" element={<CitizenDashboard />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          
          {/* Government Routes */}
          <Route path="/gov" element={
            <GovernmentRoute>
              <GovLayout />
            </GovernmentRoute>
          }>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="incidents" element={<Incidents />} />
            <Route path="resources" element={<Resources />} />
            <Route path="response-teams" element={<ResponseTeams />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="risk-prediction" element={<RiskPrediction />} />
            <Route path="resource-optimization" element={<ResourceOptimization />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          
          {/* Legacy routes - redirect to gov dashboard */}
          <Route path="/dashboard" element={<GovernmentRoute><GovLayout /></GovernmentRoute>}>
            <Route index element={<Dashboard />} />
          </Route>
          <Route path="/incidents" element={<GovernmentRoute><GovLayout /></GovernmentRoute>}>
            <Route index element={<Incidents />} />
          </Route>
          <Route path="/resources" element={<GovernmentRoute><GovLayout /></GovernmentRoute>}>
            <Route index element={<Resources />} />
          </Route>
          <Route path="/response-teams" element={<GovernmentRoute><GovLayout /></GovernmentRoute>}>
            <Route index element={<ResponseTeams />} />
          </Route>
          <Route path="/analytics" element={<GovernmentRoute><GovLayout /></GovernmentRoute>}>
            <Route index element={<Analytics />} />
          </Route>
          <Route path="/risk-prediction" element={<GovernmentRoute><GovLayout /></GovernmentRoute>}>
            <Route index element={<RiskPrediction />} />
          </Route>
          <Route path="/resource-optimization" element={<GovernmentRoute><GovLayout /></GovernmentRoute>}>
            <Route index element={<ResourceOptimization />} />
          </Route>
          <Route path="/settings" element={<ProtectedRoute><GovLayout /></ProtectedRoute>}>
            <Route index element={<Settings />} />
          </Route>
          
          {/* 404 */}
          <Route path="*" element={<Error404 />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
