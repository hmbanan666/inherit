function distance(a: string, b: string) {
  let row = Array.from({length:b.length+1},(_,i)=>i)
  for (let i=0; i<a.length; i++) {
    const next = [i+1]
    for (let j=0; j<b.length; j++) next.push(Math.min(row[j+1]+1,next[j]+1,row[j]+Number(a[i]!==b[j])))
    row = next
  }
  return row[b.length]
}
export function playerError(cause: unknown, names: readonly string[]) {
  const text = cause instanceof Error ? cause.message : 'Your code stopped.'
  const at = text.match(/^.*?\.ts(?::\d+)? · /)?.[0] ?? ''
  if (/unterminated string/i.test(text)) return at + 'Close the words with a matching quote.'
  const bracket = /'([)}\]])' expected/i.exec(text)
  if (bracket) return at + 'Add the closing ' + bracket[1] + ' to match the opening one.'
  const missing = /['"]?([A-Za-z_$][\w$]*)['"]? is not defined/.exec(text)
  if (!missing) return text
  const name = missing[1]
  const best = names.map(n=>({name:n,delta:distance(n,name)})).sort((a,b)=>a.delta-b.delta)[0]
  return at + 'Unknown name “' + name + '”.' + (best && best.delta<=2 ? ' Did you mean “'+best.name+'”?' : ' Check the spelling on this line.')
}
