/// <reference types="vite/client" />
import type { PackManifest } from '../framework/pack'
const entries = import.meta.glob<PackManifest>('./*/manifest.ts', { eager: true, import: 'default' })
const levels: PackManifest['level'][] = ['Beginner','Basics','Game','Advanced']
export const manifests = Object.entries(entries).map(([path, manifest]) => {
  if (path.split('/')[1] !== manifest.id) throw new Error('Pack folder must match ' + manifest.id)
  return manifest
}).sort((a,b) => Number(!!b.featured) - Number(!!a.featured) || levels.indexOf(a.level)-levels.indexOf(b.level) || a.title.localeCompare(b.title))
