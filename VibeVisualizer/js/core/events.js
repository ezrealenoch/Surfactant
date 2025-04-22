/**
 * SBOM Visualizer - Event Bus Module
 * Provides a centralized event handling system
 */

class EventBus {
    constructor() {
        this.eventListeners = {};
    }
    
    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     * @returns {Function} Function to unsubscribe
     */
    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        
        this.eventListeners[event].push(callback);
        
        // Return function to unsubscribe
        return () => {
            this.off(event, callback);
        };
    }
    
    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Event handler to remove
     */
    off(event, callback) {
        if (!this.eventListeners[event]) return;
        
        this.eventListeners[event] = this.eventListeners[event].filter(
            listener => listener !== callback
        );
    }
    
    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {any} data - Event data
     */
    emit(event, data) {
        if (!this.eventListeners[event]) return;
        
        this.eventListeners[event].forEach(callback => {
            // Use setTimeout to ensure event handlers don't block
            setTimeout(() => {
                callback(data);
            }, 0);
        });
    }
    
    /**
     * Subscribe to an event once
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     */
    once(event, callback) {
        const onceCallback = (data) => {
            callback(data);
            this.off(event, onceCallback);
        };
        
        this.on(event, onceCallback);
    }
    
    /**
     * Clear all event listeners
     * @param {string} event - Optional event name to clear only specific listeners
     */
    clear(event) {
        if (event) {
            delete this.eventListeners[event];
        } else {
            this.eventListeners = {};
        }
    }
}

// Define all available event types
const EVENT_TYPES = {
    // SBOM events
    SBOM_LOADED: 'sbom:loaded',
    SBOM_SELECTED: 'sbom:selected',
    SBOM_DESELECTED: 'sbom:deselected',
    
    // Visualization events
    VIZ_MODE_CHANGED: 'viz:modeChanged',
    VIZ_RENDERED: 'viz:rendered',
    VIZ_ERROR: 'viz:error',
    
    // Component events
    COMPONENT_SELECTED: 'component:selected',
    COMPONENT_HOVERED: 'component:hovered',
    
    // UI events
    UI_FILTER_CHANGED: 'ui:filterChanged',
    UI_LOADING_START: 'ui:loadingStart',
    UI_LOADING_END: 'ui:loadingEnd',
    
    // Data events
    DATA_SEARCH: 'data:search',
    DATA_EXPORT: 'data:export',
    
    // Clustering events
    CLUSTER_EXPANDED: 'cluster:expanded',
    CLUSTER_COLLAPSED: 'cluster:collapsed'
};

// Freeze event types to prevent accidental modification
Object.freeze(EVENT_TYPES);

// Create and export a singleton instance
const eventBus = new EventBus();
