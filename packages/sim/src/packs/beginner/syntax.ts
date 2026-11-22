import ts from 'typescript'
import type { Files } from '../../framework/pack'

let lastSource: string | undefined
let lastTree: ts.SourceFile
function tree(files: Files) {
  if (files['main.ts'] !== lastSource) {
    lastSource = files['main.ts']
    lastTree = ts.createSourceFile('main.ts',lastSource,ts.ScriptTarget.Latest,true)
  }
  return lastTree
}
function inside(node: ts.Node, match: (node: ts.Node) => boolean): boolean {
  return match(node) || !!ts.forEachChild(node, child => inside(child,match) || undefined)
}
function namedCall(node: ts.Node, name: string): node is ts.CallExpression {
  return ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === name
}
export function boundArgument(files: Files, call: string, from?: string) {
  const root = tree(files)
  return inside(root, n => {
    if (!namedCall(n,call) || !n.arguments.length || !ts.isIdentifier(n.arguments[0])) return false
    const name = n.arguments[0].text
    return inside(root, d => ts.isVariableDeclaration(d) && ts.isIdentifier(d.name) && d.name.text === name &&
      !!d.initializer && (!from || namedCall(d.initializer,from)))
  })
}
export function reassignedFlag(files: Files) {
  const root = tree(files)
  return inside(root, c => namedCall(c,'hangFlag') && !!c.arguments[0] && ts.isIdentifier(c.arguments[0]) &&
    inside(root, d => ts.isBinaryExpression(d) && d.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isIdentifier(d.left) && d.left.text === c.arguments[0].getText(root)))
}
export function addsCounts(files: Files) {
  return inside(tree(files),n => ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.PlusToken &&
    ts.isIdentifier(n.left) && ts.isIdentifier(n.right))
}
export function parameterFeeds(files: Files, helper: string, call: string) {
  return inside(tree(files),fn => ts.isFunctionDeclaration(fn) && fn.name?.text === helper && !!fn.body &&
    fn.parameters.some(p => !!p.type && inside(fn.body!, c => namedCall(c,call) && c.arguments[0]?.getText() === p.name.getText())))
}
export function branchCalls(files: Files, yes: string, no?: string) {
  return inside(tree(files),n => ts.isIfStatement(n) && inside(n.thenStatement,c=>namedCall(c,yes)) &&
    (!no || (!!n.elseStatement && inside(n.elseStatement,c=>namedCall(c,no)))))
}
export function comparesCount(files: Files) {
  return inside(tree(files),n => ts.isIfStatement(n) && ts.isBinaryExpression(n.expression) &&
    [ts.SyntaxKind.GreaterThanEqualsToken,ts.SyntaxKind.LessThanEqualsToken,ts.SyntaxKind.GreaterThanToken,ts.SyntaxKind.LessThanToken].includes(n.expression.operatorToken.kind) &&
    inside(n.thenStatement,c=>namedCall(c,'setPicnic')))
}
export function loopCalls(files: Files, call: string, list = false) {
  return inside(tree(files),n => (list ? ts.isForOfStatement(n) : ts.isForStatement(n)) &&
    inside((n as ts.IterationStatement).statement,c=>namedCall(c,call)))
}
