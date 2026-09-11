export interface Client {
  id: string
  name: string[]
  shopName: string[]
  address: string
  lat: number | null
  lng: number | null
  images: string[]
  /** List-view thumb for images[0]; set only from /api/clients/list. */
  thumb?: string | null
  badge: string | null
  notes: string | null
  createdAt: number
  updatedAt: number
}

/**
 * Lightweight client record — only the fields the catalog needs.
 * Returned by the /api/clients/list endpoint.
 */
export interface ClientListItem {
  id: string
  name: string[]
  shopName: string[]
  image: string | null
  /** Derived R2 thumb (clients/{id}/t/{base}.jpg). Null for old photos. */
  thumb: string | null
  badge: string | null
  updatedAt: number
  createdAt: number
}

export enum FilterKey {
  All = 'all',
  WithImages = 'with-images',
  NoImages = 'no-images',
  Recent = 'recent',
  Penpay = 'penpay',
  Credit = 'credit',
}

export type ViewMode = 'table' | 'cards'

export type ViewState =
  | { view: 'list' }
  | { view: 'detail'; clientId: string; client?: Client }
  | { view: 'add-edit'; editClientId: string | null }
  | { view: 'trash' }

export interface RouteStop {
  client: Client
  dist: number
}

export interface RouteData {
  origin: { lat: number; lng: number }
  clients: RouteStop[]
}
