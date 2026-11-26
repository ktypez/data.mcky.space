declare module 'open-location-code' {
  /**
   * Ambient types for the UMD `OpenLocationCode` constructor exported by
   * `open-location-code@1.0.3`. The package ships no TS types of its own, so
   * only the API surface used by the app is modeled here.
   */
  export interface CodeArea {
    latitudeCenter: number
    longitudeCenter: number
    latitudeLow: number
    longitudeLow: number
    latitudeHigh: number
    longitudeHigh: number
  }

  export class OpenLocationCode {
    encode(latitude: number, longitude: number, codeLength?: number): string
    decode(code: string): CodeArea
    isValid(code: string): boolean
    isFull(code: string): boolean
    isShort(code: string): boolean
    shorten(code: string, latitude: number, longitude: number): string
    recoverNearest(code: string, latitude: number, longitude: number): string
    trim(code: string, codeLength?: number): string
  }
}
