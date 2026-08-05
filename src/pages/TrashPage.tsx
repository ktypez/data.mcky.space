
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClientStore } from '@/stores/client-store'
import TrashView from '@/components/TrashView'
import PageHeader from '@/components/PageHeader'
import { VerticalBar } from '@/components/ScrollIndicator'

export default function TrashPage() {
  const navigate = useNavigate()
  const { initialize } = useClientStore()
  const frameRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <div className="flex min-h-screen flex-col">
      <div className="app-viewport">
        <PageHeader
          variant="add-edit"
          title="ถังขยะ"
          showBack
          onBack={() => navigate('/')}
        />
        <div className="app-frame" ref={frameRef}>
          <TrashView />
        </div>
        <VerticalBar containerRef={frameRef} />
      </div>
    </div>
  )
}
