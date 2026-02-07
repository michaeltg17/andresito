// app.js
function addNumbers(a, b) {
    // Validate inputs
    if (typeof a !== 'number' || typeof b !== 'number') {
        throw new Error('Both parameters must be numbers');
    }
    
    return a + b;
}

// Export the function for use in tests
module.exports = addNumbers;