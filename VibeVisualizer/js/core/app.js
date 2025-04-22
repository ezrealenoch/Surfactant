/**
 * Main application entry point for SBOM Visualizer
 */
class App {
    constructor() {
        // Visualization instances
        this.graphViz = null;
        this.matrixViz = null;
        
        // Loading overlay
        this.loadingOverlay = null;
    }
    
    /**
     * Initialize the application
     */
    initialize() {
        Debug.info('Initializing SBOM Visualizer application');
        
        // Initialize modules
        UIControls.initialize();
        Sidebar.initialize();
        DetailsPanel.initialize();
        ExportManager.initialize();
        
        // Create visualization instances
        this.graphViz = new GraphVisualization('graph-view');
        this.matrixViz = new MatrixVisualization('matrix-view');
        
        // Initialize visualizations
        this.graphViz.initialize();
        this.matrixViz.initialize();
        
        // Create loading overlay
        this.createLoadingOverlay();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Update the legend
        if (typeof updateLegend === 'function') {
            updateLegend();
        }
        
        Debug.info('Application initialized successfully');
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for visualization update requests
        document.addEventListener('visualization-update-requested', this.updateVisualization.bind(this));
        
        // Listen for state changes
        AppState.subscribe((newState, oldState) => {
            // Update loading overlay
            if (newState.isLoading !== oldState.isLoading) {
                this.toggleLoadingOverlay(newState.isLoading);
            }
            
            // Update visualization if relevant state changes
            if (
                newState.activeView !== oldState.activeView ||
                newState.visibleSboms !== oldState.visibleSboms ||
                newState.visibleTypes !== oldState.visibleTypes ||
                newState.clusteringEnabled !== oldState.clusteringEnabled ||
                newState.densityReductionEnabled !== oldState.densityReductionEnabled ||
                newState.useRadialLayout !== oldState.useRadialLayout
            ) {
                this.updateVisualization();
            }
        });
    }
    
    /**
     * Update the visualization based on current state
     */
    updateVisualization() {
        Debug.info('Updating visualization...');
        
        // Get visible SBOMs
        const visibleSboms = SBOMStore.sboms.filter(sbom => 
            AppState.current.visibleSboms.includes(sbom.id)
        );
        
        if (visibleSboms.length === 0) {
            Debug.info('No SBOMs to visualize');
            return;
        }
        
        const totalComponents = this.countTotalComponents(visibleSboms);
        Debug.info(`Visualizing ${visibleSboms.length} SBOMs with ${totalComponents} components`);
        
        // Show loading for large datasets
        if (totalComponents > 100) {
            this.toggleLoadingOverlay(true);
        }
        
        // Prepare visualization options
        const options = {
            visibleSboms: AppState.current.visibleSboms,
            visibleTypes: AppState.current.visibleTypes,
            highlightCommon: AppState.current.highlightCommon,
            clusteringEnabled: AppState.current.clusteringEnabled,
            densityReductionEnabled: AppState.current.densityReductionEnabled,
            useRadialLayout: AppState.current.useRadialLayout
        };
        
        // Use setTimeout to allow the loading overlay to appear
        setTimeout(() => {
            // Update the active visualization
            if (AppState.current.activeView === 'graph') {
                this.graphViz.render(visibleSboms, options);
            } else {
                this.matrixViz.render(visibleSboms, options);
            }
            
            // Hide loading overlay
            this.toggleLoadingOverlay(false);
            
            Debug.info('Visualization updated');
        }, 50);
    }
    
    /**
     * Create loading overlay
     */
    createLoadingOverlay() {
        this.loadingOverlay = document.createElement('div');
        this.loadingOverlay.className = 'loading-overlay';
        this.loadingOverlay.style.display = 'none';
        
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        
        const message = document.createElement('div');
        message.className = 'loading-message';
        message.textContent = 'Processing...';
        
        this.loadingOverlay.appendChild(spinner);
        this.loadingOverlay.appendChild(message);
        
        const container = document.querySelector('.visualization-container');
        container.appendChild(this.loadingOverlay);
    }
    
    /**
     * Show or hide the loading overlay
     * @param {boolean} show - Whether to show the overlay
     */
    toggleLoadingOverlay(show) {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = show ? 'flex' : 'none';
        }
    }
    
    /**
     * Count total components across SBOMs
     * @param {Array} sboms - SBOM objects
     * @returns {number} - Total component count
     */
    countTotalComponents(sboms) {
        let total = 0;
        sboms.forEach(sbom => {
            total += sbom.stats.totalComponents;
        });
        return total;
    }
    
    /**
     * Load example data for testing
     */
    loadExampleData() {
        Debug.info('Loading example data...');
        
        AppState.update({ isLoading: true });
        
        SBOMParser.loadExampleData()
            .then(sboms => {
                if (sboms.length > 0) {
                    Debug.showMessage('Loaded example SBOM data');
                    
                    // Trigger visualization update
                    document.dispatchEvent(new CustomEvent('visualization-update-requested'));
                }
            })
            .finally(() => {
                AppState.update({ isLoading: false });
            });
    }
}

// Create and export a global App instance
window.SBOMApp = new App();

// Initialize the app when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the app
    window.SBOMApp.initialize();
    
    // Load example data if no SBOMs are loaded
    /*
    if (SBOMStore.sboms.length === 0) {
        window.SBOMApp.loadExampleData();
    }
    */
});
