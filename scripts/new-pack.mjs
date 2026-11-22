import { readFile, readdir, rename, rm, mkdtemp, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const [id, ...extra] = process.argv.slice(2)
if (extra.length || !id || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(id) || id.length > 64)
  throw new Error('Use pnpm new-pack <id>, with lowercase letters, digits and single hyphens.')
const root = fileURLToPath(new URL('../packages/sim/src/packs/',import.meta.url))
const templates = fileURLToPath(new URL('./pack-template/',import.meta.url))
const title = id.split('-').map(word=>word[0].toUpperCase()+word.slice(1)).join(' ')
const target = join(root,id)
if ((await readdir(root)).includes(id)) throw new Error('A folder already exists for '+id+'.')
const temporary = await mkdtemp(join(root,'.new-'))
try {
  for (const name of await readdir(templates)) {
    const source = await readFile(join(templates,name),'utf8')
    await writeFile(join(temporary,name.replace(/\.template$/,'')),source.replaceAll('__ID__',id).replaceAll('__TITLE__',title))
  }
  await rename(temporary,target)
  console.log('Created packages/sim/src/packs/'+id+'. Run pnpm test to play its lesson.')
} finally { await rm(temporary,{recursive:true,force:true}) }
