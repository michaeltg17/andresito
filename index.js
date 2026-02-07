// index.js
const addNumbers = require('./app');

// Example usage
try {
    const result = addNumbers(10, 20);
    console.log(`The sum is: ${result}`);
    
    // More examples
    console.log(`5 + 3 = ${addNumbers(5, 3)}`);
    console.log(`-2 + 7 = ${addNumbers(-2, 7)}`);
    console.log(`1.5 + 2.5 = ${addNumbers(1.5, 2.5)}`);
} catch (error) {
    console.error('Error:', error.message);
}