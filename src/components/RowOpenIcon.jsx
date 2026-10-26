import { Eye, Pencil } from 'lucide-react'

// The icon of a row's "open this record" button: a pencil for someone who can edit the record, an eye for someone who can only look.
export default function RowOpenIcon({ canEdit, ...props }) {
  const Icon = canEdit ? Pencil : Eye
  return <Icon {...props} />
}
