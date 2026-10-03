let dirty = false

export function setFormDirty(value: boolean): void {
  dirty = value
}

export function isFormDirty(): boolean {
  return dirty
}
