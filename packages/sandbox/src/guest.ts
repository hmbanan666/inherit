// Evaluated inside QuickJS before loading any player modules. The returned helpers
// stay in host-owned handles. Guest values only cross the boundary as primitives.
export const guestSetup = String.raw`
(function install(initial, operations, call, tick, log, testing, chapter) {
  "use strict";
  delete Math.random;
  delete globalThis.Date;
  const parse = JSON.parse, stringify = JSON.stringify, finite = Number.isFinite;
  const own = Object.getOwnPropertyDescriptor, keys = Object.keys, isArray = Array.isArray;
  const prototypeOf = Object.getPrototypeOf, objectPrototype = Object.prototype;
  const has = Function.prototype.call.bind(Object.prototype.hasOwnProperty);
  const cut = Function.prototype.call.bind(String.prototype.slice);
  const define = Object.defineProperty, freeze = Object.freeze, create = Object.create;
  const Fault = Error, same = Object.is, string = String;
  const memory = parse(initial);
  const global = (key, value) => define(globalThis, key, { value, configurable: false, writable: false });
  if (!chapter) global("memory", memory);

  // Walk data properties only. Cap work before expanding arrays or constructing
  // the output string. Proxy traps, if present, execute under the VM interrupt.
  function snapshot() {
    let text = "", nodes = 0;
    const parents = create(null);
    function append(part) {
      if (part.length + text.length > 64000) throw new Fault("Memory exceeds 64,000 JSON characters.");
      text += part;
    }
    function quoted(s) {
      if (s.length > 64000) throw new Fault("Memory string is too large.");
      append(stringify(s));
    }
    function visit(value, depth) {
      if (++nodes > 8192 || depth > 32) throw new Fault("Memory exceeds JSON complexity limit.");
      if (value === null || typeof value === "boolean" || finite(value)) return append(string(value));
      if (typeof value === "string") return quoted(value);
      if (typeof value !== "object") throw new Fault("Memory requires JSON values.");
      for (let i = 0; i < depth; i++) if (parents[i] === value) throw new Fault("Cyclic memory.");
      parents[depth] = value;
      const array = isArray(value);
      if (!array) {
        const proto = prototypeOf(value);
        if (proto !== null && proto !== objectPrototype) throw new Fault("Memory requires plain JSON objects.");
      }
      const names = array ? null : keys(value);
      const count = array ? own(value, "length").value : names.length;
      if (count > 8192) throw new Fault("Memory exceeds JSON complexity limit.");
      append(array ? "[" : "{");
      for (let i = 0; i < count; i++) {
        if (i) append(",");
        const key = array ? i : names[i];
        if (!array) { quoted(key); append(":"); }
        const prop = own(value, key);
        if (!prop || !has(prop, "value")) throw new Fault("Memory requires JSON data properties.");
        visit(prop.value, depth + 1);
      }
      append(array ? "]" : "}");
    }
    visit(memory, 0);
    return text;
  }

  function label(value) {
    if (typeof value === "string") return cut(value, 0, 512);
    if (value === null || typeof value === "boolean" || typeof value === "number" || value === undefined)
      return string(value);
    return "[" + typeof value + "]";
  }
  global("console", freeze({ log(...values) {
    let line = "";
    for (let i = 0; i < values.length && i < 8 && line.length < 512; i++)
      line += (i ? " " : "") + label(values[i]);
    log(stringify(cut(line, 0, 512)));
  } }));

  const api = create(null);
  define(api, "tick", { get: tick });
  define(api, "memory", { value: memory });
  const blueprintApi = create(null);
  function arg(value) {
    if (value === undefined) return undefined;
    if (typeof value !== "string" || value.length > 256)
      throw new Fault("Expected a short string factory argument.");
    return stringify(value);
  }
  function coordinate(value) {
    if (typeof value !== "number") throw new Fault("Expected a numeric build coordinate.");
    return value;
  }
  function result(reply) { return reply === undefined ? undefined : parse(reply); }
  for (const name of parse(operations)) {
    if (name === "build") {
      blueprintApi.build = (kind, opts) => {
        if (opts !== undefined && (!opts || typeof opts !== "object" || isArray(opts)))
          throw new Fault("Expected build options.");
        return result(call(name, 6, arg(kind), arg(opts?.name),
          opts?.x === undefined ? undefined : coordinate(opts.x),
          opts?.y === undefined ? undefined : coordinate(opts.y),
          arg(opts?.recipe), arg(opts?.deposit)));
      };
      continue;
    }
    const target = name === "connect" || name === "dismantle" || name === "lastError" ? blueprintApi : api;
    target[name] = (...args) => {
      if (args.length > 4) throw new Fault("Too many factory arguments.");
      const at = i => i < args.length ? arg(args[i]) : undefined;
      return result(call(name, args.length, at(0), at(1), at(2), at(3), chapter ? cut(new Fault().stack, 0, 4096) : undefined));
    };
  }
  freeze(api);
  const descriptors = Object.getOwnPropertyDescriptors(api);
  delete descriptors.dispatch;
  Object.defineProperties(blueprintApi, descriptors);
  freeze(blueprintApi);

  define(globalThis, "__inherit", { value: api, configurable: true });

  const cases = create(null);
  let count = 0, collecting = testing;
  if (!chapter) global("test", (name, fn) => {
    if (!collecting) return;
    if (count >= 32) throw new Fault("Maximum 32 player tests.");
    if (typeof name !== "string" || typeof fn !== "function") throw new Fault("Expected test(name, fn).");
    cases[count++] = { name: cut(name, 0, 128), fn };
  });
  if (!chapter) global("assert", (ok, message) => { if (!ok) throw new Fault(label(message ?? "Assertion failed.")); });
  if (!chapter) global("equal", (actual, expected, message) => {
    if (!same(actual, expected))
      throw new Fault(message === undefined ? "Expected " + label(expected) + ", received " + label(actual) : label(message));
  });

  function errorText(e) {
    if (typeof e === "string") return "[" + stringify(cut(e, 0, 1024)) + ',""]';
    if (!e || (typeof e !== "object" && typeof e !== "function")) return '["",""]';
    const data = key => {
      const prop = own(e, key);
      return prop && has(prop, "value") && typeof prop.value === "string" ? cut(prop.value, 0, 2048) : "";
    };
    return "[" + stringify(data("message")) + "," + stringify(data("stack")) + "]";
  }
  function exported(namespace, name) {
    const property = own(namespace, name);
    return property && has(property, "value") ? property.value : undefined;
  }
  return { api, blueprintApi, snapshot, parse, errorText, exported, finishTests() { collecting = false; return count; },
    testName(i) { return stringify(cases[i].name); }, runTest(i) { return cases[i].fn(blueprintApi); } };
})
`

// Install the built-in module before any player module runs. Only its exports survive.
export function inheritModule(names: readonly string[]) {
  return names.map(name => 'export const ' + name + ' = globalThis.__inherit.' + name).join('\n') +
    '\ndelete globalThis.__inherit'
}
