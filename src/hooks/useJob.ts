'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Job } from '@/types'

export function useJob(jobId: string | null) {
  const [job, setJob] = useState<Job | null>(null)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const poll = useCallback(async () => {
    if (!jobId) return
    try {
      const res = await fetch(`/api/status?jobId=${jobId}`)
      if (!res.ok) throw new Error(`Status check failed: ${res.status}`)
      const data: Job = await res.json()
      setJob(data)
      if (data.status === 'completed' || data.status === 'failed') {
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status check failed')
    }
  }, [jobId])

  useEffect(() => {
    if (!jobId) return
    poll()
    intervalRef.current = setInterval(poll, 3000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [jobId, poll])

  return { job, error }
}
