/**
 * Debug Utilities for SBOM Visualizer
 */

// Debug flag - set to true to enable debugging
const DEBUG_MODE = true;

/**
 * Log debug messages to console
 * @param {string} message - Debug message
 * @param {any} data - Optional data to log
 */
function debugLog(message, data) {
    if (!DEBUG_MODE) return;
    
    if (data !== undefined) {
        console.log(`[SBOM Visualizer] ${message}`, data);
    } else {
        console.log(`[SBOM Visualizer] ${message}`);
    }
}

/**
 * Show a debug message in the UI
 * @param {string} message - Message to display
 * @param {string} type - Message type (info, warning, error)
 */
function showDebugMessage(message, type = 'info') {
    if (!DEBUG_MODE) return;
    
    // Create debug container if it doesn't exist
    let debugContainer = document.getElementById('debug-container');
    if (!debugContainer) {
        debugContainer = document.createElement('div');
        debugContainer.id = 'debug-container';
        debugContainer.style.position = 'fixed';
        debugContainer.style.bottom = '10px';
        debugContainer.style.left = '10px';
        debugContainer.style.maxWidth = '50%';
        debugContainer.style.maxHeight = '200px';
        debugContainer.style.overflowY = 'auto';
        debugContainer.style.background = 'rgba(0, 0, 0, 0.7)';
        debugContainer.style.color = 'white';
        debugContainer.style.padding = '10px';
        debugContainer.style.borderRadius = '5px';
        debugContainer.style.fontFamily = 'monospace';
        debugContainer.style.fontSize = '12px';
        debugContainer.style.zIndex = '1000';
        document.body.appendChild(debugContainer);
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
    debugContainer.appendChild(msgElement);
    
    // Auto-scroll to bottom
    debugContainer.scrollTop = debugContainer.scrollHeight;
    
    // Remove old messages if too many
    while (debugContainer.childNodes.length > 20) {
        debugContainer.removeChild(debugContainer.firstChild);
    }
}

/**
 * Display SBOM data structure for debugging
 * @param {Object} sbom - SBOM object to inspect
 */
function inspectSBOM(sbom) {
    if (!DEBUG_MODE) return;
    
    debugLog(`Inspecting SBOM: ${sbom.fileName}`, {
        id: sbom.id,
        systems: `${sbom.systems.length} system(s)`,
        hardware: `${sbom.hardware.length} hardware component(s)`,
        software: `${sbom.software.length} software component(s)`,
        relationships: `${sbom.relationships.length} relationship(s)`,
        graphData: {
            nodes: `${sbom.graphData?.nodes?.length || 0} node(s)`,
            links: `${sbom.graphData?.links?.length || 0} link(s)`
        }
    });
}
