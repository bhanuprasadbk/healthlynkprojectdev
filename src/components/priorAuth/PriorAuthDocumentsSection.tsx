import { ChangeEvent, DragEvent, useRef, useState } from 'react'
import { Check, FileText, Upload, X } from 'lucide-react'
import type { PriorAuthDetailDocument } from './priorAuthTypes'
import { PRIOR_AUTH_DOCUMENT_SLOTS } from './priorAuthDocumentSlots'
import type { PriorAuthSubmissionChecklistItem } from './priorAuthDocumentSlots'
import PriorAuthSubmissionChecklist from './PriorAuthSubmissionChecklist'

type PriorAuthDocumentsSectionProps = {
  documents: PriorAuthDetailDocument[]
  checklist?: PriorAuthSubmissionChecklistItem[]
  checklistTitle?: string
  primaryColor: string
  isLoading?: boolean
  onDocumentsChange: (docs: PriorAuthDetailDocument[]) => void
}

const PriorAuthDocumentsSection = ({
  documents,
  checklist,
  checklistTitle = 'Submission checklist',
  primaryColor,
  isLoading = false,
  onDocumentsChange,
}: PriorAuthDocumentsSectionProps) => {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const uploadFile = (docId: string, file: File) => {
    onDocumentsChange(
      documents.map((d) =>
        d.id === docId
          ? {
              ...d,
              uploaded: true,
              fileName: file.name,
              meta: `Uploaded · ${file.name}`,
            }
          : d
      )
    )
  }

  const removeFile = (docId: string) => {
    const original = PRIOR_AUTH_DOCUMENT_SLOTS.find((s) => s.id === docId)
    onDocumentsChange(
      documents.map((d) =>
        d.id === docId
          ? { ...d, uploaded: false, fileName: undefined, meta: original?.meta ?? d.meta }
          : d
      )
    )
  }

  const handleDrop = (docId: string, e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOverId(null)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(docId, file)
  }

  const tagClass = (required: boolean) =>
    required
      ? 'bg-red-100 text-red-800'
      : 'bg-slate-100 text-slate-600'

  if (isLoading) {
    return <p className="text-sm text-slate-500 py-4">Loading documents...</p>
  }

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 bg-slate-50">
        <FileText size={15} style={{ color: primaryColor }} />
        <h4 className="text-[13px] font-semibold text-slate-800">Required documents</h4>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {documents.map((doc) => {
            const isDragOver = dragOverId === doc.id
            return (
              <div key={doc.id}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[13px] font-medium text-slate-800">{doc.name}</span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tagClass(doc.required)}`}
                  >
                    {doc.required ? 'Required' : 'Optional'}
                  </span>
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => !doc.uploaded && inputRefs.current[doc.id]?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !doc.uploaded) inputRefs.current[doc.id]?.click()
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOverId(doc.id)
                  }}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={(e) => handleDrop(doc.id, e)}
                  className={`relative rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors ${
                    doc.uploaded
                      ? 'border-green-200 bg-green-50/60'
                      : isDragOver
                        ? 'border-sky-400 bg-sky-50'
                        : 'border-slate-300 bg-white hover:border-sky-300 hover:bg-slate-50'
                  } ${doc.uploaded ? '' : 'cursor-pointer'}`}
                >
                  {doc.uploaded ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                        <Check size={18} className="text-green-700" strokeWidth={2.5} />
                      </div>
                      <p className="text-[13px] font-medium text-slate-800 truncate max-w-full px-2">
                        {doc.fileName}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile(doc.id)
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 hover:text-red-700"
                      >
                        <X size={12} />
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                      <p className="text-[13px] text-slate-600">
                        <span className="font-medium" style={{ color: primaryColor }}>
                          Browse
                        </span>{' '}
                        or drag &amp; drop
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">{doc.meta}</p>
                    </>
                  )}
                  <input
                    ref={(el) => {
                      inputRefs.current[doc.id] = el
                    }}
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const file = e.target.files?.[0]
                      if (file) uploadFile(doc.id, file)
                      e.target.value = ''
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {checklist && checklist.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-200">
            <PriorAuthSubmissionChecklist
              items={checklist}
              primaryColor={primaryColor}
              title={checklistTitle}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default PriorAuthDocumentsSection
