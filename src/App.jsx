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
import DrillingWorkShiftPage from '@/routes/masters/DrillingWorkShiftPage'
import FsCatgToRigTypeMappingPage from '@/routes/masters/FsCatgToRigTypeMappingPage'
import IncidentsPage from '@/routes/reports/IncidentsPage'
import HazardCardsPage from '@/routes/reports/HazardCardsPage'
import ItAssetsPage from '@/routes/itasset/ItAssetsPage'
import ItAssetFormPage from '@/routes/itasset/ItAssetFormPage'
import ItAssetHoldersPage from '@/routes/itasset/ItAssetHoldersPage'
import ItAssetHolderFormPage from '@/routes/itasset/ItAssetHolderFormPage'
import ItAccessoriesPage from '@/routes/itasset/ItAccessoriesPage'
import ItAccessoryFormPage from '@/routes/itasset/ItAccessoryFormPage'
import ItAccessoryHoldersPage from '@/routes/itasset/ItAccessoryHoldersPage'
import ItAccessoryHolderFormPage from '@/routes/itasset/ItAccessoryHolderFormPage'
import ItAssetReportPage from '@/routes/itasset/ItAssetReportPage'

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
            <Route path="/masters/drilling-work-shifts" element={<DrillingWorkShiftPage />} />
            <Route
              path="/masters/fs-catg-to-rig-type-mapping"
              element={<FsCatgToRigTypeMappingPage />}
            />
            <Route path="/masters/:slug" element={<MasterCrudPage />} />
          </Route>
          <Route path="/it-asset/it-assets" element={<ItAssetsPage />} />
          <Route path="/it-asset/it-assets/new" element={<ItAssetFormPage />} />
          <Route path="/it-asset/it-assets/:id/edit" element={<ItAssetFormPage />} />
          <Route path="/it-asset/it-asset-holders" element={<ItAssetHoldersPage />} />
          <Route path="/it-asset/it-asset-holders/new" element={<ItAssetHolderFormPage />} />
          <Route path="/it-asset/it-asset-holders/:id/edit" element={<ItAssetHolderFormPage />} />
          <Route path="/it-asset/it-accessories" element={<ItAccessoriesPage />} />
          <Route path="/it-asset/it-accessories/new" element={<ItAccessoryFormPage />} />
          <Route path="/it-asset/it-accessories/:id/edit" element={<ItAccessoryFormPage />} />
          <Route path="/it-asset/it-accessory-holders" element={<ItAccessoryHoldersPage />} />
          <Route path="/it-asset/it-accessory-holders/new" element={<ItAccessoryHolderFormPage />} />
          <Route path="/it-asset/it-accessory-holders/:id/edit" element={<ItAccessoryHolderFormPage />} />
          <Route path="/it-asset/report" element={<ItAssetReportPage />} />
          <Route path="/reports/incidents" element={<IncidentsPage />} />
          <Route path="/reports/hazard-cards" element={<HazardCardsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
