export const sandboxDeclarations = `
type MemoryValue = null | boolean | number | string | MemoryValue[] | { [key: string]: MemoryValue }
/** Keep a value between ticks and deploys. @example memory.batches = 1 */
declare const memory: { [key: string]: MemoryValue }
interface Console {
  /** Print a value in the workshop console. @example console.log(ctx.tick) */
  log(...values: unknown[]): void
}
declare var console: Console
declare function test(name: string, fn: (ctx: import('inherit').Factory) => void): void
declare function assert(condition: unknown, message?: string): asserts condition
declare function equal(actual: unknown, expected: unknown, message?: string): void
`
