
import { useTheme } from '@/lib/theme-context'
import { MagnifyingGlass, Plus, X, ArrowLeft, Moon, Sun } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import ThemePresetPicker from '@/components/ThemePresetPicker'
import NavDropdown from '@/components/NavDropdown'

interface PageHeaderProps {
  variant: 'list' | 'detail' | 'map' | 'add-edit'
  title?: string
  showBack?: boolean
  onBack?: () => void
  search?: string
  onSearchChange?: (v: string) => void
  onSearchClear?: () => void
  onSearchKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  searchDropdown?: React.ReactNode
  showAddButton?: boolean
  onAdd?: () => void
}

export default function PageHeader({
  variant,
  title,
  showBack,
  onBack,
  search,
  onSearchChange,
  onSearchClear,
  onSearchKeyDown,
  searchDropdown,
  showAddButton,
  onAdd,
}: PageHeaderProps) {
  const { theme, setTheme } = useTheme()
  return (
    <header className="h-14 bg-card flex items-center gap-3 px-4 sticky top-0 z-30 shadow-[0_1px_4px_rgba(0,0,0,.07)] border-b border-border">
      <NavDropdown />

      {showBack && onBack && (
        <Button
          variant="outline"
          size="icon"
          onClick={onBack}
          aria-label="ย้อนกลับ"
        >
          <ArrowLeft className="w-4 h-4 text-primary" />
        </Button>
      )}

      {variant === 'list' || variant === 'map' ? (
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            aria-label="ค้นหาลูกค้า"
            placeholder="ค้นหา ชื่อ / ร้าน / ที่อยู่…"
            value={search ?? ''}
            onChange={(e) => onSearchChange?.(e.target.value)}
            onKeyDown={onSearchKeyDown}
            className="h-9 w-full pl-9 pr-9 text-[16px] font-sans rounded-lg bg-muted border border-border text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 transition-all duration-200 placeholder:text-muted-foreground"
          />
          {search && (
            <Button
              variant="destructive"
              size="icon-sm"
              onClick={onSearchClear}
              aria-label="ล้างการค้นหา"
              className="absolute right-1.5 top-1/2 -translate-y-1/2"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
          {searchDropdown}
        </div>
      ) : (
        <div className="flex-1">
          <span className="text-[15px] font-medium text-foreground truncate block">
            {title}
          </span>
        </div>
      )}

      <div className="flex items-center gap-1.5 shrink-0">
        {showAddButton && onAdd && (
          <Button
            variant="default"
            size="icon"
            onClick={onAdd}
            aria-label="เพิ่มลูกค้าใหม่"
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
        <ThemePresetPicker />
        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="สลับโหมดสี"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-primary" />
          ) : (
            <Moon className="w-4 h-4 text-primary" />
          )}
        </Button>
      </div>
    </header>
  )
}
