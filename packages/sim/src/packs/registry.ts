/// <reference types="vite/client" />
import type { PackManifest } from '../framework/pack'
const entries = import.meta.glob<PackManifest>('./*/manifest.ts', { eager: true, import: 'default' })
export const manifests = Object.entries(entries).map(([path, manifest]) => {
  if (path.split('/')[1] !== manifest.id) throw new Error('Pack folder must match ' + manifest.id)
  return manifest
}).sort((a,b) => Number(!!b.featured) - Number(!!a.featured) || a.title.localeCompare(b.title))
