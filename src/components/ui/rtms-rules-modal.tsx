"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Settings, RotateCcw } from 'lucide-react'
import { DEFAULT_RTMS_RULES, type RTMSRuleConfig } from '@/lib/rtms-rules'

interface RTMSRulesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rules: RTMSRuleConfig[]
  onRulesChange: (rules: RTMSRuleConfig[]) => void
}

export function RTMSRulesModal({ open, onOpenChange, rules, onRulesChange }: RTMSRulesModalProps) {
  const [localRules, setLocalRules] = useState<RTMSRuleConfig[]>(rules)

  const handleToggle = (id: string) => {
    setLocalRules(prev => prev.map(r =>
      r.id === id ? { ...r, enabled: !r.enabled } : r
    ))
  }

  const handleValueChange = (id: string, value: string) => {
    const num = parseFloat(value)
    if (isNaN(num) || num < 0) return
    setLocalRules(prev => prev.map(r =>
      r.id === id ? { ...r, value: num } : r
    ))
  }

  const handleReset = () => {
    setLocalRules(DEFAULT_RTMS_RULES.map(r => ({ ...r })))
  }

  const handleSave = () => {
    onRulesChange(localRules)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            RTMS Compliance Rules
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Toggle rules on/off and adjust limits. Disabled rules will not generate violations or rest stop suggestions.
          </p>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-3 font-medium text-gray-700 w-12">Active</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Rule</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Description</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700 w-32">Value</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700 w-16">Unit</th>
                </tr>
              </thead>
              <tbody>
                {localRules.map((rule) => (
                  <tr key={rule.id} className={`border-b last:border-0 ${!rule.enabled ? 'bg-gray-50/50' : ''}`}>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggle(rule.id)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          rule.enabled ? 'bg-[#001e42]' : 'bg-gray-300'
                        }`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                          rule.enabled ? 'translate-x-4.5' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </td>
                    <td className={`px-4 py-3 font-medium ${rule.enabled ? 'text-gray-900' : 'text-gray-400'}`}>
                      {rule.name}
                    </td>
                    <td className={`px-4 py-3 ${rule.enabled ? 'text-gray-600' : 'text-gray-400'}`}>
                      {rule.description}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number"
                        value={rule.value}
                        onChange={(e) => handleValueChange(rule.id, e.target.value)}
                        disabled={!rule.enabled}
                        className="w-20 text-right border rounded px-2 py-1 text-sm disabled:opacity-40 disabled:bg-gray-50"
                        step={rule.value < 10 ? 0.5 : 1}
                        min={0}
                      />
                    </td>
                    <td className={`px-4 py-3 ${rule.enabled ? 'text-gray-500' : 'text-gray-400'}`}>
                      {rule.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Reset to Defaults
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button size="sm" className="bg-[#001e42] hover:bg-[#002d5a] text-white" onClick={handleSave}>
                Save Rules
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
