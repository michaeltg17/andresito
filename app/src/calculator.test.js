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

test('sum with multiple arguments works correctly', () => {
  expect(sum(1, 2, 3, 4)).toBe(10)
})

test('sum with zero argument returns zero', () => {
  expect(sum(0)).toBe(0)
})

test('subtract with no arguments returns 0', () => {
  expect(subtract()).toBe(0)
})

test('subtract with one argument returns negative of that argument', () => {
  expect(subtract(5)).toBe(-5)
})

test('subtract with multiple arguments works correctly', () => {
  expect(subtract(10, 2, 3)).toBe(5)
})

test('subtract with zero argument returns zero', () => {
  expect(subtract(0)).toBe(0)
})

test('multiply with no arguments returns 0', () => {
  expect(multiply()).toBe(0)
})

test('multiply with one argument returns that argument', () => {
  expect(multiply(5)).toBe(5)
})

test('multiply with multiple arguments works correctly', () => {
  expect(multiply(2, 3, 4)).toBe(24)
})

test('multiply with zero argument returns zero', () => {
  expect(multiply(0)).toBe(0)
})

test('divide with no arguments returns NaN', () => {
  expect(divide()).toBeNaN()
})

test('divide with one argument returns reciprocal', () => {
  expect(divide(5)).toBe(1/5)
})

test('divide with multiple arguments works correctly', () => {
  expect(divide(24, 2, 3)).toBe(4)
})

test('divide by zero throws error', () => {
  expect(() => divide(10, 0)).toThrow('Division by zero')
})

test('divide with zero argument throws error', () => {
  expect(() => divide(0)).toThrow('Division by zero')
})

test('pow function works correctly', () => {
  expect(pow(2, 3)).toBe(8)
})

test('sqrt function works correctly', () => {
  expect(sqrt(9)).toBe(3)
})

test('average with no arguments returns NaN', () => {
  expect(average()).toBeNaN()
})

test('average with arguments returns correct value', () => {
  expect(average(2, 4, 6)).toBe(4)
})

test('average with multiple arguments works correctly', () => {
  expect(average(1, 2, 3, 4, 5)).toBe(3)
})

test('abs function works correctly', () => {
  expect(abs(-5)).toBe(5)
})

test('negate function works correctly', () => {
  expect(negate(5)).toBe(-5)
})

test('percent function works correctly', () => {
  expect(percent(50)).toBe(0.5)
  expect(percent(50, 100)).toBe(50)
})