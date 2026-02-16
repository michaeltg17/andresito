import { sum, subtract, multiply, divide, pow, sqrt, average, abs, negate, percent } from './calculator'

test('adds 2 + 3 = 5', () => {
  expect(sum(2, 3)).toBe(5)
})

test('sum with no arguments returns 0', () => {
  expect(sum()).toBe(0)
})

test('sum with one argument returns that argument', () => {
  expect(sum(5)).toBe(5)
})

test('sum with multiple arguments returns correct sum', () => {
  expect(sum(1, 2, 3, 4)).toBe(10)
})

test('subtract with no arguments returns 0', () => {
  expect(subtract()).toBe(0)
})

test('subtract with one argument returns negative of that argument', () => {
  expect(subtract(5)).toBe(-5)
})

test('subtract with multiple arguments returns correct result', () => {
  expect(subtract(10, 3, 2)).toBe(5)
})

test('multiply with no arguments returns 0', () => {
  expect(multiply()).toBe(0)
})

test('multiply with one argument returns that argument', () => {
  expect(multiply(5)).toBe(5)
})

test('multiply with multiple arguments returns correct product', () => {
  expect(multiply(2, 3, 4)).toBe(24)
})

test('divide with no arguments returns NaN', () => {
  expect(isNaN(divide())).toBe(true)
})

test('divide with one argument returns reciprocal', () => {
  expect(divide(4)).toBe(0.25)
})

test('divide with multiple arguments returns correct result', () => {
  expect(divide(10, 2, 5)).toBe(1)
})

test('divide by zero throws error', () => {
  expect(() => divide(10, 0)).toThrow('Division by zero')
})

test('pow returns correct power', () => {
  expect(pow(2, 3)).toBe(8)
})

test('sqrt returns correct square root', () => {
  expect(sqrt(9)).toBe(3)
})

test('average with no arguments returns NaN', () => {
  expect(isNaN(average())).toBe(true)
})

test('average with arguments returns correct average', () => {
  expect(average(2, 4, 6)).toBe(4)
})

test('abs returns absolute value', () => {
  expect(abs(-5)).toBe(5)
})

test('negate returns negative value', () => {
  expect(negate(5)).toBe(-5)
})

test('percent with one argument returns percentage', () => {
  expect(percent(50)).toBe(0.5)
})

test('percent with two arguments returns percentage of value', () => {
  expect(percent(25, 200)).toBe(50)
})

test('sum with negative numbers works correctly', () => {
  expect(sum(-1, -2, -3)).toBe(-6)
})

test('subtract with negative numbers works correctly', () => {
  expect(subtract(-5, -3)).toBe(-2)
})

test('multiply with negative numbers works correctly', () => {
  expect(multiply(-2, 3)).toBe(-6)
})

test('divide with negative numbers works correctly', () => {
  expect(divide(-10, 2)).toBe(-5)
})

test('average with negative numbers works correctly', () => {
  expect(average(-2, -4, -6)).toBe(-4)
})

test('percent with zero returns zero', () => {
  expect(percent(0)).toBe(0)
})

test('percent with zero as second argument returns zero', () => {
  expect(percent(50, 0)).toBe(0)
})

test('sum with zero arguments returns 0', () => {
  expect(sum()).toBe(0)
})

test('subtract with zero arguments returns 0', () => {
  expect(subtract()).toBe(0)
})

test('multiply with zero arguments returns 0', () => {
  expect(multiply()).toBe(0)
})

test('divide with zero arguments returns NaN', () => {
  expect(isNaN(divide())).toBe(true)
})