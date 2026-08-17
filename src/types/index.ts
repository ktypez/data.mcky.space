export interface Client {
  id: string
  name: string[]
  shopName: string[]
  address: string
  lat: number | null
  lng: number | null
  images: string[]
  badge: string | null
  notes: string | null
  createdAt: number
  updatedAt: number
}

export enum FilterKey {
  All = 'all',
  WithImages = 'with-images',
  NoImages = 'no-images',
  Recent = 'recent',
  Penpay = 'penpay',
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
