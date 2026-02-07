// app.test.js
const addNumbers = require('./app');

// Test cases
describe('addNumbers', () => {
    // Test normal cases
    test('should return the sum of two positive numbers', () => {
        expect(addNumbers(2, 3)).toBe(5);
    });

    test('should return the sum of two negative numbers', () => {
        expect(addNumbers(-2, -3)).toBe(-5);
    });

    test('should return the sum of a positive and negative number', () => {
        expect(addNumbers(5, -3)).toBe(2);
    });

    test('should return the sum of decimal numbers', () => {
        expect(addNumbers(2.5, 3.7)).toBe(6.2);
    });

    test('should return the sum when one number is zero', () => {
        expect(addNumbers(0, 5)).toBe(5);
        expect(addNumbers(10, 0)).toBe(10);
    });

    test('should return zero when both numbers are zero', () => {
        expect(addNumbers(0, 0)).toBe(0);
    });

    // Test error cases
    test('should throw an error when first parameter is not a number', () => {
        expect(() => addNumbers('2', 3)).toThrow('Both parameters must be numbers');
        expect(() => addNumbers(null, 3)).toThrow('Both parameters must be numbers');
        expect(() => addNumbers(undefined, 3)).toThrow('Both parameters must be numbers');
    });

    test('should throw an error when second parameter is not a number', () => {
        expect(() => addNumbers(2, '3')).toThrow('Both parameters must be numbers');
        expect(() => addNumbers(2, null)).toThrow('Both parameters must be numbers');
        expect(() => addNumbers(2, undefined)).toThrow('Both parameters must be numbers');
    });

    test('should throw an error when both parameters are not numbers', () => {
        expect(() => addNumbers('2', '3')).toThrow('Both parameters must be numbers');
    });
});