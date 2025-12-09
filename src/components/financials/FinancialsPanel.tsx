"use client"

import React, { useState, useEffect } from "react"
import { createClient } from '@/lib/supabase/client'
import AuditPage from '@/app/(protected)/audit/page'

export default function FinancialsPanel() {
  return <AuditPage />
}