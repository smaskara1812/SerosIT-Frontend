// The two FS (field staff) pages — FS Employee and FS Employee Status — share
// one list page and one sectioned form page; this is everything that differs.
const fmtDate = (v) => (v ? v.split('-').reverse().join('/') : '')
const yesNo = (v) => (v === 'Y' ? 'Yes' : 'No')
const pill = (r) => r.fs_emp_active === 'Y'

export const FS_KINDS = {
  employee: {
    schemaKey: 'fs-employees',
    title: 'FS Employee',
    newLabel: 'New FS Employee',
    listPath: '/masters/fs-employees',
    editPath: (id) => `/masters/fs-employees/${id}/edit`,
    newPath: '/masters/fs-employees/new',
    idOf: (r) => r.fs_emp_id,
    nameOf: (r) => r.full_name,
    searchPlaceholder: 'Name, staff no., rank or rig…',
    other: 'status',
    columns: [
      { label: 'Name', render: (r) => r.full_name, bold: true },
      { label: 'Staff No.', render: (r) => r.fs_emp_staff_id ?? '—' },
      { label: 'Rank', render: (r) => r.rank_name },
      { label: 'Category', render: (r) => r.fs_category_name },
      { label: 'Rig', render: (r) => r.rig_name || '—' },
    ],
    activeOf: pill,
    details: [
      ['Employee Type', (r) => r.emp_type_name],
      ['Date of Joining', (r) => fmtDate(r.fs_emp_doj)],
      ['Hire Date', (r) => fmtDate(r.hire_dt)],
      ['Date of Leaving', (r) => fmtDate(r.fs_emp_dol)],
      ['Temporary', (r) => yesNo(r.fs_emp_temporary)],
      ['Key Personnel', (r) => yesNo(r.key_personnel)],
      ['Mobile', (r) => r.fs_emp_mobile_no],
      ['Official Email', (r) => r.fs_emp_email_official],
    ],
  },
  status: {
    schemaKey: 'fs-emp-cur-status',
    title: 'FS Employee Status',
    newLabel: 'New FS Employee Status',
    listPath: '/masters/fs-emp-cur-status',
    editPath: (id) => `/masters/fs-emp-cur-status/${id}/edit`,
    newPath: '/masters/fs-emp-cur-status/new',
    idOf: (r) => r.fs_emp,
    nameOf: (r) => r.fs_emp_name,
    searchPlaceholder: 'Name, rank or rig…',
    other: 'employee',
    columns: [
      { label: 'Employee', render: (r) => r.fs_emp_name, bold: true },
      { label: 'Rank', render: (r) => r.rank_name },
      { label: 'Category', render: (r) => r.fs_category_name },
      { label: 'Service', render: (r) => `${r.serv_type_name} · ${r.serv_subtype_name}` },
      { label: 'Rig', render: (r) => r.rig_name || '—' },
    ],
    activeOf: pill,
    details: [
      ['Employee Type', (r) => r.emp_type_name],
      ['Service Subtype From', (r) => fmtDate(r.serv_subtype_from)],
      ['Approx. End Date', (r) => fmtDate(r.appx_end_dt)],
      ['Crew Shift', (r) => r.crew_shift],
      ['Current Rank From', (r) => fmtDate(r.cur_rank_from)],
      ['Wage Process Date', (r) => fmtDate(r.wage_process_dt)],
      ['Date of Leaving', (r) => fmtDate(r.fs_emp_dol)],
    ],
  },
}
