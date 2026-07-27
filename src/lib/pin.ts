function hexToRgba(hex: string, alpha: number): string {
  const c = hex.replace('#', '')
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function sanitizeColor(color: string): string {
  // Only allow valid hex colors (#RGB, #RRGGBB, #RRGGBBAA)
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)) return color
  return '#2563eb'
}

export function pinHtml(size: number, filled: boolean, color?: string): string {
  const c = sanitizeColor(color || '#2563eb')
  const inner = Math.round(size * 0.36)
  if (filled) {
    return (
      `<div style="` +
      `width:${size}px;height:${size}px;` +
      `background:${c};` +
      `border:2.5px solid #fff;border-radius:50% 50% 50% 0;` +
      `transform:rotate(-45deg);` +
      `box-shadow:0 2px 8px rgba(0,0,0,0.25);` +
      `display:flex;align-items:center;justify-content:center;cursor:pointer` +
      `"><div style="` +
      `width:${inner}px;height:${inner}px;background:#fff;border-radius:50%;transform:rotate(45deg)` +
      `"></div></div>`
    )
  }
  return (
    `<div style="` +
    `width:${size}px;height:${size}px;` +
    `background:${hexToRgba(c, 0.2)};` +
    `border:2.5px solid ${hexToRgba(c, 0.5)};` +
    `border-radius:50% 50% 50% 0;transform:rotate(-45deg);` +
    `box-shadow:0 2px 6px rgba(0,0,0,0.1);` +
    `display:flex;align-items:center;justify-content:center;cursor:pointer` +
    `"><div style="` +
    `width:${inner}px;height:${inner}px;background:rgba(255,255,255,0.7);border-radius:50%;transform:rotate(45deg)` +
    `"></div></div>`
  )
}
