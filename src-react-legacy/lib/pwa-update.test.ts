// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { startUpdateChecks, acceptUpdate, manuallyUpdateApp } from './pwa-update'

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })
it('checks on foreground/reconnect, skips offline and hidden, cleans up', async () => {
  vi.useFakeTimers()
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
  const update = vi.fn().mockResolvedValue(undefined)
  const stop = startUpdateChecks({ update, installing: null } as unknown as ServiceWorkerRegistration)
  await vi.advanceTimersByTimeAsync(0)
  expect(update).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(600_000)
  expect(update).toHaveBeenCalledTimes(2)
  online.mockReturnValue(false)
  await vi.advanceTimersByTimeAsync(600_000)
  expect(update).toHaveBeenCalledTimes(2)
  online.mockReturnValue(true)
  window.dispatchEvent(new Event('online'))
  await vi.advanceTimersByTimeAsync(0)
  expect(update).toHaveBeenCalledTimes(3)
  stop()
  await vi.advanceTimersByTimeAsync(600_000)
  expect(update).toHaveBeenCalledTimes(3)
})
it('does not update when user declines reload confirmation', async () => {
  const apply = vi.fn()
  await acceptUpdate(apply, () => false)
  expect(apply).not.toHaveBeenCalled()
  await acceptUpdate(apply, () => true)
  expect(apply).toHaveBeenCalledWith(true)
})

it('manually checks the service worker and applies a waiting update', async () => {
  const message = vi.fn()
  const registration = {
    update: vi.fn().mockResolvedValue(undefined),
    waiting: { postMessage: message },
  } as unknown as ServiceWorkerRegistration
  const reload = vi.fn()
  const result = await manuallyUpdateApp(registration, reload)
  expect(registration.update).toHaveBeenCalledOnce()
  expect(message).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
  expect(reload).toHaveBeenCalledOnce()
  expect(result).toBe('updated')
})
