interface HabDostLogoProps {
  size?: number
  className?: string
  isDark?: boolean
}

export function HabDostLogo({
  size = 28,
  className = "",
  isDark = false,
}: HabDostLogoProps) {
  return (
    <img
      src={isDark ? "/habdost_png_black.png" : "/habdost_png_white.png"}
      alt="HabDost Logo"
      width={size}
      height={size}
      className={`rounded-lg object-contain shrink-0 ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  )
}
