import { useRef, useState } from "react"
import { Trash2 } from "lucide-react"

interface SwipeableTodoItemProps {
  children: React.ReactNode
  onDelete: () => void
  disabled?: boolean
}

export default function SwipeableTodoItem({
  children,
  onDelete,
  disabled = false,
}: SwipeableTodoItemProps) {
  const [translateX, setTranslateX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const isAngleLockedRef = useRef<boolean | null>(null)

  const SWIPE_THRESHOLD = -80 // 80px left swipe threshold to trigger delete

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
    isAngleLockedRef.current = null
    setIsSwiping(false)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || disabled) return

    const touch = e.touches[0]
    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = touch.clientY - touchStartRef.current.y

    // Angle locking: if vertical movement exceeds horizontal movement on initial drag, lock to scrolling
    if (isAngleLockedRef.current === null) {
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        isAngleLockedRef.current = false // locked to vertical scroll
        return
      } else if (Math.abs(deltaX) > 5) {
        isAngleLockedRef.current = true // locked to horizontal swipe
      }
    }

    if (isAngleLockedRef.current === false) return

    // Allow swiping left (negative deltaX) only
    if (deltaX < 0) {
      setIsSwiping(true)
      // Resistance elasticity past threshold
      const resistanceX = deltaX < SWIPE_THRESHOLD
        ? SWIPE_THRESHOLD + (deltaX - SWIPE_THRESHOLD) * 0.3
        : deltaX
      setTranslateX(resistanceX)
    } else {
      setTranslateX(0)
    }
  }

  const handleTouchEnd = () => {
    if (!touchStartRef.current || disabled) return

    if (translateX <= SWIPE_THRESHOLD) {
      setTranslateX(-1000) // animate off-screen
      setTimeout(() => {
        onDelete()
        setTranslateX(0)
        setIsSwiping(false)
      }, 200)
    } else {
      setTranslateX(0)
      setIsSwiping(false)
    }

    touchStartRef.current = null
    isAngleLockedRef.current = null
  }

  return (
    <div className="relative overflow-hidden rounded-md">
      {/* Red delete background container */}
      <div
        className="absolute inset-0 flex items-center justify-end bg-destructive px-4 text-destructive-foreground transition-opacity"
        style={{ opacity: translateX < -10 ? 1 : 0 }}
      >
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
          <span>Delete</span>
          <Trash2 className="h-4 w-4" />
        </div>
      </div>

      {/* Swipeable foreground item */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translate3d(${translateX}px, 0, 0)`,
          transition: isSwiping ? "none" : "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        className="relative z-10 bg-background"
      >
        {children}
      </div>
    </div>
  )
}
