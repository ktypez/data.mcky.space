import { expect, it } from 'vitest'
import { responseStorage } from './offline-db'

it('reports unavailable IndexedDB to the graceful response-cache layer, not an absent export', async () => {
  expect(responseStorage).toBeDefined()
  await expect(responseStorage.get('test')).rejects.toThrow()
})
