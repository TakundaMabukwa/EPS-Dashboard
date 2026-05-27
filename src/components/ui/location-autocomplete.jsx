'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MapPin, Loader2 } from 'lucide-react'

export function LocationAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Enter location',
  label,
  clientLocations = [],
}) {
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef(null)
  const suggestionsRef = useRef(null)
  const lookupCacheRef = useRef(new Map())
  const justSelectedRef = useRef(false)

  const getDisplayValue = (suggestion) => {
    if (suggestion?.type === 'place' && suggestion?.name) return suggestion.name
    return suggestion?.address || suggestion?.name || ''
  }

  useEffect(() => {
    if (!value || value.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    if (justSelectedRef.current) return

    const timeoutId = setTimeout(async () => {
      setIsLoading(true)

      const clientMatches = clientLocations
        .filter(
          (loc) =>
            loc.name?.toLowerCase().includes(value.toLowerCase()) ||
            loc.address?.toLowerCase().includes(value.toLowerCase()),
        )
        .map((loc) => ({
          id: loc.id,
          name: loc.name,
          address: loc.address,
          type: 'client',
        }))

      let lookupPlaces = []

      try {
        const cacheKey = value.trim().toLowerCase()
        let results = lookupCacheRef.current.get(cacheKey)

        if (!results) {
          const response = await fetch(`/api/location-lookup?q=${encodeURIComponent(value)}`)
          const data = await response.json()
          results = Array.isArray(data?.results) ? data.results : []
          lookupCacheRef.current.set(cacheKey, results)
        }

        lookupPlaces = results.map((result, index) => ({
          id: result.id || `lookup_${index}`,
          name: result.name,
          address: result.address,
          type: result.type || 'lookup',
          coordinates: result.coordinates || null,
        }))
      } catch (error) {
        console.error('Location lookup error:', error)
      }

      const mergedSuggestions = [...clientMatches, ...lookupPlaces]

      setSuggestions(mergedSuggestions)
      setShowSuggestions(mergedSuggestions.length > 0)
      setIsLoading(false)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [value])

  const handleSuggestionClick = (suggestion) => {
    justSelectedRef.current = true
    onChange(getDisplayValue(suggestion))
    onSelect?.(suggestion)
    setSuggestions([])
    setShowSuggestions(false)
    inputRef.current?.blur()
    setTimeout(() => { justSelectedRef.current = false }, 500)
  }

  const handleInputChange = (e) => {
    const newValue = e.target.value
    onChange(newValue)

    if (newValue.length >= 2) {
      setShowSuggestions(true)
    }
  }

  const handleInputBlur = () => {
    setTimeout(() => setShowSuggestions(false), 150)
  }

  const handleInputFocus = () => {
    if (value?.length >= 2 && suggestions.length > 0) {
      setShowSuggestions(true)
    }
  }

  const sourceLabel = (type) => {
    if (type === 'client') return <div className="mt-1 text-xs text-blue-600">Client Location</div>
    if (type === 'place') return <div className="mt-1 text-xs text-green-600">Place</div>
    return null
  }

  return (
    <div className="relative">
      {label && <Label>{label}</Label>}

      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          className="pr-8"
          autoComplete="off"
        />
        <MapPin className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
      </div>

      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg"
        >
          {isLoading && (
            <div className="flex items-center gap-2 p-3 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          )}

          {!isLoading && suggestions.length === 0 && (
            <div className="p-3 text-sm text-gray-500">No locations found</div>
          )}

          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="cursor-pointer border-b border-gray-100 p-3 transition-colors last:border-b-0 hover:bg-blue-50"
              onMouseDown={(e) => {
                e.preventDefault()
                handleSuggestionClick(suggestion)
              }}
            >
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {suggestion.name}
                  </div>

                  {suggestion.address && suggestion.address !== suggestion.name && (
                    <div className="truncate text-xs text-gray-500">
                      {suggestion.address}
                    </div>
                  )}

                  {sourceLabel(suggestion.type)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isLoading && !showSuggestions && value?.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-500 shadow-lg">
          Searching...
        </div>
      )}
    </div>
  )
}
