import ts from 'typescript'

export function readPlayerAPI(source: string) {
  const file = ts.createSourceFile('player.ts',source,ts.ScriptTarget.Latest,true)
  const types: Record<string,string> = {}
  const methods: {name:string;signature:string;description:string}[] = []
  for (const stmt of file.statements) {
    if (ts.isInterfaceDeclaration(stmt) && stmt.name.text === 'PlayerAPI') {
      for (const method of stmt.members) {
        if (!ts.isMethodSignature(method)) continue
        const doc = ts.getJSDocCommentsAndTags(method).find(ts.isJSDoc)
        methods.push({name:method.name.getText(file),signature:method.getText(file),description:String(doc?.comment ?? '')})
      }
    } else if (ts.isTypeAliasDeclaration(stmt) || ts.isInterfaceDeclaration(stmt)) {
      types[stmt.name.text] = stmt.getText(file).replace(/^export\s+/,'')
    }
  }
  return {types,methods}
}

export function playerDeclarations(schema: ReturnType<typeof readPlayerAPI>, names: readonly string[], exposure:'globals'|'module', aliases: Record<string,string[]> = {}, overloads: string[] = []) {
  const types = Object.entries(schema.types).map(([name,text])=> aliases[name] ?
    'type '+name+' = '+(aliases[name].map(v=>JSON.stringify(v)).join(' | ') || 'never') : text)
  const signatures = [...overloads,...schema.methods.filter(m=>names.includes(m.name)).map(m=>
    '/** '+m.description+' */\n'+(exposure==='globals'?'declare':'export')+' function '+m.signature)]
  return [...types,exposure==='module'?'declare module "inherit" {\n'+signatures.join('\n')+'\n}':signatures.join('\n'),
    'interface Console { log(...words: unknown[]): void } declare var console: Console'].join('\n')
}
