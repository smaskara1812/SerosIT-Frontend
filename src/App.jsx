import { lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import Login from '@/routes/Login'
import Home from '@/routes/Home'
import NotFound from '@/routes/NotFound'
import ProtectedRoute from '@/routes/ProtectedRoute'
import AdminRoute from '@/routes/AdminRoute'
import MastersRoute from '@/routes/MastersRoute'
const FsListPage = lazy(() => import('@/routes/masters/fs/FsListPage'))
const FsFormPage = lazy(() => import('@/routes/masters/fs/FsFormPage'))
import AppShell from '@/components/layout/AppShell'
const UserRights = lazy(() => import('@/routes/admin/UserRights'))
const UserManagement = lazy(() => import('@/routes/admin/UserManagement'))
const AuditTrail = lazy(() => import('@/routes/admin/AuditTrail'))
const HistorySettings = lazy(() => import('@/routes/admin/HistorySettings'))
const EmailLog = lazy(() => import('@/routes/admin/EmailLog'))
const LoginSecurity = lazy(() => import('@/routes/admin/LoginSecurity'))
const NoticeBoardPage = lazy(() => import('@/routes/admin/NoticeBoardPage'))
const BannerEventsPage = lazy(() => import('@/routes/admin/BannerEventsPage'))
const BirthdayMailerPage = lazy(() => import('@/routes/admin/BirthdayMailerPage'))
const HolidayMailerPage = lazy(() => import('@/routes/admin/HolidayMailerPage'))
const ReportMailsPage = lazy(() => import('@/routes/admin/ReportMailsPage'))
const ScheduledMailsPage = lazy(() => import('@/routes/admin/ScheduledMailsPage'))
const BannerEventEditorPage = lazy(() => import('@/routes/admin/BannerEventEditorPage'))
const MastersHub = lazy(() => import('@/routes/masters/MastersHub'))
const MasterCrudPage = lazy(() => import('@/routes/masters/MasterCrudPage'))
const JobDescriptionsPage = lazy(() => import('@/routes/masters/JobDescriptionsPage'))
const ProjectContractPage = lazy(() => import('@/routes/masters/ProjectContractPage'))
const ProjectDrillingRatesPage = lazy(() => import('@/routes/masters/ProjectDrillingRatesPage'))
const DrillingWorkShiftPage = lazy(() => import('@/routes/masters/DrillingWorkShiftPage'))
const FsCatgToRigTypeMappingPage = lazy(() => import('@/routes/masters/FsCatgToRigTypeMappingPage'))
const IncidentsPage = lazy(() => import('@/routes/reports/IncidentsPage'))
const HazardCardsPage = lazy(() => import('@/routes/reports/HazardCardsPage'))
const ItAssetsPage = lazy(() => import('@/routes/itasset/ItAssetsPage'))
const ItAssetFormPage = lazy(() => import('@/routes/itasset/ItAssetFormPage'))
const ItAssetHoldersPage = lazy(() => import('@/routes/itasset/ItAssetHoldersPage'))
const ItAssetHolderFormPage = lazy(() => import('@/routes/itasset/ItAssetHolderFormPage'))
const ItAccessoriesPage = lazy(() => import('@/routes/itasset/ItAccessoriesPage'))
const ItAccessoryFormPage = lazy(() => import('@/routes/itasset/ItAccessoryFormPage'))
const ItAccessoryHoldersPage = lazy(() => import('@/routes/itasset/ItAccessoryHoldersPage'))
const ItAccessoryHolderFormPage = lazy(() => import('@/routes/itasset/ItAccessoryHolderFormPage'))
const ItAssetReportPage = lazy(() => import('@/routes/itasset/ItAssetReportPage'))
const DrillingInformationPage = lazy(() => import('@/routes/drilling/DrillingInformationPage'))
const DrillingReportListPage = lazy(() => import('@/routes/drilling/DrillingReportListPage'))
const DrillingReportFormPage = lazy(() => import('@/routes/drilling/DrillingReportFormPage'))
const PerformanceDashboardPage = lazy(() => import('@/routes/drilling/PerformanceDashboardPage'))
const OperationsAnalyticsPage = lazy(() => import('@/routes/drilling/OperationsAnalyticsPage'))
const DrillingTrippingAnalysisPage = lazy(() => import('@/routes/drilling/DrillingTrippingAnalysisPage'))
const DrillingDailyDataPage = lazy(() => import('@/routes/drilling/DrillingDailyDataPage'))
const ApproverMappingPage = lazy(() => import('@/routes/admin/ApproverMappingPage'))
const ActivityMonitorPage = lazy(() => import('@/routes/qhse/ActivityMonitorPage'))
const ActivityClosureAnalysisPage = lazy(() => import('@/routes/qhse/ActivityClosureAnalysisPage'))
const IncidentDetailsListPage = lazy(() => import('@/routes/qhse/IncidentDetailsListPage'))
const IncidentDetailsFormPage = lazy(() => import('@/routes/qhse/IncidentDetailsFormPage'))
const HazardIdCardListPage = lazy(() => import('@/routes/qhse/HazardIdCardListPage'))
const HazardIdCardFormPage = lazy(() => import('@/routes/qhse/HazardIdCardFormPage'))
const IncidentRootCausePage = lazy(() => import('@/routes/qhse/IncidentRootCausePage'))
const IncidentActionsPage = lazy(() => import('@/routes/qhse/IncidentActionsPage'))
const IncidentRegisterPage = lazy(() => import('@/routes/qhse/IncidentRegisterPage'))
const MisHseReturnPage = lazy(() => import('@/routes/qhse/MisHseReturnPage'))
const MisHseReviewPage = lazy(() => import('@/routes/qhse/MisHseReviewPage'))
const HseDrillRecordListPage = lazy(() => import('@/routes/qhse/HseDrillRecordListPage'))
const HseDrillRecordFormPage = lazy(() => import('@/routes/qhse/HseDrillRecordFormPage'))
const HseDrillRecordDetailsPage = lazy(() => import('@/routes/qhse/HseDrillRecordDetailsPage'))
const CertToRankMappingListPage = lazy(() => import('@/routes/qhse/CertToRankMappingListPage'))
const CertToRankMappingFormPage = lazy(() => import('@/routes/qhse/CertToRankMappingFormPage'))
const TrainingReportPage = lazy(() => import('@/routes/qhse/TrainingReportPage'))
const TrainingLogListPage = lazy(() => import('@/routes/qhse/TrainingLogListPage'))
const TrainingLogFormPage = lazy(() => import('@/routes/qhse/TrainingLogFormPage'))
const TrainingOrgListPage = lazy(() => import('@/routes/qhse/TrainingOrgListPage'))
const TrainingOrgFormPage = lazy(() => import('@/routes/qhse/TrainingOrgFormPage'))
const TrainingGroupListPage = lazy(() => import('@/routes/qhse/TrainingGroupListPage'))
const TrainingGroupFormPage = lazy(() => import('@/routes/qhse/TrainingGroupFormPage'))
const CorrectiveActionListPage = lazy(() => import('@/routes/qhse/CorrectiveActionListPage'))
const CorrectiveActionFormPage = lazy(() => import('@/routes/qhse/CorrectiveActionFormPage'))
const HseWeeklyDrillListPage = lazy(() => import('@/routes/qhse/HseWeeklyDrillListPage'))
const HseWeeklyDrillFormPage = lazy(() => import('@/routes/qhse/HseWeeklyDrillFormPage'))
const HseDrillReportPage = lazy(() => import('@/routes/qhse/HseDrillReportPage'))
const HseLeadingIndicatorsListPage = lazy(() => import('@/routes/qhse/HseLeadingIndicatorsListPage'))
const HseLeadingIndicatorsFormPage = lazy(() => import('@/routes/qhse/HseLeadingIndicatorsFormPage'))
const HseLaggingIndicatorsListPage = lazy(() => import('@/routes/qhse/HseLaggingIndicatorsListPage'))
const HseLaggingIndicatorsFormPage = lazy(() => import('@/routes/qhse/HseLaggingIndicatorsFormPage'))
const RigUtilisationDashboardPage = lazy(() => import('@/routes/dashboards/RigUtilisationDashboardPage'))
const DrillingPerformanceDashboardPage = lazy(() => import('@/routes/dashboards/DrillingPerformanceDashboardPage'))
const FleetOperatingPicturePage = lazy(() => import('@/routes/dashboards/FleetOperatingPicturePage'))
const ContractExposureDashboardPage = lazy(() => import('@/routes/dashboards/ContractExposureDashboardPage'))
const ItAssetDashboardPage = lazy(() => import('@/routes/dashboards/ItAssetDashboardPage'))
const NptAnalysisDashboardPage = lazy(() => import('@/routes/dashboards/NptAnalysisDashboardPage'))
const IncidentDashboardPage = lazy(() => import('@/routes/dashboards/IncidentDashboardPage'))
const ComplianceRadarPage = lazy(() => import('@/routes/dashboards/ComplianceRadarPage'))
const SafetyPerformancePage = lazy(() => import('@/routes/dashboards/SafetyPerformancePage'))
const FuelWaterPage = lazy(() => import('@/routes/dashboards/FuelWaterPage'))
const RigMovesPage = lazy(() => import('@/routes/dashboards/RigMovesPage'))
// Rig Health Index pulled from the app for now — page and its backend
// view (rig_health_dashboard.py) are kept, just not wired up here.
// import RigHealthDashboardPage from '@/routes/dashboards/RigHealthDashboardPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/admin/notice-board" element={<NoticeBoardPage />} />
          <Route path="/admin/banner-events" element={<BannerEventsPage />} />
          <Route path="/admin/birthday-mailer" element={<BirthdayMailerPage />} />
          <Route path="/admin/holiday-mailer" element={<HolidayMailerPage />} />
          <Route path="/admin/report-mails" element={<ReportMailsPage />} />
          <Route path="/admin/scheduled-mails" element={<ScheduledMailsPage />} />
          <Route path="/admin/banner-events/:id" element={<BannerEventEditorPage />} />
          <Route path="/admin/approver-mapping" element={<ApproverMappingPage />} />
          <Route element={<AdminRoute />}>
            <Route path="/admin/user-rights" element={<UserRights />} />
            <Route path="/admin/user-management" element={<UserManagement />} />
            <Route path="/admin/audit-trail" element={<AuditTrail />} />
            <Route path="/admin/history-revert" element={<HistorySettings />} />
            <Route path="/admin/email-log" element={<EmailLog />} />
            <Route path="/admin/login-security" element={<LoginSecurity />} />
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
            <Route path="/masters/fs-employees" element={<FsListPage kind="employee" />} />
            <Route path="/masters/fs-employees/new" element={<FsFormPage key="employee-new" kind="employee" />} />
            <Route path="/masters/fs-employees/:id/edit" element={<FsFormPage key="employee-edit" kind="employee" />} />
            <Route path="/masters/fs-emp-cur-status" element={<FsListPage kind="status" />} />
            <Route path="/masters/fs-emp-cur-status/new" element={<FsFormPage key="status-new" kind="status" />} />
            <Route path="/masters/fs-emp-cur-status/:id/edit" element={<FsFormPage key="status-edit" kind="status" />} />
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
          <Route path="/drilling/drilling-information" element={<DrillingInformationPage />} />
          <Route path="/drilling/drilling-report" element={<DrillingReportListPage />} />
          <Route path="/drilling/drilling-report/new" element={<DrillingReportFormPage />} />
          <Route path="/drilling/drilling-report/:id/edit" element={<DrillingReportFormPage />} />
          <Route path="/drilling/performance-dashboard" element={<PerformanceDashboardPage />} />
          <Route path="/drilling/operations-analytics" element={<OperationsAnalyticsPage />} />
          <Route path="/drilling/drilling-tripping-analysis" element={<DrillingTrippingAnalysisPage />} />
          <Route path="/drilling/drilling-daily-data" element={<DrillingDailyDataPage />} />
          <Route path="/qhse/activity-monitor" element={<ActivityMonitorPage />} />
          <Route path="/qhse/mis-hse-return" element={<MisHseReturnPage />} />
          <Route path="/qhse/mis-hse-review" element={<MisHseReviewPage />} />
          <Route path="/qhse/hse-drill-record" element={<HseDrillRecordListPage />} />
          <Route path="/qhse/hse-drill-record/new" element={<HseDrillRecordFormPage />} />
          <Route path="/qhse/hse-drill-record/:id/edit" element={<HseDrillRecordFormPage />} />
          <Route path="/qhse/hse-drill-record/:id/details" element={<HseDrillRecordDetailsPage />} />
          <Route path="/qhse/hse-drill-report" element={<HseDrillReportPage />} />
          <Route path="/qhse/leading-indicators" element={<HseLeadingIndicatorsListPage />} />
          <Route path="/qhse/leading-indicators/new" element={<HseLeadingIndicatorsFormPage />} />
          <Route path="/qhse/leading-indicators/:id/edit" element={<HseLeadingIndicatorsFormPage />} />
          <Route path="/qhse/lagging-indicators" element={<HseLaggingIndicatorsListPage />} />
          <Route path="/qhse/lagging-indicators/new" element={<HseLaggingIndicatorsFormPage />} />
          <Route path="/qhse/lagging-indicators/:id/edit" element={<HseLaggingIndicatorsFormPage />} />
          <Route path="/qhse/cert-to-rank-mapping" element={<CertToRankMappingListPage />} />
          <Route path="/qhse/cert-to-rank-mapping/new" element={<CertToRankMappingFormPage />} />
          <Route path="/qhse/cert-to-rank-mapping/:certId/edit" element={<CertToRankMappingFormPage />} />
          <Route path="/qhse/training-report" element={<TrainingReportPage />} />
          <Route path="/qhse/training-log" element={<TrainingLogListPage />} />
          <Route path="/qhse/training-log/new" element={<TrainingLogFormPage />} />
          <Route path="/qhse/training-log/:id/edit" element={<TrainingLogFormPage />} />
          <Route path="/qhse/training-org" element={<TrainingOrgListPage />} />
          <Route path="/qhse/training-org/new" element={<TrainingOrgFormPage />} />
          <Route path="/qhse/training-org/:id/edit" element={<TrainingOrgFormPage />} />
          <Route path="/qhse/training-group" element={<TrainingGroupListPage />} />
          <Route path="/qhse/training-group/new" element={<TrainingGroupFormPage />} />
          <Route path="/qhse/training-group/:id/edit" element={<TrainingGroupFormPage />} />
          <Route path="/qhse/corrective-actions" element={<CorrectiveActionListPage />} />
          <Route path="/qhse/corrective-actions/new" element={<CorrectiveActionFormPage />} />
          <Route path="/qhse/corrective-actions/:id/edit" element={<CorrectiveActionFormPage />} />
          <Route path="/qhse/hse-weekly-drill" element={<HseWeeklyDrillListPage />} />
          <Route path="/qhse/hse-weekly-drill/new" element={<HseWeeklyDrillFormPage />} />
          <Route path="/qhse/hse-weekly-drill/:id/edit" element={<HseWeeklyDrillFormPage />} />
          <Route path="/qhse/activity-closure-analysis" element={<ActivityClosureAnalysisPage />} />
          <Route path="/qhse/incident-details" element={<IncidentDetailsListPage />} />
          <Route path="/qhse/incident-details/new" element={<IncidentDetailsFormPage />} />
          <Route path="/qhse/incident-details/:id/edit" element={<IncidentDetailsFormPage />} />
          <Route path="/qhse/hazard-id-card" element={<HazardIdCardListPage />} />
          <Route path="/qhse/hazard-id-card/new" element={<HazardIdCardFormPage />} />
          <Route path="/qhse/hazard-id-card/:id/edit" element={<HazardIdCardFormPage />} />
          <Route path="/qhse/incident-root-cause" element={<IncidentRootCausePage />} />
          <Route path="/qhse/incident-actions" element={<IncidentActionsPage />} />
          <Route path="/qhse/incident-register" element={<IncidentRegisterPage />} />
          <Route path="/qhse/:slug" element={<MasterCrudPage />} />
          <Route path="/dashboards/rig-utilisation" element={<RigUtilisationDashboardPage />} />
          <Route path="/dashboards/drilling-performance" element={<DrillingPerformanceDashboardPage />} />
          <Route path="/dashboards/fleet-operating-picture" element={<FleetOperatingPicturePage />} />
          <Route path="/dashboards/contract-exposure" element={<ContractExposureDashboardPage />} />
          <Route path="/dashboards/it-asset-overview" element={<ItAssetDashboardPage />} />
          <Route path="/dashboards/npt-analysis" element={<NptAnalysisDashboardPage />} />
          <Route path="/dashboards/incident-dashboard" element={<IncidentDashboardPage />} />
          <Route path="/dashboards/compliance-radar" element={<ComplianceRadarPage />} />
          <Route path="/dashboards/safety-performance" element={<SafetyPerformancePage />} />
          <Route path="/dashboards/fuel-water" element={<FuelWaterPage />} />
          <Route path="/dashboards/rig-moves" element={<RigMovesPage />} />
          <Route path="/reports/incidents" element={<IncidentsPage />} />
          <Route path="/reports/hazard-cards" element={<HazardCardsPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
