import { useEffect, useRef } from 'react'

let lockCount = 0
let savedOverflow = ''

export default function useScrollLock(active) {
  const activeRef = useRef(false)

  useEffect(() => {
    if (active && !activeRef.current) {
      activeRef.current = true
      if (lockCount === 0) savedOverflow = document.body.style.overflow
      lockCount++
      document.body.style.overflow = 'hidden'
    }

    if (!active && activeRef.current) {
      activeRef.current = false
      lockCount = Math.max(0, lockCount - 1)
      if (lockCount === 0) document.body.style.overflow = savedOverflow
    }

    return () => {
      if (activeRef.current) {
        activeRef.current = false
        lockCount = Math.max(0, lockCount - 1)
        if (lockCount === 0) document.body.style.overflow = savedOverflow
      }
    }
  }, [active])
}
