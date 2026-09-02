interface Props {
  value: number
  max?: number
}

export default function ProgressBar({ value, max = 100 }: Props) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className="h-1 w-full bg-border overflow-hidden">
      <div
        className="h-full bg-primary transition-all duration-200 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
