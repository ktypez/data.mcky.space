import { describe, expect, it } from 'vitest'
import { syncTrackedFields, trackField } from '@/lib/restore-field'

/**
 * The registry is exercised with plain objects: the sync only touches
 * `isConnected` and `value`, so no DOM is needed and the suite stays on the
 * node environment.
 */
function fakeField(value: string, connected = true) {
  return { value, isConnected: connected } as unknown as HTMLInputElement
}

describe('restore-field', () => {
  it('writes the store value back over a value the browser restored', () => {
    let stored = 'cafe'
    const el = fakeField('')
    const handle = trackField(el, () => stored)
    // What a mobile browser does on session restore: change the control
    // without firing input, so the store never heard about it.
    el.value = 'โรงแรม'
    syncTrackedFields()
    expect(el.value).toBe('cafe')
    handle?.destroy?.()
  })

  it('leaves a field alone when it already matches', () => {
    let stored = 'same'
    const el = fakeField('same')
    const handle = trackField(el, () => stored)
    const writes: string[] = []
    Object.defineProperty(el, 'value', {
      get: () => 'same',
      set: (v: string) => writes.push(v),
    })
    syncTrackedFields()
    expect(writes).toEqual([])
    handle?.destroy?.()
  })

  it('reads the value at sync time, not at registration', () => {
    let stored = 'first'
    const el = fakeField('first')
    const handle = trackField(el, () => stored)
    stored = 'second'
    el.value = 'stale'
    syncTrackedFields()
    expect(el.value).toBe('second')
    handle?.destroy?.()
  })

  it('skips detached fields and unregistered ones', () => {
    const gone = fakeField('x', false)
    const el = fakeField('kept')
    const a = trackField(gone, () => 'a')
    const b = trackField(el, () => 'b')
    gone.value = 'touched'
    el.value = 'touched'
    syncTrackedFields()
    expect(gone.value).toBe('touched')
    expect(el.value).toBe('b')
    a?.destroy?.()
    b?.destroy?.()
    el.value = 'after-destroy'
    syncTrackedFields()
    expect(el.value).toBe('after-destroy')
  })

  it('treats a missing getter as opting out', () => {
    const el = fakeField('untouched')
    const handle = trackField(el, undefined)
    el.value = 'still-me'
    syncTrackedFields()
    expect(el.value).toBe('still-me')
    handle?.destroy?.()
  })
})