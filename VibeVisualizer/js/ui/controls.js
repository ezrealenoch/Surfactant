/**
 * UI Controls for SBOM Visualizer
 */
const UIControls = {
    /**
     * Initialize UI controls
     */
    initialize() {
        // DOM element references
        this.elements = {
            importButton: document.getElementById('import-button'),
            fileInput: document.getElementById('file-input'),
            dropArea: document.getElementById('drop-area'),
            searchInput: document.getElementById('search-input'),
            searchButton: document.getElementById('search-button'),
            graphView: document.getElementById('graph-view'),
            matrixView: document.getElementById('matrix-view'),
            viewTypeRadios: document.querySelectorAll('input[name="view-type"]'),
            typeFilters: document.querySelectorAll('.filter-option'),
            
            // Clustering controls
            enableClustering: document.getElementById('enable-clustering'),
            enableDensityReduction: document.getElementById('enable-density-reduction'),
            useRadialLayout: document.getElementById('use-radial-layout'),
            clusterThreshold: document.getElementById('cluster-threshold'),
            clusterThresholdValue: document.getElementById('cluster-threshold-value'),
            maxNodeLimit: document.getElementById('max-node-limit'),
            maxNodeLimitValue: document.getElementById('max-node-limit-value')
        };
        
        // Set up event listeners
        this.setupEventListeners();
        this.setupDragAndDrop();
        
        Debug.info('UI controls initialized');
    },
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Import button click
        this.elements.importButton.addEventListener('click', () => {
            this.elements.fileInput.click();
        });
        
        // File input change
        this.elements.fileInput.addEventListener('change', (event) => {
            this.handleFileSelection(event.target.files);
        });
        
        // Search functionality
        this.elements.searchButton.addEventListener('click', this.performSearch.bind(this));
        this.elements.searchInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                this.performSearch();
            }
        });
        
        // View type toggle
        this.elements.viewTypeRadios.forEach(radio => {
            radio.addEventListener('change', (event) => {
                if (event.target.checked) {
                    this.switchView(event.target.value);
                }
            });
        });
        
        // Component type filters
        this.elements.typeFilters.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateTypeFilters();
            });
        });
        
        // Clustering controls
        if (this.elements.enableClustering) {
            this.elements.enableClustering.addEventListener('change', (event) => {
                AppState.update({ clusteringEnabled: event.target.checked });
            });
        }
        
        if (this.elements.enableDensityReduction) {
            this.elements.enableDensityReduction.addEventListener('change', (event) => {
                AppState.update({ densityReductionEnabled: event.target.checked });
            });
        }
        
        if (this.elements.useRadialLayout) {
            this.elements.useRadialLayout.addEventListener('change', (event) => {
                AppState.update({ useRadialLayout: event.target.checked });
            });
        }
        
        // Threshold sliders
        if (this.elements.clusterThreshold) {
            this.elements.clusterThreshold.addEventListener('input', (event) => {
                const value = parseInt(event.target.value);
                Config.visualization.clustering.threshold = value;
                this.elements.clusterThresholdValue.textContent = `${value} nodes`;
            });
            
            this.elements.clusterThreshold.addEventListener('change', () => {
                document.dispatchEvent(new CustomEvent('visualization-update-requested'));
            });
        }
        
        if (this.elements.maxNodeLimit) {
            this.elements.maxNodeLimit.addEventListener('input', (event) => {
                const value = parseInt(event.target.value);
                Config.visualization.clustering.maxNodeLimit = value;
                this.elements.maxNodeLimitValue.textContent = `${value} nodes`;
            });
            
            this.elements.maxNodeLimit.addEventListener('change', () => {
                document.dispatchEvent(new CustomEvent('visualization-update-requested'));
            });
        }
        
        // Listen for state changes
        AppState.subscribe((newState, oldState) => {
            // Update UI to match state
            this.updateUiFromState(newState, oldState);
        });
    },
    
    /**
     * Set up drag and drop functionality
     */
    setupDragAndDrop() {
        // Show drop area when hovering over the application
        document.body.addEventListener('dragover', (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.showDropArea();
        });
        
        // Handle drag leave
        this.elements.dropArea.addEventListener('dragleave', (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.hideDropArea();
        });
        
        // Handle drop event
        this.elements.dropArea.addEventListener('drop', (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.hideDropArea();
            
            if (event.dataTransfer.files.length > 0) {
                this.handleFileSelection(event.dataTransfer.files);
            }
        });
        
        // Make drop area clickable
        this.elements.dropArea.addEventListener('click', () => {
            this.elements.fileInput.click();
        });
    },
    
    /**
     * Handle file selection from input or drag & drop
     * @param {FileList} files - Selected files
     */
    handleFileSelection(files) {
        if (files.length === 0) return;
        
        // Show loading state
        AppState.update({ isLoading: true });
        
        // Parse SBOM files
        SBOMParser.parseFiles(files)
            .then(sboms => {
                if (sboms.length > 0) {
                    Debug.info(`Successfully imported ${sboms.length} SBOMs`);
                    Debug.showMessage(`Imported ${sboms.length} SBOMs successfully`);
                    
                    // Trigger visualization update
                    document.dispatchEvent(new CustomEvent('visualization-update-requested'));
                }
            })
            .catch(error => {
                Debug.error('Error importing SBOMs', error);
                Debug.showMessage('Error importing SBOMs', 'error');
            })
            .finally(() => {
                // Hide loading state
                AppState.update({ isLoading: false });
                
                // Reset the file input
                this.elements.fileInput.value = '';
            });
    },
    
    /**
     * Update component type filters based on checkboxes
     */
    updateTypeFilters() {
        const visibleTypes = [];
        
        this.elements.typeFilters.forEach(checkbox => {
            if (checkbox.checked) {
                visibleTypes.push(checkbox.value);
            }
        });
        
        AppState.update({ visibleTypes });
        Debug.info(`Updated type filters: ${visibleTypes.join(', ')}`);
    },
    
    /**
     * Switch between graph and matrix views
     * @param {string} viewType - 'graph' or 'matrix'
     */
    switchView(viewType) {
        AppState.update({ activeView: viewType });
        Debug.info(`Switched to ${viewType} view`);
        
        // Update UI
        if (viewType === 'graph') {
            this.elements.graphView.classList.add('active-view');
            this.elements.graphView.classList.remove('hidden-view');
            this.elements.matrixView.classList.add('hidden-view');
            this.elements.matrixView.classList.remove('active-view');
        } else {
            this.elements.matrixView.classList.add('active-view');
            this.elements.matrixView.classList.remove('hidden-view');
            this.elements.graphView.classList.add('hidden-view');
            this.elements.graphView.classList.remove('active-view');
        }
    },
    
    /**
     * Perform search based on the search input
     */
    performSearch() {
        const query = this.elements.searchInput.value.trim();
        
        if (query.length === 0) {
            return;
        }
        
        Debug.info(`Performing search for: ${query}`);
        
        // Search for components
        const results = SBOMStore.searchComponents(query);
        
        // Display search results
        DetailsPanel.displaySearchResults(query, results);
        
        Debug.info(`Found ${results.length} results for "${query}"`);
    },
    
    /**
     * Show the drop area
     */
    showDropArea() {
        this.elements.dropArea.classList.remove('hidden');
    },
    
    /**
     * Hide the drop area
     */
    hideDropArea() {
        this.elements.dropArea.classList.add('hidden');
    },
    
    /**
     * Update UI elements to match the current state
     * @param {Object} newState - New state
     * @param {Object} oldState - Old state
     */
    updateUiFromState(newState, oldState) {
        // Update view type
        if (newState.activeView !== oldState.activeView) {
            this.switchView(newState.activeView);
        }
        
        // Update clustering controls
        if (this.elements.enableClustering) {
            this.elements.enableClustering.checked = newState.clusteringEnabled;
        }
        
        if (this.elements.enableDensityReduction) {
            this.elements.enableDensityReduction.checked = newState.densityReductionEnabled;
        }
        
        if (this.elements.useRadialLayout) {
            this.elements.useRadialLayout.checked = newState.useRadialLayout;
        }
    },
    
    /**
     * Handle new SBOM loaded
     * @param {Object} sbom - Newly loaded SBOM
     */
    handleSBOMLoaded(sbom) {
        // Update SBOM list
        this.updateSBOMList();
        
        // Update legend with new SBOM colors
        updateLegend();
        
        // Show graph visualization
        if (AppState.currentView === 'graph') {
            window.GraphView.render(SBOMStore.sboms, AppState.visualizationOptions);
        } else {
            window.MatrixView.render(SBOMStore.sboms, AppState.visualizationOptions);
        }
    }
};

// Export the UIControls object
window.UIControls = UIControls;

/**
 * Update the color legend with SBOM colors and node types
 */
function updateLegend() {
    const legendContent = document.getElementById('legend-content');
    if (!legendContent) return;
    
    // Clear legend
    legendContent.innerHTML = '';
    
    // Add SBOM colors
    const sboms = SBOMStore.sboms;
    if (sboms.length > 0) {
        const sbomLegendTitle = document.createElement('div');
        sbomLegendTitle.className = 'legend-section-title';
        sbomLegendTitle.textContent = 'SBOMs';
        legendContent.appendChild(sbomLegendTitle);
        
        const sbomLegend = document.createElement('div');
        sbomLegend.className = 'legend-section';
        
        sboms.forEach(sbom => {
            const item = document.createElement('div');
            item.className = 'legend-item';
            item.innerHTML = `
                <span class="legend-color" style="background-color: ${sbom.color}"></span>
                <span class="legend-label">${sbom.fileName}</span>
            `;
            sbomLegend.appendChild(item);
        });
        
        legendContent.appendChild(sbomLegend);
    }
    
    // Add node types
    const typeLegendTitle = document.createElement('div');
    typeLegendTitle.className = 'legend-section-title';
    typeLegendTitle.textContent = 'Node Types';
    legendContent.appendChild(typeLegendTitle);
    
    const typeLegend = document.createElement('div');
    typeLegend.className = 'legend-section';
    
    const nodeTypes = [
        { name: 'System', color: Config.visualization.nodeTypes.system.color },
        { name: 'Hardware', color: Config.visualization.nodeTypes.hardware.color },
        { name: 'Software', color: Config.visualization.nodeTypes.software.color },
        { name: 'Library', color: Config.visualization.nodeTypes.library.color },
        { name: 'Executable', color: Config.visualization.nodeTypes.executable.color },
        { name: 'Cluster', color: '#999' }
    ];
    
    nodeTypes.forEach(type => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `
            <span class="legend-color" style="background-color: ${type.color}"></span>
            <span class="legend-label">${type.name}</span>
        `;
        typeLegend.appendChild(item);
    });
    
    legendContent.appendChild(typeLegend);
    
    // Add relationship types
    const relLegendTitle = document.createElement('div');
    relLegendTitle.className = 'legend-section-title';
    relLegendTitle.textContent = 'Relationships';
    legendContent.appendChild(relLegendTitle);
    
    const relLegend = document.createElement('div');
    relLegend.className = 'legend-section';
    
    // Common components across SBOMs
    const commonItem = document.createElement('div');
    commonItem.className = 'legend-item';
    commonItem.innerHTML = `
        <span class="legend-line" style="background-color: #3498db; border-top: 3px dashed #3498db;"></span>
        <span class="legend-label">Common Components Across SBOMs</span>
    `;
    relLegend.appendChild(commonItem);
    
    // Dependencies relationship
    const depItem = document.createElement('div');
    depItem.className = 'legend-item';
    depItem.innerHTML = `
        <span class="legend-line" style="background-color: #f1c40f; border-top: 2.5px solid #f1c40f;"></span>
        <span class="legend-label">Dependencies Within SBOM</span>
    `;
    relLegend.appendChild(depItem);
    
    // Standard relationship
    const stdItem = document.createElement('div');
    stdItem.className = 'legend-item';
    stdItem.innerHTML = `
        <span class="legend-line" style="background-color: #999; border-top: 2px solid #999;"></span>
        <span class="legend-label">Standard Relationship</span>
    `;
    relLegend.appendChild(stdItem);
    
    legendContent.appendChild(relLegend);
}
