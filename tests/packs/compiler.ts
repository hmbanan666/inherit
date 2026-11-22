import ts from 'typescript'
import type { Files } from '../../packages/sim/src/framework/pack'

/** Share standard library syntax trees while giving each project a separate scope. */
const options: ts.CompilerOptions = {strict:true, target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.ESNext,
  moduleResolution:ts.ModuleResolutionKind.Bundler, types:[], lib:['lib.es2022.d.ts'], noEmit:true}
const host = ts.createCompilerHost(options)
const standard = new Map<string, ts.SourceFile>()
export function diagnostics(files: Files, declarations: string) {
  const root = '/pack-validation/'
  const source = new Map(Object.entries({...files,'player.d.ts':declarations}).map(([name,text]) => [root+name,text]))
  const local: ts.CompilerHost = {...host,
    fileExists: path => source.has(path) || host.fileExists(path),
    readFile: path => source.get(path) ?? host.readFile(path),
    directoryExists: dir => dir.startsWith(root.slice(0,-1)) || !!host.directoryExists?.(dir),
    getSourceFile(path, version) {
      const text = source.get(path)
      if (text !== undefined) return ts.createSourceFile(path,text,version,true)
      if (!standard.has(path)) {
        const lib = host.getSourceFile(path,version)
        if (lib) standard.set(path,lib)
      }
      return standard.get(path)
    },
  }
  const program = ts.createProgram([...source.keys()],options,local)
  return ts.getPreEmitDiagnostics(program).map(d => {
    const line = d.file?.getLineAndCharacterOfPosition(d.start ?? 0).line ?? 0
    return (d.file?.fileName ?? '')+':'+(line+1)+' '+ts.flattenDiagnosticMessageText(d.messageText,' ')
  })
}
