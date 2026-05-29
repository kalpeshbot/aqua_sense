import { createContext, useContext, useEffect, useRef, useState } from 'react';
import api from '../api/client';
import useWebSocket from '../hooks/useWebSocket';

const DataContext = createContext();

export function DataProvider({ children }) {
  const [pondData, setPondData] = useState(null);
  const [farmSummary, setFarmSummary] = useState(null);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [criticalSensors, setCriticalSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const { data: wsData, connected: wsConnected } = useWebSocket('ws://localhost:8001/ws/live');

  // Track consecutive poll failures for toast notifications
  const failCountRef = useRef(0);
  const toastFiredRef = useRef(false);

  useEffect(() => {
    if (wsData) {
      setPondData(wsData);
      setLastUpdated(Date.now());
      setLoading(false);
      setError(null);
    }
  }, [wsData]);

  useEffect(() => {
    const fetchPonds = async () => {
      try {
        const res = await api.get('/api/ponds');
        setPondData(res.data);
        setLastUpdated(Date.now());
        setError(null);
        failCountRef.current = 0;
        toastFiredRef.current = false;
      } catch (e) {
        setError(e.message);
        failCountRef.current += 1;
        if (failCountRef.current >= 3 && !toastFiredRef.current) {
          toastFiredRef.current = true;
          // Dispatch custom event for toast system to pick up
          window.dispatchEvent(new CustomEvent('aquasense-toast', {
            detail: { message: 'Backend connection lost', type: 'error' }
          }));
        }
      } finally {
        setLoading(false);
      }
    };

    const fetchSummary = async () => {
      try {
        const res = await api.get('/api/agent/summary');
        setFarmSummary(res.data);
      } catch {
        setFarmSummary(null);
      }
    };

    const fetchApprovals = async () => {
      try {
        const res = await api.get('/api/approvals');
        setPendingApprovals(res.data || []);
      } catch {
        setPendingApprovals([]);
      }
    };

    const fetchCritical = async () => {
      try {
        const res = await api.get('/api/sensors/critical');
        setCriticalSensors(res.data || []);
      } catch {
        setCriticalSensors([]);
      }
    };

    fetchPonds();
    fetchSummary();
    fetchApprovals();
    fetchCritical();

    const pondInterval = setInterval(fetchPonds, 5000);
    const summaryInterval = setInterval(fetchSummary, 30000);
    const approvalInterval = setInterval(fetchApprovals, 10000);
    const criticalInterval = setInterval(fetchCritical, 10000);

    return () => {
      clearInterval(pondInterval);
      clearInterval(summaryInterval);
      clearInterval(approvalInterval);
      clearInterval(criticalInterval);
    };
  }, []);

  return (
    <DataContext.Provider
      value={{
        pondData,
        farmSummary,
        pendingApprovals,
        criticalSensors,
        loading,
        error,
        lastUpdated,
        wsConnected,
        setFarmSummary,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
