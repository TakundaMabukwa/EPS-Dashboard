"use client"

import { useEffect, useState } from "react"

let loadingPromise: Promise<void> | null = null
let globalLoaded = false

export function useGoogleMaps() {
  const [loaded, setLoaded] = useState(globalLoaded)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (globalLoaded || window.google?.maps) {
      globalLoaded = true
      setLoaded(true)
      return
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_TOKEN
    if (!apiKey) {
      setError("Google Maps API key is missing")
      return
    }

    if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
      const check = () => {
        if (window.google?.maps) {
          globalLoaded = true
          setLoaded(true)
        } else {
          setTimeout(check, 200)
        }
      }
      check()
      return
    }

    if (!loadingPromise) {
      loadingPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script")
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`
        script.async = true
        script.defer = true
        script.onload = () => {
          globalLoaded = true
          resolve()
        }
        script.onerror = () => reject(new Error("Failed to load Google Maps"))
        document.head.appendChild(script)
      })
    }

    loadingPromise
      .then(() => setLoaded(true))
      .catch((e) => setError(e.message))
  }, [])

  return { loaded, error }
}
