'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react'

export default function LoadscheduleUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleUpload = useCallback(async () => {
    if (!file) return
    setUploading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/loadschedule/upload', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Upload failed')
        if (data.headers) {
          setError(`No matching columns found. Detected headers: ${data.headers.join(', ')}`)
        }
      } else {
        setResult(data)
      }
    } catch (err: any) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [file])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) setFile(f)
  }, [])

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1A245E]">Upload Loadschedule Data</h1>
        <p className="text-sm text-slate-500 mt-1">
          Upload an Excel file with load/financial data to import into the system.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Expected Columns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-50 rounded-lg p-4 text-xs font-mono text-slate-600 max-h-40 overflow-auto">
            Load nr, Load date, Month, Year, Month+Yr, Country, Debtor, DrName, Load/Del, Pink CV/PO, Order No 3, Load Size, Commodity, LoadDescrip, OffLoadDescrip, DNote, Vehicle No, Own Veh #, Own Reg #, Qty, Rate, DrValue, From, To, AdHoc Veh #, AdHoc Veh Reg #, S, Invoice no, Inv Date, Creditor, Subbie2, CrName, DriverName, CrValue, Profit, % Profit, Route Km, OpeningKm, ClosingKm, MapKm, EmptyKm, CPKInc, POD no, Tax Inv no, LoadRegion, OffLoadRegion, Leader Reg, Follower Reg, Route Description
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div
            className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer ${
              dragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'
            }`}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileSpreadsheet className="w-8 h-8 text-green-600" />
                <div className="text-left">
                  <div className="font-medium text-sm">{file.name}</div>
                  <div className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</div>
                </div>
              </div>
            ) : (
              <div>
                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <div className="text-sm font-medium text-slate-600">Drop Excel file here or click to browse</div>
                <div className="text-xs text-slate-400 mt-1">Supports .xlsx, .xls, .csv</div>
              </div>
            )}
          </div>

          <Button
            className="w-full mt-4 bg-[#1A245E] hover:bg-[#1A245E]/90"
            disabled={!file || uploading}
            onClick={handleUpload}
          >
            {uploading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading & Processing...</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" /> Upload & Import</>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
              <div>
                <div className="font-medium text-red-800 text-sm">Upload Failed</div>
                <div className="text-red-700 text-xs mt-1">{error}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="font-medium text-green-800 text-sm">Upload Successful</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
                  <div className="bg-white rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-[#1A245E]">{result.totalRows}</div>
                    <div className="text-xs text-slate-500">Total Rows</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">{result.inserted}</div>
                    <div className="text-xs text-slate-500">Inserted</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-red-600">{result.errors}</div>
                    <div className="text-xs text-slate-500">Errors</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-slate-400">{result.skipped}</div>
                    <div className="text-xs text-slate-500">Skipped (empty)</div>
                  </div>
                </div>
                {result.mappedColumns && (
                  <div className="mt-3 text-xs text-green-700">
                    Mapped columns: {result.mappedColumns.join(', ')}
                  </div>
                )}
                {result.errorMessages && (
                  <div className="mt-2 text-xs text-red-600">
                    {result.errorMessages.map((msg: string, i: number) => <div key={i}>{msg}</div>)}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
