
import { X, List, SquaresFour, ArrowClockwise, NavigationArrow, Check } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import ProgressBar from '@/components/ProgressBar'
import FilterDropdown from '@/components/FilterDropdown'
import type { FilterKey } from '@/types'

type ViewMode = 'table' | 'cards'

interface Counts {
  total: number
  withImages: number
  noImages: number
  recent: number
}

interface Props {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  refreshing: boolean
  onRefresh: () => void
  selectionMode: boolean
  onToggleSelectionMode: () => void
  selectedCount: number
  onPlanRoute: () => void
  routing: boolean
  progress?: number
  newCount?: number
  filter: FilterKey
  counts: Counts
  onFilter: (key: FilterKey) => void
}

export default function SelectionToolbar({
  viewMode,
  onViewModeChange,
  refreshing,
  onRefresh,
  selectionMode,
  onToggleSelectionMode,
  selectedCount,
  onPlanRoute,
  routing,
  progress,
  newCount,
  filter,
  counts,
  onFilter,
}: Props) {
  return (
    <div className="bg-card border-b border-border">
      <div className="px-4 py-2 flex items-center gap-2 min-h-[40px] overflow-x-auto">
        <div className="flex items-center gap-2 w-full">
          <div className="hidden md:flex gap-0.5 bg-muted p-0.5 rounded-[4px]">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onViewModeChange('table')}
              aria-label="แสดงตาราง"
              className={viewMode === 'table' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}
            >
              <List className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onViewModeChange('cards')}
              aria-label="แสดงการ์ด"
              className={viewMode === 'cards' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}
            >
              <SquaresFour className="w-3.5 h-3.5" />
            </Button>
          </div>
          <FilterDropdown filter={filter} counts={counts} onFilter={onFilter} />
          <Button
            variant="secondary"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing}
            className="shrink-0"
            title="รีเฟรชข้อมูล"
          >
            <ArrowClockwise className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
            <span>รีเฟรช</span>
          </Button>

          {newCount != null && newCount > 0 && (
            <span className="text-xs text-green-600 dark:text-green-400 animate-in fade-in duration-200 whitespace-nowrap">
              +{newCount} ราย
            </span>
          )}

          <div className="flex-1" />

          {selectedCount > 0 && (
            <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <span className="font-mono max-md:text-[17px] md:text-[15px] text-muted-foreground whitespace-nowrap shrink-0 px-1 inline-flex items-center gap-0.5">
                <Check className="w-3.5 h-3.5 shrink-0" />{' '}
                <span className="shrink-0">{selectedCount}</span>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={onPlanRoute}
                disabled={routing}
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                <NavigationArrow className="w-3 h-3" />
                {routing ? 'กำลังวางแผน...' : 'ตกลง'}
              </Button>
            </div>
          )}

          <Button
            variant={selectionMode ? 'destructive' : 'outline'}
            size="sm"
            onClick={onToggleSelectionMode}
          >
            {selectionMode ? (
              <X className="w-3.5 max-md:w-4 h-3.5 max-md:h-4" />
            ) : (
              <List className="w-3.5 max-md:w-4 h-3.5 max-md:h-4" />
            )}
            {selectionMode ? 'ยกเลิก' : 'วางแผนเส้นทาง'}
          </Button>
        </div>
      </div>
      {(refreshing || (typeof progress === 'number' && progress > 0)) && (
        <ProgressBar value={typeof progress === 'number' ? progress : 0} max={100} />
      )}
    </div>
  )
}
