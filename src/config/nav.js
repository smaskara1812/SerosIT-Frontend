import {
  IconDashboard,
  IconShield,
  IconUsers,
  IconHistory,
  IconLayers,
  IconHome,
  IconPlusCircle,
  IconBriefcase,
  IconAward,
  IconMail,
  IconStar,
  IconChevronsUp,
  IconTag,
  IconClipboard,
  IconPlane,
  IconGitBranch,
  IconWrench,
  IconExposure,
  IconActivity,
  IconTrendingUp,
  IconPerson,
  IconShieldCheck,
  IconFlask,
  IconAlertTriangle,
  IconLink,
  IconFileSignature,
  IconUserCheck,
} from '@/components/icons'

// Two-tier nav: leaf items render directly in the primary sidebar; a parent
// with `sections` gets one primary-sidebar entry, and its sections render in
// the secondary sidebar (each optionally its own collapsible header, e.g.
// Masters' "General" group) whenever the current route is under it.
//
// `menuKey` on a leaf item is the sys_menu / User Rights permission key —
// items without one (Dashboard, Admin's own pages) aren't permission-gated;
// items with one only show for users who can view that key (see
// lib/permissions.js `can()`).
export const navTree = [
  { key: 'dashboard', label: 'Dashboard', path: '/', icon: IconDashboard },
  {
    key: 'masters',
    label: 'Masters',
    path: '/masters',
    icon: IconLayers,
    sections: [
      {
        label: 'General',
        items: [
          {
            key: 'rigs',
            label: 'Rigs',
            path: '/masters/rigs',
            icon: IconHome,
            menuKey: 'masters.rigs',
          },
          {
            key: 'cost_centres',
            label: 'Cost Centres',
            path: '/masters/cost-centres',
            icon: IconPlusCircle,
            menuKey: 'masters.cost_centres',
          },
          {
            key: 'cost_centre_types',
            label: 'Cost Centre Types',
            path: '/masters/cost-centre-types',
            icon: IconHome,
            menuKey: 'masters.cost_centre_types',
          },
          {
            key: 'operators',
            label: 'Operators',
            path: '/masters/operators',
            icon: IconUsers,
            menuKey: 'masters.operators',
          },
          {
            key: 'contractors',
            label: 'Contractors',
            path: '/masters/contractors',
            icon: IconBriefcase,
            menuKey: 'masters.contractors',
          },
          {
            key: 'cert_institutes',
            label: 'Cert Institutes',
            path: '/masters/cert-institutes',
            icon: IconAward,
            menuKey: 'masters.cert_institutes',
          },
          {
            key: 'email_notification_types',
            label: 'Email Notification Types',
            path: '/masters/email-notification-types',
            icon: IconMail,
            menuKey: 'masters.email_notification_types',
          },
        ],
      },
      {
        label: 'HR',
        items: [
          {
            key: 'competency',
            label: 'Competency',
            path: '/masters/competency',
            icon: IconStar,
            menuKey: 'masters.competency',
          },
          {
            key: 'fs_categories',
            label: 'Fs Categories',
            path: '/masters/fs-categories',
            icon: IconTag,
            menuKey: 'masters.fs_categories',
          },
          {
            key: 'ranks',
            label: 'Ranks',
            path: '/masters/ranks',
            icon: IconChevronsUp,
            menuKey: 'masters.ranks',
          },
          {
            key: 'job_descriptions',
            label: 'Job Descriptions',
            path: '/masters/job-descriptions',
            icon: IconClipboard,
            menuKey: 'masters.job_descriptions',
          },
          {
            key: 'travel_eligibility',
            label: 'Travel Eligibility',
            path: '/masters/travel-eligibility',
            icon: IconPlane,
            menuKey: 'masters.travel_eligibility',
          },
          {
            key: 'reporting_structure',
            label: 'Reporting Structure',
            path: '/masters/reporting-structure',
            icon: IconGitBranch,
            menuKey: 'masters.reporting_structure',
          },
        ],
      },
      {
        label: 'QHSE',
        items: [
          {
            key: 'rig_operations',
            label: 'Rig Operation',
            path: '/masters/rig-operations',
            icon: IconWrench,
            menuKey: 'masters.rig_operations',
          },
          {
            key: 'contact_exposure_types',
            label: 'Contact Exposure Type',
            path: '/masters/contact-exposure-types',
            icon: IconExposure,
            menuKey: 'masters.contact_exposure_types',
          },
          {
            key: 'indicator_types',
            label: 'Indicator Type',
            path: '/masters/indicator-types',
            icon: IconActivity,
            menuKey: 'masters.indicator_types',
          },
          {
            key: 'indicator_subtypes',
            label: 'Indicator Subtype',
            path: '/masters/indicator-subtypes',
            icon: IconTrendingUp,
            menuKey: 'masters.indicator_subtypes',
          },
          {
            key: 'parts_of_body',
            label: 'Parts Of Body',
            path: '/masters/parts-of-body',
            icon: IconPerson,
            menuKey: 'masters.parts_of_body',
          },
          {
            key: 'qhse_categories',
            label: 'QHSE Category',
            path: '/masters/qhse-categories',
            icon: IconShieldCheck,
            menuKey: 'masters.qhse_categories',
          },
          {
            key: 'hse_activities',
            label: 'HSE Activity',
            path: '/masters/hse-activities',
            icon: IconActivity,
            menuKey: 'masters.hse_activities',
          },
          {
            key: 'hse_consumables',
            label: 'HSE Consumable',
            path: '/masters/hse-consumables',
            icon: IconFlask,
            menuKey: 'masters.hse_consumables',
          },
          {
            key: 'hazard_types',
            label: 'Hazard Type',
            path: '/masters/hazard-types',
            icon: IconAlertTriangle,
            menuKey: 'masters.hazard_types',
          },
        ],
      },
      {
        label: 'Mapping',
        items: [
          {
            key: 'user_rig_mapping',
            label: 'User Rig Mapping',
            path: '/masters/user-rig-mapping',
            icon: IconLink,
            menuKey: 'masters.user_rig_mapping',
          },
          {
            key: 'user_category_mapping',
            label: 'User Category Mapping',
            path: '/masters/user-category-mapping',
            icon: IconLink,
            menuKey: 'masters.user_category_mapping',
          },
          {
            key: 'doc_to_sign_mapping',
            label: 'Document To Sign Mapping',
            path: '/masters/doc-to-sign-mapping',
            icon: IconFileSignature,
            menuKey: 'masters.doc_to_sign_mapping',
          },
          {
            key: 'interviewer_mapping',
            label: 'Department To Interviewer Mapping',
            path: '/masters/interviewer-mapping',
            icon: IconUserCheck,
            menuKey: 'masters.interviewer_mapping',
          },
        ],
      },
      {
        label: 'Projects',
        items: [
          {
            key: 'project_contract',
            label: 'Project Contract',
            path: '/masters/project-contract',
            icon: IconBriefcase,
            menuKey: 'masters.project_contract',
          },
          {
            key: 'project_drilling_rates',
            label: 'Project Drilling Rates',
            path: '/masters/project-drilling-rates',
            icon: IconTrendingUp,
            menuKey: 'masters.project_drilling_rates',
          },
        ],
      },
      {
        label: 'Drilling',
        items: [
          {
            key: 'drilling_operations',
            label: 'Drilling Operations',
            path: '/masters/drilling-operations',
            icon: IconWrench,
            menuKey: 'masters.drilling_operations',
          },
          {
            key: 'drilling_sections',
            label: 'Drilling Sections',
            path: '/masters/drilling-sections',
            icon: IconLayers,
            menuKey: 'masters.drilling_sections',
          },
        ],
      },
    ],
  },
  {
    key: 'admin',
    label: 'Admin',
    icon: IconShield,
    adminOnly: true,
    sections: [
      {
        items: [
          { key: 'user_rights', label: 'User Rights', path: '/admin/user-rights', icon: IconShield },
          {
            key: 'user_management', label: 'User Management', path: '/admin/user-management', icon: IconUsers, 
            menuKey: 'admin.user_management'},
          { key: 'audit_trail', label: 'Audit Trail', path: '/admin/audit-trail', icon: IconHistory },
        ],
      },
    ],
  },
]

// Every leaf page that resolves to a real route, for Topbar breadcrumb
// lookups — parents themselves aren't routes, only their sections' items are.
export const navSections = navTree.flatMap((item) =>
  item.sections ? item.sections.flatMap((s) => s.items) : [item]
)
