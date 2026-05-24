import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { StageBoard } from './pages/StageBoard';
import { CustomerDetail } from './pages/CustomerDetail';
import { ManagerDashboard } from './pages/ManagerDashboard';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminMembers } from './pages/admin/AdminMembers';
import { AdminStages } from './pages/admin/AdminStages';
import { AdminTags } from './pages/admin/AdminTags';
import { AdminAudit } from './pages/admin/AdminAudit';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminNewCustomer } from './pages/admin/AdminNewCustomer';
import { BoardFiltersProvider } from './contexts/board-filters';
import { CurrentAgentProvider } from './contexts/current-agent';

export default function App() {
  return (
    <CurrentAgentProvider>
      <BoardFiltersProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/board" replace />} />
            <Route path="/board" element={<StageBoard />} />
            <Route path="/customers/:id" element={<CustomerDetail />} />
            <Route path="/dashboard" element={<ManagerDashboard />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/members" replace />} />
              <Route path="members" element={<AdminMembers />} />
              <Route path="stages" element={<AdminStages />} />
              <Route path="tags" element={<AdminTags />} />
              <Route path="audit" element={<AdminAudit />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="customers/new" element={<AdminNewCustomer />} />
            </Route>
          </Route>
        </Routes>
      </BoardFiltersProvider>
    </CurrentAgentProvider>
  );
}
