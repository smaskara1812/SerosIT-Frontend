import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { FS_KINDS } from './fsKinds'

// Opens an FS employee's status record: straight to it when one exists,
// otherwise (if the user may add one) to a new status with the employee
// already filled in.
export async function openEmployeeStatus(navigate, employeeId, employeeName, canAddStatus) {
  const res = await apiFetch(`/api/masters/fs-emp-cur-status/${employeeId}/`)
  if (res.ok) return navigate(FS_KINDS.status.editPath(employeeId))
  if (res.status === 404 && canAddStatus) {
    return navigate(`${FS_KINDS.status.newPath}?employee=${employeeId}&name=${encodeURIComponent(employeeName || '')}`)
  }
  if (res.status === 404) return toast.info('This employee has no status record yet.')
  toast.error("Couldn't open the status. Please try again.")
}
