export default function SuggestionDiff({
  label,
  oldVal,
  newVal,
}: {
  label: string
  oldVal: string
  newVal: string
}) {
  if (oldVal === newVal) return null
  return (
    <div className="flex gap-2">
      <span className="text-[var(--text-muted)] w-12 shrink-0">{label}</span>
      <span className="text-[var(--text-muted)] line-through">{oldVal}</span>
      <span className="text-[var(--success)] font-medium">{newVal}</span>
    </div>
  )
}
