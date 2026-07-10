import { Spinner } from '@/components/ui/spinner'

export function LoadingScreen() {
  return (
    <div className="flex h-dvh items-center justify-center">
      <Spinner size={24} />
    </div>
  )
}
