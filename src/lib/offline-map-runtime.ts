import { FileSource, PMTiles, Protocol } from 'pmtiles'
import { getMapStyle } from './map-styles'
import { getOfflineMapStyle } from './offline-map-style'
import { getOfflineMapPackMeta, getOfflineMapResource, openOfflineMapPack } from './offline-map-pack'

const LOCAL_SOURCE_URL = 'pmtiles://khon-kaen.pmtiles/{z}/{x}/{y}'
let protocol: Protocol | null = null
let registeredMaplibre: any = null

function isDarkMode(): boolean {
  if (typeof document === 'undefined') return false
  if (document.documentElement.classList.contains('dark')) return true
  const shell = document.querySelector('.v3-shell')
  return shell?.getAttribute('data-mode') === 'dark' || (shell?.getAttribute('data-mode') === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches)
}

async function localResource(request: any, callback: (error?: Error, data?: ArrayBuffer, cacheControl?: string, expires?: string) => void) {
  try {
    const url = new URL(request.url)
    const path = decodeURIComponent(`${url.host}${url.pathname}`).replace(/^\/+/, '')
    if (!path.startsWith('khon-kaen/')) throw new Error('Unknown offline map resource')
    const resourceId = path.slice('khon-kaen/'.length)
    const response = await getOfflineMapResource(resourceId)
    if (!response) throw new Error(`Offline map resource is not installed: ${resourceId}`)
    callback(undefined, await response.arrayBuffer())
  } catch (error) { callback(error as Error) }
}

async function registerProtocols(maplibre: any, blob: Blob) {
  if (registeredMaplibre === maplibre) return
  protocol = new Protocol()
  const file = new File([blob], 'khon-kaen.pmtiles', { type: 'application/vnd.pmtiles' })
  protocol.add(new PMTiles(new FileSource(file)))
  maplibre.addProtocol('pmtiles', protocol.tile)
  maplibre.addProtocol('local', localResource)
  registeredMaplibre = maplibre
}

export async function getRuntimeMapStyle(maplibre: any): Promise<string | Record<string, any>> {
  const blob = await openOfflineMapPack()
  const meta = await getOfflineMapPackMeta()
  if (!blob || !meta) return getMapStyle()
  const required = meta.resources.filter((resource) => resource.id.startsWith('styles/') || resource.id.startsWith('fonts/') || resource.id.startsWith('sprites/'))
  const available = await Promise.all(required.map(async (resource) => Boolean(await getOfflineMapResource(resource.id))))
  if (available.some((value) => !value)) return getMapStyle()
  await registerProtocols(maplibre, blob)
  return getOfflineMapStyle(isDarkMode())
}

export { LOCAL_SOURCE_URL }