export function sum(...args) {
  if (args.length === 0) return 0
  return args.reduce((acc, v) => acc + v, 0)
}

export function subtract(...args) {
  if (args.length === 0) return 0
  if (args.length === 1) return -args[0]
  return args.slice(1).reduce((acc, v) => acc - v, args[0])
}

export function multiply(...args) {
  if (args.length === 0) return 0
  return args.reduce((acc, v) => acc * v, 1)
}

export function divide(...args) {
  if (args.length === 0) return NaN
  if (args.length === 1) return 1 / args[0]
  return args.slice(1).reduce((acc, v) => {
    if (v === 0) throw new Error('Division by zero')
    return acc / v
  }, args[0])
}

export function pow(a, b) {
  return Math.pow(a, b)
}

export function sqrt(a) {
  return Math.sqrt(a)
}

export function average(...args) {
  if (args.length === 0) return NaN
  return sum(...args) / args.length
}

export function abs(a) {
  return Math.abs(a)
}

export function negate(a) {
  return -a
}

export function percent(value, of) {
  if (of === undefined) return value / 100
  return (value / 100) * of
}