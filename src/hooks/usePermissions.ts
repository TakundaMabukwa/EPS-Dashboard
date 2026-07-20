"use client"

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Permission, hasPermission, getPagePermissions, PageKey, ActionKey } from '@/lib/permissions/permissions'

// Global cache for permissions
let globalPermissions: Permission[] = []
let globalUserEmail: string = ''
let permissionsLoaded = false

export function usePermissions() {
  const [permissions, setPermissions] = useState<Permission[]>(globalPermissions)
  const [userEmail, setUserEmail] = useState<string>(globalUserEmail)
  const [loading, setLoading] = useState(!permissionsLoaded)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    if (permissionsLoaded) {
      setPermissions(globalPermissions)
      setUserEmail(globalUserEmail)
      setLoading(false)
      return
    }

    async function fetchUserPermissions() {
      try {
        const supabase = createClient()
        
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user?.email) {
          permissionsLoaded = true
          if (mountedRef.current) setLoading(false)
          return
        }

        globalUserEmail = user.email
        if (mountedRef.current) setUserEmail(user.email)

        const { data: userData } = await supabase
          .from('users')
          .select('permissions')
          .eq('email', user.email)
          .single()

        if (userData?.permissions && mountedRef.current) {
          globalPermissions = userData.permissions
          setPermissions(userData.permissions)
        }
      } catch (error) {
        // Silent error handling
      } finally {
        permissionsLoaded = true
        if (mountedRef.current) setLoading(false)
      }
    }

    fetchUserPermissions()

    return () => { mountedRef.current = false }
  }, [])

  const canAccess = (page: PageKey, action: ActionKey = 'view') => {
    // Special case for admin@eps.com - full access
    if (userEmail === 'admin@eps.com') {
      return true
    }
    // While loading, grant access to avoid hiding buttons
    if (loading) {
      return true
    }
    return hasPermission(permissions, page, action)
  }

  const getActions = (page: PageKey) => {
    if (userEmail === 'admin@eps.com') {
      return ['view', 'create', 'edit', 'delete'] as ActionKey[]
    }
    return getPagePermissions(permissions, page)
  }

  return {
    permissions,
    canAccess,
    getActions,
    userEmail,
    loading
  }
}
