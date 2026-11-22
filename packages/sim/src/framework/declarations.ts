import ts from 'typescript'

export interface ApiMethod {
  name: string
  signature: string
  description: string
  params: { name: string; description: string }[]
  returns: string
  example: string
}

export function readPlayerAPI(source: string) {
  const file = ts.createSourceFile('player.ts',source,ts.ScriptTarget.Latest,true)
  const types: Record<string,string> = {}
  const methods: ApiMethod[] = []
  const handlers: ApiMethod[] = []
  const consoleMethods: ApiMethod[] = []
  for (const stmt of file.statements) {
    if (ts.isInterfaceDeclaration(stmt) && ['PlayerAPI', 'Controller', 'PlayerConsole'].includes(stmt.name.text)) {
      for (const method of stmt.members) {
        if (!ts.isMethodSignature(method)) continue
        const doc = ts.getJSDocCommentsAndTags(method).find(ts.isJSDoc)
        const tags = ts.getJSDocTags(method)
        const tagText = (name: string) => ts.getTextOfJSDocComment(tags.find(tag => tag.tagName.text === name)?.comment) ?? ''
        const isConsole = stmt.name.text === 'PlayerConsole'
        const entries = isConsole ? consoleMethods : stmt.name.text === 'Controller' ? handlers : methods
        const prefix = isConsole ? 'console.' : ''
        entries.push({
          name: prefix + method.name.getText(file),
          signature: prefix + method.getText(file),
          description: ts.getTextOfJSDocComment(doc?.comment) ?? '',
          params: tags.filter(ts.isJSDocParameterTag).map(tag => ({
            name: tag.name.getText(file),
            description: ts.getTextOfJSDocComment(tag.comment) ?? '',
          })),
          returns: tagText('returns') || tagText('return'),
          example: tagText('example'),
        })
      }
    } else if (ts.isTypeAliasDeclaration(stmt) || ts.isInterfaceDeclaration(stmt)) {
      types[stmt.name.text] = stmt.getText(file).replace(/^export\s+/,'')
    }
  }
  return {types,methods,handlers,consoleMethods}
}

export function playerDeclarations(schema: ReturnType<typeof readPlayerAPI>, names: readonly string[], exposure:'globals'|'module', aliases: Record<string,string[]> = {}, overloads: string[] = []) {
  const types = Object.entries(schema.types).map(([name,text])=> aliases[name] ?
    'type '+name+' = '+(aliases[name].map(v=>JSON.stringify(v)).join(' | ') || 'never') : text)
  const signatures = [...overloads,...schema.methods.filter(m=>names.includes(m.name)).map(m=>
    '/** '+m.description+' */\n'+(exposure==='globals'?'declare':'export')+' function '+m.signature)]
  return [...types,exposure==='module'?'declare module "inherit" {\n'+signatures.join('\n')+'\n}':signatures.join('\n'),
    'interface Console { log(...words: unknown[]): void } declare var console: Console'].join('\n')
}
