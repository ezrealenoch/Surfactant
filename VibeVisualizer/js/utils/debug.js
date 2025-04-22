/**
 * Debug Utilities for SBOM Visualizer
 */
const Debug = {
    /**
     * Log debug messages to console
     * @param {string} message - Debug message
     * @param {any} data - Optional data to log
     * @param {string} level - Log level ('info', 'warning', 'error')
     */
    log(message, data, level = 'info') {
        if (!Config.debug.enabled) return;
        
        // Check log level
        if (Config.debug.logLevel === 'warning' && level === 'info') return;
        if (Config.debug.logLevel === 'error' && (level === 'info' || level === 'warning')) return;
        
        const prefix = `[SBOM Visualizer] [${level.toUpperCase()}]`;
        
        if (data !== undefined) {
            console.log(`${prefix} ${message}`, data);
        } else {
            console.log(`${prefix} ${message}`);
        }
    },

    /**
     * Log info message
     * @param {string} message - Debug message
     * @param {any} data - Optional data to log
     */
    info(message, data) {
        this.log(message, data, 'info');
    },

    /**
     * Log warning message
     * @param {string} message - Warning message
     * @param {any} data - Optional data to log
     */
    warn(message, data) {
        this.log(message, data, 'warning');
    },

    /**
     * Log error message
     * @param {string} message - Error message
     * @param {any} data - Optional data to log
     */
    error(message, data) {
        this.log(message, data, 'error');
    },

    /**
     * Show a debug message in the UI
     * @param {string} message - Message to display
     * @param {string} type - Message type (info, warning, error)
     */
    showMessage(message, type = 'info') {
        if (!Config.debug.enabled || !Config.debug.showUIMessages) return;
        
        // Create debug container if it doesn't exist
        let container = document.getElementById('debug-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'debug-container';
            container.style.position = 'fixed';
            container.style.bottom = '10px';
            container.style.left = '10px';
            container.style.maxWidth = '50%';
            container.style.maxHeight = '200px';
            container.style.overflowY = 'auto';
            container.style.background = 'rgba(0, 0, 0, 0.7)';
            container.style.color = 'white';
            container.style.padding = '10px';
            container.style.borderRadius = '5px';
            container.style.fontFamily = 'monospace';
            container.style.fontSize = '12px';
            container.style.zIndex = '1000';
            document.body.appendChild(container);
        }
        
        // Create message element
        const msgElement = document.createElement('div');
        msgElement.style.marginBottom = '5px';
        msgElement.style.color = type === 'error' ? '#ff4444' : 
                                 type === 'warning' ? '#ffbb33' : '#00C851';
        
        // Add timestamp
        const timestamp = new Date().toLocaleTimeString();
        msgElement.textContent = `[${timestamp}] ${message}`;
        
        // Add to container
        container.appendChild(msgElement);
        
        // Auto-scroll to bottom
        container.scrollTop = container.scrollHeight;
        
        // Remove old messages if too many
        while (container.childNodes.length > 20) {
            container.removeChild(container.firstChild);
        }
    },

    /**
     * Clear all debug messages from the UI
     */
    clearMessages() {
        const container = document.getElementById('debug-container');
        if (container) {
            container.innerHTML = '';
        }
    }
};

// Export the Debug object
window.Debug = Debug;
