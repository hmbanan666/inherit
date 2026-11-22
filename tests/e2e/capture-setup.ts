import { mkdir, writeFile } from 'node:fs/promises'
import { resolve,join } from 'node:path'
export default async function setup() {
  const dir = process.env.INHERIT_SHOTS
  if (!dir) return
  if (resolve(dir) === process.cwd() || resolve(dir).startsWith(process.cwd()+'/'))
    throw new Error('Choose a screenshot directory outside the checkout.')
  await mkdir(dir,{recursive:true})
  await writeFile(join(dir,'visible-text.md'),'# Game pack screenshots\n\n1440 × 900 unless the test selects a different viewport.\n')
}
