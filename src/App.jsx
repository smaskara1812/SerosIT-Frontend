import { Routes, Route, Navigate } from 'react-router-dom'
import Login from '@/routes/Login'
import Dashboard from '@/routes/Dashboard'
import ProtectedRoute from '@/routes/ProtectedRoute'
import AdminRoute from '@/routes/AdminRoute'
import MastersRoute from '@/routes/MastersRoute'
import AppShell from '@/components/layout/AppShell'
import UserRights from '@/routes/admin/UserRights'
import UserManagement from '@/routes/admin/UserManagement'
import AuditTrail from '@/routes/admin/AuditTrail'
import MastersHub from '@/routes/masters/MastersHub'
import MasterCrudPage from '@/routes/masters/MasterCrudPage'
import JobDescriptionsPage from '@/routes/masters/JobDescriptionsPage'
import ProjectContractPage from '@/routes/masters/ProjectContractPage'
import ProjectDrillingRatesPage from '@/routes/masters/ProjectDrillingRatesPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route element={<AdminRoute />}>
            <Route path="/admin/user-rights" element={<UserRights />} />
            <Route path="/admin/user-management" element={<UserManagement />} />
            <Route path="/admin/audit-trail" element={<AuditTrail />} />
          </Route>
          <Route element={<MastersRoute />}>
            <Route path="/masters" element={<MastersHub />} />
            <Route path="/masters/job-descriptions" element={<JobDescriptionsPage />} />
            <Route path="/masters/project-contract" element={<ProjectContractPage />} />
            <Route path="/masters/project-drilling-rates" element={<ProjectDrillingRatesPage />} />
            <Route path="/masters/:slug" element={<MasterCrudPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
