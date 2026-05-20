import { useState, DragEvent, ChangeEvent } from 'react'
import { Upload, X, File, CheckCircle2 } from 'lucide-react'

interface Document {
  id: string | number
  name: string
  size: string
  file?: File
  uploadedDate?: string
  uploadedBy?: string
}

interface DocumentUploadProps {
  onFilesUploaded?: (files: Document[]) => void
  existingDocuments?: Document[]
}

const DocumentUpload = ({
  onFilesUploaded,
  existingDocuments = [],
}: DocumentUploadProps) => {
  const [dragActive, setDragActive] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<Document[]>([])

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files))
    }
  }

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files))
    }
  }

  const handleFiles = (files: File[]) => {
    const newFiles: Document[] = files.map((file) => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: formatFileSize(file.size),
      file: file,
      uploadedDate: new Date().toISOString(),
      uploadedBy: 'Current User', // In real app, get from auth context
    }))

    setUploadedFiles((prev) => [...prev, ...newFiles])
    if (onFilesUploaded) {
      onFilesUploaded([...uploadedFiles, ...newFiles])
    }
  }

  const handleRemoveFile = (fileId: string | number) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const allDocuments = [...existingDocuments, ...uploadedFiles]

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 bg-gray-50'
        }`}
      >
        <Upload
          size={48}
          className={`mx-auto mb-4 ${
            dragActive ? 'text-primary-500' : 'text-gray-400'
          }`}
        />
        <p className="text-sm text-gray-600 mb-2">
          <span className="font-medium text-primary-600">Click to upload</span>{' '}
          or drag and drop
        </p>
        <p className="text-xs text-gray-500 mb-4">
          PDF, DOC, DOCX, JPG, PNG (max. 10MB per file)
        </p>
        <input
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          onChange={handleFileInput}
          className="hidden"
          id="document-upload"
        />
        <label htmlFor="document-upload" className="inline-block">
          <button
            type="button"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
          >
            Select Files
          </button>
        </label>
      </div>

      {/* Uploaded Documents List */}
      {allDocuments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">
            Uploaded Documents ({allDocuments.length})
          </h4>
          <div className="space-y-2">
            {allDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    <File size={20} className="text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {doc.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-500">{doc.size}</p>
                      {doc.uploadedBy && (
                        <>
                          <span className="text-xs text-gray-400">•</span>
                          <p className="text-xs text-gray-500">
                            {doc.uploadedBy}
                          </p>
                        </>
                      )}
                      {doc.uploadedDate && (
                        <>
                          <span className="text-xs text-gray-400">•</span>
                          <p className="text-xs text-gray-500">
                            {new Date(doc.uploadedDate).toLocaleDateString(
                              'en-US',
                              {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              }
                            )}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  {doc.uploadedDate && (
                    <div className="flex-shrink-0 ml-2">
                      <CheckCircle2 size={16} className="text-green-600" />
                    </div>
                  )}
                </div>
                {!existingDocuments.find((d) => d.id === doc.id) && (
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(doc.id)}
                    className="ml-3 p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Remove file"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default DocumentUpload

