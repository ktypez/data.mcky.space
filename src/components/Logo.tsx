export default function Logo({ className = 'w-9 h-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none">
      <rect x="1" y="1" width="30" height="30" rx="7" style={{ fill: 'var(--primary)' }} />
      <rect x="7" y="19" width="4" height="8" rx="1.5" fill="white" opacity="0.85" />
      <rect x="13" y="13" width="4" height="14" rx="1.5" fill="white" opacity="0.85" />
      <rect x="19" y="7" width="4" height="20" rx="1.5" fill="white" />
    </svg>
  )
}
