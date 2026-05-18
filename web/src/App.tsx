import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { StageBoard } from './pages/StageBoard';
import { CustomerDetail } from './pages/CustomerDetail';
import { ManagerDashboard } from './pages/ManagerDashboard';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/board" replace />} />
        <Route path="/board" element={<StageBoard />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="/dashboard" element={<ManagerDashboard />} />
      </Route>
    </Routes>
  );
}
