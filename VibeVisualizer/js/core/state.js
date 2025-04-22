/**
 * Application state management for the SBOM Visualizer
 */
const AppState = {
    // Current state
    current: {
        activeView: 'graph', // 'graph' or 'matrix'
        visibleSboms: [],
        visibleTypes: ['software', 'hardware', 'systems'],
        selectedNode: null,
        isLoading: false,
        
        // Large dataset visualization options
        clusteringEnabled: false,
        densityReductionEnabled: false,
        useRadialLayout: false
    },
    
    // Listeners for state changes
    listeners: [],
    
    /**
     * Update the state with new values
     * @param {Object} updates - State updates
     */
    update(updates) {
        // Record previous state for comparison
        const previousState = { ...this.current };
        
        // Update the state
        Object.assign(this.current, updates);
        
        // Notify listeners of the state change
        this.notifyListeners(previousState);
        
        if (Config.debug.enabled) {
            console.log('[State] Updated:', updates);
        }
    },
    
    /**
     * Subscribe to state changes
     * @param {Function} listener - Callback function
     * @returns {Function} Unsubscribe function
     */
    subscribe(listener) {
        this.listeners.push(listener);
        
        // Return unsubscribe function
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    },
    
    /**
     * Notify all listeners of state changes
     * @param {Object} previousState - Previous state
     */
    notifyListeners(previousState) {
        this.listeners.forEach(listener => {
            listener(this.current, previousState);
        });
    },
    
    /**
     * Reset the state to default values
     */
    reset() {
        this.current = {
            activeView: 'graph',
            visibleSboms: [],
            visibleTypes: ['software', 'hardware', 'systems'],
            selectedNode: null,
            isLoading: false,
            clusteringEnabled: false,
            densityReductionEnabled: false,
            useRadialLayout: false
        };
        
        this.notifyListeners({});
        
        if (Config.debug.enabled) {
            console.log('[State] Reset to defaults');
        }
    }
};

// Export the AppState object
window.AppState = AppState;
