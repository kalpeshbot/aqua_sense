import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { DataProvider } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Overview from './pages/Overview';
import PondDetail from './pages/PondDetail';
import Predictions from './pages/Predictions';
import Alerts from './pages/Alerts';
import Tanks from './pages/Tanks';
import SensorHealth from './pages/SensorHealth';
import AIAgent from './pages/AIAgent';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

function ProtectedRoute({ children }) {
  const user = localStorage.getItem('aquasense-user');
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <DataProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<ErrorBoundary><Overview /></ErrorBoundary>} />
              <Route path="pond/:pond_id" element={<ErrorBoundary><PondDetail /></ErrorBoundary>} />
              <Route path="predictions" element={<ErrorBoundary><Predictions /></ErrorBoundary>} />
              <Route path="alerts" element={<ErrorBoundary><Alerts /></ErrorBoundary>} />
              <Route path="tanks" element={<ErrorBoundary><Tanks /></ErrorBoundary>} />
              <Route path="sensor-health" element={<ErrorBoundary><SensorHealth /></ErrorBoundary>} />
              <Route path="ai-agent" element={<ErrorBoundary><AIAgent /></ErrorBoundary>} />
              <Route path="reports" element={<ErrorBoundary><Reports /></ErrorBoundary>} />
              <Route path="settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </DataProvider>
    </ThemeProvider>
  );
}
