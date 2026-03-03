'use client'

import { useState, useRef, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft, Upload, FileText, CheckCircle, AlertCircle, X, Loader2 } from 'lucide-react'
import { DashboardLayout } from '@/app/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { candidatesApi } from '@/lib/api-client'
import { toast } from '@/hooks/use-toast'

interface ImportResult {
  imported: number
  failed: number
  errors: Array<{ row: number; message: string }>
}

const SAMPLE_CSV = `name,phone,email,currentRole,yearsOfExperience,timezone
Priya Sharma,+91 98765 43210,priya@example.com,Backend Engineer,5,Asia/Kolkata
Rahul Verma,+91 91234 56789,rahul@example.com,Full Stack Developer,7,Asia/Kolkata
Ananya Singh,+91 87654 32109,ananya@example.com,Frontend Engineer,3,Asia/Kolkata`

export default function ImportCandidatesPage() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  const estimateRowCount = (file: File): string => {
    const sizeKb = file.size / 1024
    if (sizeKb < 1) return '< 10 rows'
    return `~${Math.round(sizeKb * 20)} rows (estimate)`
  }

  const importMutation = useMutation({
    mutationFn: (file: File) => candidatesApi.importCsv(file),
    onSuccess: (data: ImportResult) => {
      setImportResult(data)
      toast({
        title: 'Import complete',
        description: `${data.imported} candidates imported, ${data.failed} failed.`,
        variant: data.failed > 0 ? 'destructive' : 'default',
      })
      queryClient.invalidateQueries({ queryKey: ['candidates'] })
    },
    onError: (err: Error) => {
      toast({ title: 'Import failed', description: err.message, variant: 'destructive' })
    },
  })

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a .csv file.',
        variant: 'destructive',
      })
      return
    }
    setSelectedFile(file)
    setImportResult(null)
  }

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [])

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = () => setIsDragging(false)

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleSubmit = () => {
    if (!selectedFile) return
    importMutation.mutate(selectedFile)
  }

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sample_candidates.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/candidates">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Import Candidates</h1>
            <p className="text-sm text-gray-500">Bulk upload candidates from a CSV file</p>
          </div>
        </div>

        {/* Format Guide */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>CSV Format Guide</CardTitle>
              <Button variant="outline" size="sm" onClick={downloadSample}>
                Download Sample
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">
              Your CSV file should have the following columns (first row as header):
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-2 font-medium text-gray-600">Column</th>
                    <th className="px-4 py-2 font-medium text-gray-600">Required</th>
                    <th className="px-4 py-2 font-medium text-gray-600">Example</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[
                    { col: 'name', req: true, ex: 'Priya Sharma' },
                    { col: 'phone', req: true, ex: '+91 98765 43210' },
                    { col: 'email', req: false, ex: 'priya@example.com' },
                    { col: 'currentRole', req: false, ex: 'Backend Engineer' },
                    { col: 'yearsOfExperience', req: false, ex: '5' },
                    { col: 'timezone', req: false, ex: 'Asia/Kolkata' },
                  ].map((row) => (
                    <tr key={row.col}>
                      <td className="px-4 py-2">
                        <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                          {row.col}
                        </code>
                      </td>
                      <td className="px-4 py-2">
                        {row.req ? (
                          <span className="text-red-500 font-medium text-xs">Required</span>
                        ) : (
                          <span className="text-gray-400 text-xs">Optional</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-gray-500 text-xs">{row.ex}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-md bg-gray-50 p-3">
              <p className="mb-1 text-xs font-medium text-gray-500">Sample CSV preview:</p>
              <pre className="overflow-x-auto text-xs text-gray-700 whitespace-pre">
                {SAMPLE_CSV}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Upload Zone */}
        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-12 transition-colors ${
                isDragging
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
              }`}
            >
              <Upload className={`mb-3 h-8 w-8 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
              <p className="text-sm font-medium text-gray-700">
                {isDragging ? 'Drop your CSV file here' : 'Drag & drop your CSV file here'}
              </p>
              <p className="mt-1 text-xs text-gray-400">or click to browse</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileInput}
              />
            </div>

            {selectedFile && (
              <div className="flex items-center justify-between rounded-lg border bg-white px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-xs text-gray-400">
                      {(selectedFile.size / 1024).toFixed(1)} KB &bull;{' '}
                      {estimateRowCount(selectedFile)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedFile(null)
                    setImportResult(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={!selectedFile || importMutation.isPending}
                className="gap-2"
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Import Candidates
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Import Results */}
        {importResult && (
          <Card>
            <CardHeader>
              <CardTitle>Import Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-4">
                  <CheckCircle className="h-6 w-6 text-emerald-500" />
                  <div>
                    <p className="text-2xl font-bold text-emerald-700">{importResult.imported}</p>
                    <p className="text-sm text-emerald-600">Successfully imported</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-red-50 p-4">
                  <AlertCircle className="h-6 w-6 text-red-500" />
                  <div>
                    <p className="text-2xl font-bold text-red-700">{importResult.failed}</p>
                    <p className="text-sm text-red-600">Failed rows</p>
                  </div>
                </div>
              </div>

              {importResult.errors && importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Errors:</p>
                  <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg border bg-red-50 p-3">
                    {importResult.errors.map((err, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className="shrink-0 rounded bg-red-200 px-1.5 py-0.5 text-xs font-medium text-red-700">
                          Row {err.row}
                        </span>
                        <span className="text-red-700">{err.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importResult.imported > 0 && (
                <div className="flex justify-end">
                  <Link href="/candidates">
                    <Button>View Candidates</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
