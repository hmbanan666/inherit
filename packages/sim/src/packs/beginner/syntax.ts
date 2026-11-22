import ts from 'typescript'
import type { Evidence } from '../../framework/pack'
import type { Village } from './world'

type Seen = Evidence<Village>
type Match = (node: ts.Node) => boolean

// Resolve local names with the compiler so a shadowed or unused declaration
// cannot earn credit for a value that reached the scene.
let cached: { source: string; tree: ts.SourceFile; checker: ts.TypeChecker } | undefined
function document(source: string) {
  if (cached?.source === source) return cached
  const tree = ts.createSourceFile('main.ts', source, ts.ScriptTarget.Latest, true)
  const program = ts.createProgram(['main.ts'], { noLib: true, noResolve: true }, {
    getSourceFile: name => name === 'main.ts' ? tree : undefined,
    fileExists: name => name === 'main.ts',
    readFile: name => name === 'main.ts' ? source : undefined,
    writeFile() {},
    getCurrentDirectory: () => '',
    getDirectories: () => [],
    getDefaultLibFileName: () => '',
    getCanonicalFileName: name => name,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
  })
  return cached = { source, tree, checker: program.getTypeChecker() }
}

function findNode(root: ts.Node, match: Match): ts.Node | undefined {
  return match(root) ? root : ts.forEachChild(root, child => findNode(child, match))
}

function declaration(node: ts.Node) {
  return cached?.checker.getSymbolAtLocation(node)?.valueDeclaration
}

function owner(node: ts.Node) {
  return ts.findAncestor(node.parent, ts.isFunctionDeclaration)
}

function origin(node: ts.Node, match: Match, visited = new Set<ts.Node>()): boolean {
  if (visited.has(node)) return false
  visited.add(node)
  if (match(node)) return true
  const defined = ts.isIdentifier(node) ? declaration(node) : undefined
  if (defined && ts.isVariableDeclaration(defined) && defined.initializer) {
    if (match(defined) || origin(defined.initializer, match, visited)) return true
  }
  return !!ts.forEachChild(node, child => origin(child, match, visited) || undefined)
}

function executed(e: Seen, operation: string, match: (call: ts.CallExpression) => boolean) {
  const { tree } = document(e.files['main.ts'])
  const lines = new Set(e.calls.filter(call => call.name === operation).map(call => call.line))
  return !!findNode(tree, node => {
    if (!ts.isCallExpression(node) || node.expression.getText(tree) !== operation) return false
    const line = tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1
    return lines.has(line) && match(node)
  })
}

export function feeds(e: Seen, operation: string, ...matches: Match[]) {
  return executed(e, operation, call => !!call.arguments[0] &&
    matches.every(match => origin(call.arguments[0], match)))
}

export const binary = (operator: string): Match => node =>
  ts.isBinaryExpression(node) && node.operatorToken.getText() === operator

export const literal = (text: string): Match => node => ts.isStringLiteral(node) && node.text === text

export const shape = (kind: 'array' | 'object' | 'template' | 'index' | 'negation'): Match => node => {
  switch (kind) {
    case 'array': return ts.isArrayLiteralExpression(node)
    case 'object': return ts.isObjectLiteralExpression(node)
    case 'template': return ts.isTemplateExpression(node)
    case 'index': return ts.isElementAccessExpression(node)
    case 'negation': return ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.ExclamationToken
  }
}

export const constant: Match = node => ts.isVariableDeclaration(node) &&
  !!(node.parent.flags & ts.NodeFlags.Const)

export const annotation = (type: string): Match => node => ts.isVariableDeclaration(node) &&
  node.type?.getText().replace(/\s/g, '') === type

export const inks: Match = node => {
  if (!ts.isVariableDeclaration(node) || !node.type || !ts.isUnionTypeNode(node.type)) return false
  const values = node.type.types.map(type => ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal)
    ? type.literal.text : undefined)
  return values.length === 2 && values.includes('blue') && values.includes('gold')
}

export const reading = (operation: string): Match => node => ts.isVariableDeclaration(node) &&
  !!node.initializer && ts.isCallExpression(node.initializer) && node.initializer.expression.getText() === operation

export function updated(e: Seen, operation: string, method?: 'push', originalText?: string) {
  return executed(e, operation, call => {
    const argument = call.arguments[0]
    if (!argument || !ts.isIdentifier(argument)) return false
    const variable = declaration(argument)
    if (!variable || !ts.isVariableDeclaration(variable)) return false
    if (originalText) {
      const original = variable.initializer && declaration(variable.initializer)
      if (!original || !ts.isVariableDeclaration(original) || !constant(original) ||
        !original.initializer || !ts.isStringLiteral(original.initializer) || original.initializer.text !== originalText) return false
    }
    return !!findNode(call.getSourceFile(), node => {
      if (node.pos < variable.end || node.end > call.pos) return false
      if (method) return ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === method && declaration(node.expression.expression) === variable
      return ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        declaration(node.left) === variable && !!(variable.parent.flags & ts.NodeFlags.Let)
    })
  })
}

export const property = (field: string): Match => node =>
  ts.isPropertyAccessExpression(node) && node.name.text === field

export const helperResult = (resultType?: string, arrow = false): Match => node => {
  if (!ts.isCallExpression(node)) return false
  const defined = declaration(node.expression)
  if (!defined) return false
  const fn = ts.isVariableDeclaration(defined) ? defined.initializer : defined
  if (!fn || !(ts.isFunctionDeclaration(fn) || ts.isArrowFunction(fn)) || !fn.body) return false
  if (arrow && !ts.isArrowFunction(fn) || resultType && fn.type?.getText() !== resultType) return false
  return !ts.isBlock(fn.body) || !!findNode(fn.body, ts.isReturnStatement)
}

export function insideHelper(e: Seen, operation: string, parameterTypes: string[]) {
  return executed(e, operation, call => {
    const fn = owner(call)
    return !!fn && fn.parameters.length === parameterTypes.length &&
      fn.parameters.every((parameter, index) => parameter.type?.getText() === parameterTypes[index] &&
        !!call.arguments[0] && origin(call.arguments[0], node => declaration(node) === parameter))
  })
}

export function inBlock(e: Seen, operation: string, ...blocks: ('for' | 'forOf' | 'while' | 'if' | 'elseIf')[]) {
  return executed(e, operation, call => blocks.every(block => !!ts.findAncestor(call.parent, node => {
    switch (block) {
      case 'for': return ts.isForStatement(node)
      case 'forOf': return ts.isForOfStatement(node)
      case 'while': return ts.isWhileStatement(node)
      case 'if': return ts.isIfStatement(node)
      case 'elseIf': return ts.isIfStatement(node) && !!node.elseStatement && ts.isIfStatement(node.elseStatement)
    }
  })))
}

export function accumulated(e: Seen) {
  return executed(e, 'showScore', call => {
    const total = call.arguments[0] && declaration(call.arguments[0])
    return !!total && !!findNode(call.getSourceFile(), loop => ts.isForOfStatement(loop) &&
      !!findNode(loop.statement, node => ts.isBinaryExpression(node) && declaration(node.left) === total &&
        (node.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken || origin(node.right, binary('+')))))
  })
}

export const interfaceBooking: Match = node => {
  if (!ts.isVariableDeclaration(node) || !node.type || !ts.isTypeReferenceNode(node.type)) return false
  const definitions = cached?.checker.getSymbolAtLocation(node.type.typeName)?.declarations ?? []
  return definitions.some(type => ts.isInterfaceDeclaration(type) &&
    ['name:string', 'seats:number'].every(field => type.members.some(member =>
      ts.isPropertySignature(member) && member.name.getText() + ':' + member.type?.getText() === field)))
}

export const numeral = (value: number): Match => node => ts.isNumericLiteral(node) && Number(node.text) === value

export function ticketKept(e: Seen) {
  const { tree } = document(e.files['main.ts'])
  return !!findNode(tree, node => ts.isVariableDeclaration(node) && constant(node) &&
    !!node.initializer &&
    ts.isStringLiteral(node.initializer) && node.initializer.text === 'West')
}
