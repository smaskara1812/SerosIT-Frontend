import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  IconSearch,
  IconChevronLeft,
  IconPlus,
  IconTrash,
  IconCheck,
  IconX,
} from '@/components/icons'

const MENU_KEY = 'masters.job_descriptions'

function IconPencil(props) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  )
}

/** A single detail line: plain text by default, becomes a textarea + Save/Cancel on Edit. */
function DetailLine({ line, canEdit, canDelete, onSave, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(line.jd_dtl_description)
  const [saving, setSaving] = useState(false)

  function cancel() {
    setText(line.jd_dtl_description)
    setEditing(false)
  }

  async function save() {
    setSaving(true)
    await onSave(line.jd_dtl_id, text)
    setSaving(false)
    setEditing(false)
  }

  if (!editing) {
    return (
      <div className="group flex items-start justify-between gap-3 rounded-lg px-2.5 py-2 hover:bg-muted/50">
        <p className="flex-1 text-sm leading-relaxed text-foreground">{line.jd_dtl_description}</p>
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {canEdit && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Edit line"
            >
              <IconPencil className="h-3.5 w-3.5" />
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(line.jd_dtl_id)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label="Delete line"
            >
              <IconTrash className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-[#1a3f7a]/30 bg-[#eef3fb]/40 p-2.5">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
        rows={3}
        className="bg-background"
      />
      <div className="mt-2 flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={cancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={save} disabled={saving || !text.trim()}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  )
}

function SectionCard({ index, section, canAdd, canEdit, canDelete, onRefresh }) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [title, setTitle] = useState(section.jd_hdr_description)
  const [savingTitle, setSavingTitle] = useState(false)
  const [addingLine, setAddingLine] = useState(false)
  const [newLine, setNewLine] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function saveTitle() {
    setSavingTitle(true)
    const res = await apiFetch(`/api/masters/job-description-headers/${section.jd_hdr_id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ jd_hdr_description: title }),
    })
    setSavingTitle(false)
    if (res.ok) {
      setEditingTitle(false)
      toast.success('Section renamed')
      onRefresh()
    } else {
      toast.error('Failed to rename section')
    }
  }

  async function deleteSection() {
    const res = await apiFetch(`/api/masters/job-description-headers/${section.jd_hdr_id}/`, {
      method: 'DELETE',
    })
    if (res.status === 204) {
      toast.success('Section deleted')
      onRefresh()
    } else {
      toast.error('Failed to delete section')
    }
  }

  async function saveLine(id, text) {
    const res = await apiFetch(`/api/masters/job-description-details/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ jd_dtl_description: text }),
    })
    if (res.ok) {
      toast.success('Line updated')
      onRefresh()
    } else {
      toast.error('Failed to update line')
    }
  }

  async function deleteLine(id) {
    const res = await apiFetch(`/api/masters/job-description-details/${id}/`, {
      method: 'DELETE',
    })
    if (res.status === 204) {
      onRefresh()
    } else {
      toast.error('Failed to delete line')
    }
  }

  async function addLine() {
    if (!newLine.trim()) return
    const res = await apiFetch('/api/masters/job-description-details/', {
      method: 'POST',
      body: JSON.stringify({
        header: section.jd_hdr_id,
        jd_dtl_description: newLine,
        jd_dtl_order: section.details.length + 1,
      }),
    })
    if (res.ok) {
      setNewLine('')
      setAddingLine(false)
      onRefresh()
    } else {
      toast.error('Failed to add line')
    }
  }

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-2.5 border-b border-border bg-muted/30 px-4 py-2.5">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1a3f7a] text-[10px] font-bold text-white">
          {index + 1}
        </span>

        {!editingTitle ? (
          <>
            <h3 className="flex-1 text-sm font-semibold text-foreground">
              {section.jd_hdr_description}
            </h3>
            {canEdit && (
              <button
                type="button"
                onClick={() => setEditingTitle(true)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Rename section"
              >
                <IconPencil className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        ) : (
          <>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="h-8 flex-1"
            />
            <button
              type="button"
              onClick={() => {
                setTitle(section.jd_hdr_description)
                setEditingTitle(false)
              }}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            >
              <IconX className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={saveTitle}
              disabled={savingTitle || !title.trim()}
              className="flex h-7 w-7 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50"
            >
              <IconCheck className="h-3.5 w-3.5" />
            </button>
          </>
        )}

        {canDelete && !editingTitle && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Delete section"
          >
            <IconTrash className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="p-2">
        {section.details.length === 0 && !addingLine && (
          <p className="px-2.5 py-2 text-sm text-muted-foreground">No lines yet.</p>
        )}
        {section.details.map((line) => (
          <DetailLine
            key={line.jd_dtl_id}
            line={line}
            canEdit={canEdit}
            canDelete={canDelete}
            onSave={saveLine}
            onDelete={deleteLine}
          />
        ))}

        {canAdd && !addingLine && (
          <button
            type="button"
            onClick={() => setAddingLine(true)}
            className="mt-1 flex w-full items-center gap-1.5 rounded-lg border border-dashed border-border px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:border-[#1a3f7a]/40 hover:text-[#1a3f7a]"
          >
            <IconPlus className="h-3.5 w-3.5" />
            Add a line
          </button>
        )}
        {addingLine && (
          <div className="mt-1 rounded-lg border border-[#1a3f7a]/30 bg-[#eef3fb]/40 p-2.5">
            <Textarea
              value={newLine}
              onChange={(e) => setNewLine(e.target.value)}
              autoFocus
              rows={3}
              placeholder="New line…"
              className="bg-background"
            />
            <div className="mt-2 flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setNewLine('')
                  setAddingLine(false)
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={addLine} disabled={!newLine.trim()}>
                Add
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this section?</DialogTitle>
            <DialogDescription>
              "{section.jd_hdr_description}" and its {section.details.length} line
              {section.details.length === 1 ? '' : 's'} will be removed. This can't be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteSection}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function JobDescriptionsPage() {
  const { user } = useAuth()
  const canAdd = can(user, MENU_KEY, 'add')
  const canEdit = can(user, MENU_KEY, 'edit')
  const canDelete = can(user, MENU_KEY, 'delete')

  const [ranks, setRanks] = useState([])
  const [query, setQuery] = useState('')
  const [selectedRank, setSelectedRank] = useState(null)
  const [sections, setSections] = useState([])
  const [loadingRanks, setLoadingRanks] = useState(true)
  const [loadingSections, setLoadingSections] = useState(false)
  const [addingSection, setAddingSection] = useState(false)
  const [newSectionTitle, setNewSectionTitle] = useState('')

  useEffect(() => {
    // The rank picker is a search-as-you-type list, not a paginated browse
    // view, so it needs the whole set — ask for a bigger page than the
    // default (Ranks list endpoint is otherwise server-paginated).
    apiFetch('/api/masters/ranks/?page_size=500')
      .then((r) => r.json())
      .then((data) => setRanks(Array.isArray(data) ? data : data.results || []))
      .finally(() => setLoadingRanks(false))
  }, [])

  function loadSections(rankId) {
    setLoadingSections(true)
    return apiFetch(`/api/masters/job-description-headers/?rank=${rankId}`)
      .then((r) => r.json())
      .then((data) => setSections(Array.isArray(data) ? data : data.results || []))
      .finally(() => setLoadingSections(false))
  }

  function selectRank(rank) {
    setSelectedRank(rank)
    setAddingSection(false)
    loadSections(rank.rank_id)
  }

  async function addSection() {
    if (!newSectionTitle.trim() || !selectedRank) return
    const res = await apiFetch('/api/masters/job-description-headers/', {
      method: 'POST',
      body: JSON.stringify({
        rank: selectedRank.rank_id,
        jd_hdr_description: newSectionTitle,
        jd_hdr_order: sections.length + 1,
      }),
    })
    if (res.ok) {
      setNewSectionTitle('')
      setAddingSection(false)
      toast.success('Section added')
      loadSections(selectedRank.rank_id)
    } else {
      toast.error('Failed to add section')
    }
  }

  const filtered = query
    ? ranks.filter((r) => r.rank_name.toLowerCase().includes(query.toLowerCase()))
    : ranks

  return (
    <div className="flex h-full flex-col gap-3">
      <Link
        to="/masters"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <IconChevronLeft className="h-4 w-4" />
        All Masters
      </Link>
      <div className="flex flex-1 gap-5 overflow-hidden">
        <div className="flex w-[300px] shrink-0 flex-col rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between p-3 pb-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Ranks
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">
              {ranks.length}
            </span>
          </div>
          <div className="px-3 pb-3">
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search ranks…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 pl-8"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto border-t border-border">
            {loadingRanks && <p className="p-4 text-sm text-muted-foreground">Loading…</p>}
            {filtered.map((r) => (
              <button
                key={r.rank_id}
                type="button"
                onClick={() => selectRank(r)}
                className={`flex w-full flex-col border-b border-border/60 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-accent ${
                  selectedRank?.rank_id === r.rank_id ? 'bg-accent' : ''
                }`}
              >
                <span className="text-[13px] font-semibold text-foreground">{r.rank_name}</span>
                <span className="text-[11px] text-muted-foreground">{r.fs_category_name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-card p-4">
          {!selectedRank && (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Select a rank to view its job description.
            </div>
          )}
          {selectedRank && (
            <>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    {selectedRank.rank_name}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {sections.length} section{sections.length === 1 ? '' : 's'}
                  </p>
                </div>
                {canAdd && !addingSection && (
                  <Button size="sm" onClick={() => setAddingSection(true)}>
                    <IconPlus className="h-3.5 w-3.5" />
                    Add Section
                  </Button>
                )}
              </div>

              {addingSection && (
                <div className="mb-4 rounded-2xl border border-[#1a3f7a]/30 bg-[#eef3fb]/40 p-3">
                  <Label className="mb-1.5 block text-xs font-semibold text-[#1a3f7a]">
                    New section title
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="e.g. Position Summary"
                      value={newSectionTitle}
                      onChange={(e) => setNewSectionTitle(e.target.value)}
                      autoFocus
                      className="h-9 flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setNewSectionTitle('')
                        setAddingSection(false)
                      }}
                    >
                      Cancel
                    </Button>
                    <Button size="sm" onClick={addSection} disabled={!newSectionTitle.trim()}>
                      Add
                    </Button>
                  </div>
                </div>
              )}

              {loadingSections && <p className="text-sm text-muted-foreground">Loading…</p>}
              {!loadingSections && sections.length === 0 && !addingSection && (
                <p className="mb-3 text-sm text-muted-foreground">
                  No sections yet for this rank.
                </p>
              )}
              {!loadingSections &&
                sections.map((s, i) => (
                  <SectionCard
                    key={s.jd_hdr_id}
                    index={i}
                    section={s}
                    canAdd={canAdd}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    onRefresh={() => loadSections(selectedRank.rank_id)}
                  />
                ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
