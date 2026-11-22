// Evaluated inside QuickJS before loading any player modules. The returned helpers
// stay in host-owned handles. Guest values only cross the boundary as primitives.
export const guestSetup = String.raw`
(function install(initial, operations, call, log, ambient, bindings) {
  "use strict";
  delete Math.random;
  delete globalThis.Date;
  const parse = JSON.parse, stringify = JSON.stringify, finite = Number.isFinite;
  const own = Object.getOwnPropertyDescriptor, keys = Object.keys, isArray = Array.isArray;
  const prototypeOf = Object.getPrototypeOf, objectPrototype = Object.prototype;
  const has = Function.prototype.call.bind(Object.prototype.hasOwnProperty);
  const cut = Function.prototype.call.bind(String.prototype.slice);
  const define = Object.defineProperty, freeze = Object.freeze, create = Object.create;
  const Fault = Error, string = String;
  const memory = parse(initial);
  const global = (key, value) => define(globalThis, key, { value, configurable: false, writable: false });

  // Walk data properties only. Cap work before expanding arrays or constructing
  // the output string. Proxy traps, if present, execute under the VM interrupt.
  function snapshot(data = memory) {
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
    visit(data, 0);
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

  function readonly(value) {
    if (value && typeof value === "object") {
      for (const key of keys(value)) readonly(value[key]);
      freeze(value);
    }
    return value;
  }
  for (const [name, value] of Object.entries(parse(bindings))) global(name, readonly(value));

  const api = create(null);
  function result(reply) { return reply === undefined ? undefined : parse(reply); }
  for (const name of parse(operations)) {
    const method = (...args) => {
      if (args.length > 4) throw new Fault("Use at most four arguments.");
      const at = i => args[i] === undefined || typeof args[i] === "number" ? args[i] : snapshot(args[i]);
      return result(call(name, args.length, at(0), at(1), at(2), at(3), cut(new Fault().stack, 0, 4096)));
    };
    api[name] = freeze(method);
    if (ambient) global(name, method);
  }
  freeze(api);
  define(globalThis, "__inherit", { value: api, configurable: true });

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
  return { snapshot, errorText, exported };
})
`

// Install the built-in module before any player module runs. Only its exports survive.
export function inheritModule(names: readonly string[]) {
  return names.map(name => 'export const ' + name + ' = globalThis.__inherit.' + name).join('\n') +
    '\ndelete globalThis.__inherit'
}
