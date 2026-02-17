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

test('sum with multiple arguments', () => {
  expect(sum(1, 2, 3, 4)).toBe(10)
})

test('subtract with no arguments returns 0', () => {
  expect(subtract()).toBe(0)
})

test('subtract with one argument returns negative of that argument', () => {
  expect(subtract(5)).toBe(-5)
})

test('subtract with multiple arguments', () => {
  expect(subtract(10, 3, 2)).toBe(5)
})

test('multiply with no arguments returns 0', () => {
  expect(multiply()).toBe(0)
})

test('multiply with one argument returns that argument', () => {
  expect(multiply(5)).toBe(5)
})

test('multiply with multiple arguments', () => {
  expect(multiply(2, 3, 4)).toBe(24)
})

test('divide with no arguments returns NaN', () => {
  expect(isNaN(divide())).toBe(true)
})

test('divide with one argument returns 1 divided by that argument', () => {
  expect(divide(2)).toBe(0.5)
})

test('divide with multiple arguments', () => {
  expect(divide(10, 2, 5)).toBe(1)
})

test('divide by zero throws error', () => {
  expect(() => divide(10, 0)).toThrow('Division by zero')
})

test('pow function works correctly', () => {
  expect(pow(2, 3)).toBe(8)
})

test('sqrt function works correctly', () => {
  expect(sqrt(9)).toBe(3)
})

test('average with no arguments returns NaN', () => {
  expect(isNaN(average())).toBe(true)
})

test('average with arguments', () => {
  expect(average(1, 2, 3)).toBe(2)
})

test('abs function works correctly', () => {
  expect(abs(-5)).toBe(5)
})

test('negate function works correctly', () => {
  expect(negate(5)).toBe(-5)
})

test('percent with one argument returns value divided by 100', () => {
  expect(percent(50)).toBe(0.5)
})

test('percent with two arguments returns percentage of the second argument', () => {
  expect(percent(25, 200)).toBe(50)
})

test('subtract with negative numbers', () => {
  expect(subtract(-5, -3)).toBe(-2)
})

test('multiply with negative numbers', () => {
  expect(multiply(-2, 3)).toBe(-6)
})

test('divide with negative numbers', () => {
  expect(divide(-10, 2)).toBe(-5)
})

test('average with negative numbers', () => {
  expect(average(-1, -2, -3)).toBe(-2)
})

test('percent with negative numbers', () => {
  expect(percent(-25, 200)).toBe(-50)
})