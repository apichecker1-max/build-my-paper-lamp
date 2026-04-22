'use client'

import { useState, useEffect } from 'react'

export function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored !== null) setValue(JSON.parse(stored))
    } catch {}
  }, [key])

  const set = (newValue: T) => {
    setValue(newValue)
    try {
      localStorage.setItem(key, JSON.stringify(newValue))
    } catch {}
  }

  const remove = () => {
    setValue(defaultValue)
    try {
      localStorage.removeItem(key)
    } catch {}
  }

  return [value, set, remove] as const
}
