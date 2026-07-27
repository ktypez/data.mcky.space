import SuggestionDiff from '@/components/SuggestionDiff'

interface SuggestionDetailProps {
  original: any
  suggested: any
  className?: string
}

export default function SuggestionDetail({ original, suggested, className }: SuggestionDetailProps) {
  return (
    <div className={className}>
      <SuggestionDiff label="ชื่อ" oldVal={original.name} newVal={suggested.name} />
      <SuggestionDiff label="ร้าน" oldVal={original.shopName || '-'} newVal={suggested.shopName || '-'} />
      <SuggestionDiff label="ที่อยู่" oldVal={original.address} newVal={suggested.address} />
      {(original.lat !== suggested.lat || original.lng !== suggested.lng) && (
        <div className="flex gap-2">
          <span className="text-muted-foreground w-12 shrink-0">พิกัด</span>
          <span className="text-muted-foreground line-through">
            {original.lat != null ? `${original.lat.toFixed(4)}, ${original.lng?.toFixed(4)}` : '-'}
          </span>
          <span className="text-success font-medium">
            {suggested.lat != null ? `${suggested.lat.toFixed(4)}, ${suggested.lng?.toFixed(4)}` : '-'}
          </span>
        </div>
      )}
    </div>
  )
}
