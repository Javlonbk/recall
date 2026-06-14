# JavaScript Interview Questions — ordered prep list

Worked through **one block at a time, top to bottom**. Blocks are ordered by interview ROI:
Tier 1 (1–5) shows up in almost every JS interview, Tier 2 (6–9) is core fundamentals,
Tier 3 (10–12) is the coding round and senior/edge material.

Each question is tagged by the **format** an interviewer uses — cover all three per topic:

- **[C]** Conceptual — "explain X"
- **[O]** Output — "what does this log?"
- **[I]** Implement — "write X by hand"

Tick a box when its Interview card is written and you can answer it out loud in ~60s.

---

## Tier 1 — asked in almost every interview

### 1. Closures
- [ ] [C] What is a closure, and how does lexical scope create one?
- [ ] [C] Real-world uses: data privacy, factories, currying, memoization, event handlers
- [ ] [C] Does a closure capture the value or the variable (live reference)?
- [ ] [O] Classic bug: `for (var i…)` + `setTimeout` — what logs, and why?
- [ ] [I] Fix the loop bug three ways (`let`, IIFE, second arg)
- [ ] [I] Private counter with `++`/`--` and no exposed state
- [ ] [I] `once(fn)` — run a function at most once
- [ ] [I] `memoize(fn)` — cache results by arguments
- [ ] [C] How do closures cause memory leaks, and how do you avoid them?

### 2. `this` & binding
- [ ] [C] How is `this` determined? The four binding rules and their priority
- [ ] [C] `call` vs `apply` vs `bind`
- [ ] [C] Arrow functions and `this` — when they fix it, when they break it
- [ ] [O] `obj.method()` vs `const f = obj.method; f()` — what is `this`?
- [ ] [O] `this` inside `setTimeout`, a nested function, a forEach callback
- [ ] [I] Implement `Function.prototype.bind`
- [ ] [I] Implement `call` and `apply`
- [ ] [C] Why class/React methods lose `this`, and how binding fixes it

### 3. Prototypes & inheritance
- [ ] [C] What is prototypal inheritance?
- [ ] [C] `__proto__` vs `prototype` — the difference
- [ ] [C] How does prototype-chain lookup work (reads vs writes)?
- [ ] [C] What does `new` do, step by step?
- [ ] [I] Implement `new` (`myNew(Ctor, ...args)`)
- [ ] [C] `Object.create` — what it does and when to use it
- [ ] [C] `hasOwnProperty` vs the `in` operator
- [ ] [C] `class` syntax vs prototypes — what's under the hood, `extends`/`super`

### 4. Event loop & async ordering
- [ ] [C] Explain the event loop: call stack, Web APIs, task queue
- [ ] [C] Microtask vs macrotask queue — what goes where
- [ ] [O] Order the output: sync, `setTimeout`, `Promise.then`, `async/await`
- [ ] [C] Where do `await` continuations resume (microtask)?
- [ ] [C] Why does `setTimeout(fn, 0)` not run immediately?
- [ ] [C] What is the call stack? What is a stack overflow?
- [ ] [O] Mixed puzzle: sync + micro + macro interleaving

### 5. Promises & async/await
- [ ] [C] What is a Promise? Its three states and transitions
- [ ] [C] `then`/`catch`/`finally` and chaining (return vs throw)
- [ ] [C] `Promise.all` vs `race` vs `allSettled` vs `any`
- [ ] [C] `async/await` and how it relates to promises
- [ ] [C] Error handling: `try/catch` with `await` vs `.catch`
- [ ] [O] What does this `async` snippet log / resolve to?
- [ ] [C] Common mistakes: missing `await`, `await` in a loop, unhandled rejection
- [ ] [I] Implement `Promise.all`
- [ ] [I] Implement `sleep(ms)` / `delay`
- [ ] [I] `promisify` a callback-style function
- [ ] [I] Run promises in sequence vs in parallel
- [ ] [I] Retry a promise N times with backoff

---

## Tier 2 — core fundamentals

### 6. `var`/`let`/`const`, hoisting, TDZ, scope
- [ ] [C] `var` vs `let` vs `const`: scope, hoisting, redeclare, reassign
- [ ] [C] What is hoisting? Functions vs `var` vs `let`/`const`
- [ ] [C] What is the temporal dead zone (TDZ)?
- [ ] [C] Function scope vs block scope
- [ ] [C] Lexical scope and the scope chain
- [ ] [O] Hoisting output puzzles
- [ ] [C] Does `const` make a value immutable? (`Object.freeze`)
- [ ] [C] Global scope: `var` as a global property, `globalThis`

### 7. Coercion, `==` vs `===`, `typeof`, equality
- [ ] [C] `==` vs `===` — and when `==` is acceptable
- [ ] [C] Coercion rules: `ToPrimitive`, `ToNumber`, `ToString`
- [ ] [O] `[] + []`, `[] + {}`, `{}` + `[]`, `'5' - 1`, `1 + '1'`
- [ ] [C] The full list of falsy values
- [ ] [C] `typeof` quirks: `null`, `NaN`, functions, arrays
- [ ] [C] Reliably check: array, `NaN`, `null`, plain object
- [ ] [C] `NaN`: why `NaN !== NaN`, `isNaN` vs `Number.isNaN`
- [ ] [O] Coercion puzzles with `null` / `undefined` / `NaN`
- [ ] [C] `Object.is` vs `===`; shallow vs deep equality

### 8. Functions
- [ ] [C] Function declaration vs expression (hoisting difference)
- [ ] [C] IIFE — what it is and why it was used
- [ ] [C] Arrow vs regular: `this`, `arguments`, hoisting, as constructor
- [ ] [C] Higher-order functions
- [ ] [C] Currying — what and why
- [ ] [I] Implement `curry`
- [ ] [C] Default, rest, and spread parameters; the `arguments` object
- [ ] [C] Pure functions and side effects
- [ ] [I] Implement `compose` / `pipe`

### 9. Objects & arrays
- [ ] [C] Pass by value vs pass by reference
- [ ] [C] Shallow vs deep copy
- [ ] [I] Deep clone an object — `structuredClone`, JSON trick, circular refs
- [ ] [C] Spread vs `Object.assign`
- [ ] [C] Destructuring: object/array, defaults, renaming, nested
- [ ] [C] `map` / `filter` / `reduce` — when to use each
- [ ] [I] Polyfill `reduce` (and `map`)
- [ ] [C] Mutating vs non-mutating array methods
- [ ] [I] Flatten a nested array (and `flat(Infinity)`)
- [ ] [I] Group an array by a key
- [ ] [C] `Object.freeze` / `seal` / `preventExtensions`
- [ ] [C] Iterate an object: `keys`/`values`/`entries`, `for...in` vs `for...of`

---

## Tier 3 — coding round & senior

### 10. Core coding challenges
- [ ] [I] `debounce`
- [ ] [I] `throttle`
- [ ] [C] debounce vs throttle — difference and use cases
- [ ] [I] `memoize`
- [ ] [I] `curry`
- [ ] [I] `deepClone`
- [ ] [I] flatten a nested array
- [ ] [I] `EventEmitter` (`on` / `emit` / `off`)
- [ ] [I] Pub/Sub
- [ ] [I] `Promise.all`
- [ ] [I] `bind` / `call` / `apply` polyfills
- [ ] [I] `chunk(array, size)`
- [ ] [I] Polyfill `map` / `filter` / `reduce`

### 11. ES6+ features
- [ ] [C] `Map` vs `Object`; `Set`; `WeakMap` / `WeakSet`
- [ ] [C] `Symbol` — what it is and what it's for
- [ ] [C] Generators — `yield` and use cases
- [ ] [C] Iterators and the iterable protocol
- [ ] [C] Modules: ESM vs CommonJS, default vs named exports
- [ ] [C] Template literals and tagged templates
- [ ] [C] `for...of` vs `for...in`

### 12. Misc / advanced
- [ ] [C] Garbage collection — mark and sweep
- [ ] [C] Common memory leaks: closures, timers, listeners, globals
- [ ] [C] Event delegation; bubbling vs capturing
- [ ] [C] `localStorage` vs `sessionStorage` vs cookies
- [ ] [C] Synchronous vs asynchronous
- [ ] [C] Strict mode — what it changes
- [ ] [C] Recursion — pros, cons, and the call stack
