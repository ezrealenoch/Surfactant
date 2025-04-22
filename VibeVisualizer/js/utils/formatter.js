/**
 * Formatter utilities for the SBOM Visualizer
 */
const Formatter = {
    /**
     * Format a file size in human-readable format
     * @param {number} bytes - Size in bytes
     * @returns {string} Formatted size
     */
    fileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    /**
     * Truncate text to a specific length
     * @param {string} text - Text to truncate
     * @param {number} length - Maximum length
     * @param {string} suffix - Suffix to add (default: '...')
     * @returns {string} Truncated text
     */
    truncate(text, length, suffix = '...') {
        if (!text) return '';
        
        return text.length > length ? 
            text.substring(0, length - suffix.length) + suffix : 
            text;
    },
    
    /**
     * Format a date as a string
     * @param {number} timestamp - Unix timestamp in seconds
     * @returns {string} Formatted date
     */
    date(timestamp) {
        if (!timestamp) return 'Unknown';
        
        // Convert from seconds to milliseconds if needed
        const milliseconds = timestamp > 10000000000 ? timestamp : timestamp * 1000;
        return new Date(milliseconds).toLocaleString();
    },
    
    /**
     * Create unique ID
     * @param {string} prefix - Optional prefix
     * @returns {string} Unique ID
     */
    uniqueId(prefix = '') {
        return prefix + Date.now() + '_' + Math.floor(Math.random() * 1000);
    },
    
    /**
     * Format a camelCase string as a human-readable label
     * @param {string} str - String to format
     * @returns {string} Formatted label
     */
    labelFromCamelCase(str) {
        if (!str) return '';
        
        // Convert camelCase to Title Case With Spaces
        return str
            // Insert a space before uppercase letters
            .replace(/([A-Z])/g, ' $1')
            // Capitalize the first letter
            .replace(/^./, str => str.toUpperCase())
            // Trim any extra spaces
            .trim();
    }
};

// Export the Formatter object
window.Formatter = Formatter;
