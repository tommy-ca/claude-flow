/**
 * Simple Hello World function
 * Returns a greeting message
 * @returns {string} Hello World greeting
 */
function helloWorld() {
    return "Hello, World!";
}

/**
 * Function to display the greeting
 * Logs the hello world message to console
 */
function displayGreeting() {
    console.log(helloWorld());
}

// Export the functions for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        helloWorld,
        displayGreeting
    };
}

// If running directly, display the greeting
if (require.main === module) {
    displayGreeting();
}
