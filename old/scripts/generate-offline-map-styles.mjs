import { writeFile, mkdir } from 'node:fs/promises'
import { layers, namedFlavor } from '@protomaps/basemaps'

const outDir = new URL('../src/lib/generated-map-styles/', import.meta.url)
await mkdir(outDir, { recursive: true })

for (const flavorName of ['light', 'dark']) {
  const style = {
    version: 8,
    name: `Khon Kaen offline ${flavorName}`,
    sources: {
      protomaps: {
        type: 'vector',
        attribution: '<a href="https://github.com/protomaps/basemaps">Protomaps</a> © <a href="https://osm.org/copyright">OpenStreetMap</a>',
        url: 'pmtiles://khon-kaen.pmtiles',
        minzoom: 6,
        maxzoom: 14,
      },
    },
    glyphs: 'local://khon-kaen/fonts/{fontstack}/{range}.pbf',
    sprite: `local://khon-kaen/sprites/${flavorName}`,
    layers: layers('protomaps', namedFlavor(flavorName), { lang: 'th' }),
  }
  await writeFile(new URL(`${flavorName}.json`, outDir), `${JSON.stringify(style)}\n`)
}
