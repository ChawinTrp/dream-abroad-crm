import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { StageBoard } from './pages/StageBoard';
import { CustomerDetail } from './pages/CustomerDetail';
import { ManagerDashboard } from './pages/ManagerDashboard';
import { BoardFiltersProvider } from './contexts/board-filters';

export default function App() {
  return (
    <BoardFiltersProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/board" replace />} />
          <Route path="/board" element={<StageBoard />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/dashboard" element={<ManagerDashboard />} />
        </Route>
      </Routes>
    </BoardFiltersProvider>
  );
}
