interface HabDostLogoProps {
  size?: number
  className?: string
}

export function HabDostLogo({
  size = 28,
  className = "",
}: HabDostLogoProps) {
  return (
    <img
      src="/habdost_png.png"
      alt="HabDost Logo"
      width={size}
      height={size}
      className={`rounded-lg object-contain shrink-0 ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  )
}
