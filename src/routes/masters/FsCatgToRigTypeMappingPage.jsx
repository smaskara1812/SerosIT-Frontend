import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { RemoteCombobox } from './MasterCrudPage'
import { IconChevronLeft } from '@/components/icons'

const MENU_KEY = 'masters.fs_catg_to_rig_type_mapping'
const API = '/api/masters/fs-catg-to-rig-type-mapping/'

const CATEGORY_FIELD = {
  type: 'select-remote',
  remote: '/api/masters/fs-categories/',
  optionLabel: 'fs_category_name',
  optionValue: 'fs_category_id',
  labelField: 'fs_category_name',
}

function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
        checked ? 'bg-[#1a3f7a]' : 'bg-muted-foreground/25'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`}
      />
    </button>
  )
}

export default function FsCatgToRigTypeMappingPage() {
  const { user } = useAuth()
  const canEdit = can(user, MENU_KEY, 'edit') || can(user, MENU_KEY, 'add')

  const [rigTypes, setRigTypes] = useState([])
  const [categoryId, setCategoryId] = useState(null)
  const [categoryLabel, setCategoryLabel] = useState('')
  const [mappings, setMappings] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  // Toggling only changes this local draft — nothing is sent to the server
  // until Update is clicked, so a click doesn't silently persist.
  const [pending, setPending] = useState({})

  useEffect(() => {
    apiFetch('/api/masters/rig-types/?page_size=200')
      .then((r) => r.json())
      .then((data) => setRigTypes(Array.isArray(data) ? data : data.results || []))
  }, [])

  function loadMappings(catId) {
    setLoading(true)
    apiFetch(`${API}?fs_category=${catId}&page_size=200`)
      .then((r) => r.json())
      .then((data) => setMappings(Array.isArray(data) ? data : data.results || []))
      .finally(() => setLoading(false))
  }

  function onCategoryChange(id) {
    setCategoryId(id)
    setMappings(null)
    setPending({})
    if (id) loadMappings(id)
  }

  function setDraftChecked(rigTypeId, next) {
    setPending((prev) => ({ ...prev, [rigTypeId]: next }))
  }

  const hasChanges = Object.keys(pending).length > 0

  async function saveChanges() {
    setSaving(true)
    try {
      const results = await Promise.all(
        Object.entries(pending).map(async ([rigTypeId, nextChecked]) => {
          const existing = mappings.find((m) => m.rig_type === Number(rigTypeId))
          if (existing) {
            const res = await apiFetch(`${API}${existing.fs_catg_to_rig_type_mapping_id}/`, {
              method: 'PATCH',
              body: JSON.stringify({ mapping_active: nextChecked ? 'Y' : 'N' }),
            })
            return res.ok
          }
          const res = await apiFetch(API, {
            method: 'POST',
            body: JSON.stringify({
              fs_category: categoryId,
              rig_type: Number(rigTypeId),
              mapping_active: nextChecked ? 'Y' : 'N',
            }),
          })
          return res.ok
        })
      )
      if (results.every(Boolean)) {
        toast.success('Mapping updated')
        setPending({})
        loadMappings(categoryId)
      } else {
        toast.error('Some changes failed to save')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <Link
        to="/masters"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <IconChevronLeft className="h-4 w-4" />
        All Masters
      </Link>

      <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-card p-5">
        <div className="mx-auto max-w-xl">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Category To Rig Type Mapping
          </p>

          <div className="mb-6 flex flex-col gap-1.5">
            <Label>Category</Label>
            <RemoteCombobox
              field={CATEGORY_FIELD}
              value={categoryId}
              onChange={(v, raw) => {
                onCategoryChange(v)
                setCategoryLabel(raw?.fs_category_name || '')
              }}
              labelValue={categoryLabel}
            />
          </div>

          {categoryId && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Rig Types
                </p>
                {hasChanges && (
                  <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                    Unsaved changes
                  </span>
                )}
              </div>
              {loading || mappings === null ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (
                <>
                  <div className="divide-y divide-border rounded-xl border border-border">
                    {rigTypes.map((rt) => {
                      const existing = mappings.find((m) => m.rig_type === rt.rig_type_id)
                      const saved = existing?.mapping_active === 'Y'
                      const isDraft = Object.prototype.hasOwnProperty.call(pending, rt.rig_type_id)
                      const checked = isDraft ? pending[rt.rig_type_id] : saved
                      return (
                        <div
                          key={rt.rig_type_id}
                          className={`flex items-center justify-between px-4 py-3 ${isDraft ? 'bg-amber-50 dark:bg-amber-950/20' : ''}`}
                        >
                          <span className="text-sm font-medium text-foreground">{rt.rig_type_name}</span>
                          <ToggleSwitch
                            checked={checked}
                            disabled={!canEdit || saving}
                            onChange={(next) => setDraftChecked(rt.rig_type_id, next)}
                          />
                        </div>
                      )
                    })}
                  </div>
                  {canEdit && (
                    <div className="mt-4 flex justify-end">
                      <Button size="sm" disabled={!hasChanges || saving} onClick={saveChanges}>
                        {saving ? 'Updating…' : 'Update'}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
