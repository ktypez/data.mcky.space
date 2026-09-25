export function safeTooltipContent(value: string): HTMLElement {
  const span = document.createElement('span')
  span.textContent = value
  return span
}
