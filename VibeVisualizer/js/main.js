/**
 * SBOM Visualizer Main Application
 * Handles core application logic and event handling
 */
document.addEventListener('DOMContentLoaded', () => {
    // Application state
    const appState = {
        activeView: 'graph', // 'graph' or 'matrix'
        highlightCommon: true,
        visibleSboms: [],
        visibleTypes: ['software', 'hardware', 'systems'],
        isDropAreaVisible: false,
        isLoading: false,
        // Large dataset visualization options
        clusteringEnabled: false,
        densityReductionEnabled: false,
        useRadialLayout: false,
        clusterThreshold: 30,
        maxNodeLimit: 500
    };
    
    // DOM element references
    const elements = {
        importButton: document.getElementById('import-button'),
        fileInput: document.getElementById('file-input'),
        dropArea: document.getElementById('drop-area'),
        sbomList: document.getElementById('sbom-list'),
        showCommonDeps: document.getElementById('show-common-deps'),
        searchInput: document.getElementById('search-input'),
        searchButton: document.getElementById('search-button'),
        graphView: document.getElementById('graph-view'),
        matrixView: document.getElementById('matrix-view'),
        detailPanel: document.getElementById('detail-panel'),
        viewTypeRadios: document.querySelectorAll('input[name="view-type"]'),
        typeFilters: document.querySelectorAll('.filter-option'),
        // Large dataset controls
        enableClustering: document.getElementById('enable-clustering'),
        enableDensityReduction: document.getElementById('enable-density-reduction'),
        useRadialLayout: document.getElementById('use-radial-layout'),
        clusterThreshold: document.getElementById('cluster-threshold'),
        clusterThresholdValue: document.getElementById('cluster-threshold-value'),
        maxNodeLimit: document.getElementById('max-node-limit'),
        maxNodeLimitValue: document.getElementById('max-node-limit-value')
    };
    
    // Initialize the application
    initializeApp();
    
    /**
     * Initialize the application
     */
    function initializeApp() {
        // Set up event listeners
        setupEventListeners();
        
        // Initialize visualizers
        sbomVisualizer.initialize();
        
        // Setup drag and drop
        setupDragAndDrop();
        
        // Show welcome message
        showWelcomeMessage();
    }
    
    /**
     * Set up application event listeners
     */
    function setupEventListeners() {
        // Import button click
        elements.importButton.addEventListener('click', () => {
            elements.fileInput.click();
        });
        
        // File input change
        elements.fileInput.addEventListener('change', (event) => {
            handleFileSelection(event.target.files);
        });
        
        // Toggle common dependencies highlight
        elements.showCommonDeps.addEventListener('change', (event) => {
            appState.highlightCommon = event.target.checked;
            updateVisualization();
        });
        
        // Clustering controls
        elements.enableClustering.addEventListener('change', (event) => {
            appState.clusteringEnabled = event.target.checked;
            sbomVisualizer.clusteringEnabled = event.target.checked;
            updateVisualization();
        });
        
        elements.enableDensityReduction.addEventListener('change', (event) => {
            appState.densityReductionEnabled = event.target.checked;
            sbomVisualizer.densityReductionEnabled = event.target.checked;
            updateVisualization();
        });
        
        elements.useRadialLayout.addEventListener('change', (event) => {
            appState.useRadialLayout = event.target.checked;
            sbomVisualizer.useRadialLayout = event.target.checked;
            updateVisualization();
        });
        
        // Threshold sliders
        elements.clusterThreshold.addEventListener('input', (event) => {
            const value = parseInt(event.target.value);
            appState.clusterThreshold = value;
            sbomClusterer.clusterThreshold = value;
            elements.clusterThresholdValue.textContent = `${value} nodes`;
        });
        
        elements.clusterThreshold.addEventListener('change', () => {
            updateVisualization();
        });
        
        elements.maxNodeLimit.addEventListener('input', (event) => {
            const value = parseInt(event.target.value);
            appState.maxNodeLimit = value;
            sbomClusterer.maxNodeLimit = value;
            elements.maxNodeLimitValue.textContent = `${value} nodes`;
        });
        
        elements.maxNodeLimit.addEventListener('change', () => {
            updateVisualization();
        });
        
        // Search functionality
        elements.searchButton.addEventListener('click', performSearch);
        elements.searchInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                performSearch();
            }
        });
        
        // View type toggle
        elements.viewTypeRadios.forEach(radio => {
            radio.addEventListener('change', (event) => {
                if (event.target.checked) {
                    switchView(event.target.value);
                }
            });
        });
        
        // Component type filters
        elements.typeFilters.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                updateTypeFilters();
                updateVisualization();
            });
        });
    }
    
    /**
     * Set up drag and drop functionality
     */
    function setupDragAndDrop() {
        // Show drop area when hovering over the application
        document.body.addEventListener('dragover', (event) => {
            event.preventDefault();
            event.stopPropagation();
            showDropArea();
        });
        
        // Handle drag leave
        elements.dropArea.addEventListener('dragleave', (event) => {
            event.preventDefault();
            event.stopPropagation();
            hideDropArea();
        });
        
        // Handle drop event
        elements.dropArea.addEventListener('drop', (event) => {
            event.preventDefault();
            event.stopPropagation();
            hideDropArea();
            
            if (event.dataTransfer.files.length > 0) {
                handleFileSelection(event.dataTransfer.files);
            }
        });
        
        // Make drop area clickable
        elements.dropArea.addEventListener('click', () => {
            elements.fileInput.click();
        });
    }
    
    /**
     * Show the drop area
     */
    function showDropArea() {
        if (!appState.isDropAreaVisible) {
            elements.dropArea.classList.remove('hidden');
            appState.isDropAreaVisible = true;
        }
    }
    
    /**
     * Hide the drop area
     */
    function hideDropArea() {
        if (appState.isDropAreaVisible) {
            elements.dropArea.classList.add('hidden');
            appState.isDropAreaVisible = false;
        }
    }
    
    /**
     * Handle file selection from file input or drag & drop
     * @param {FileList} files - Selected files
     */
    function handleFileSelection(files) {
        if (files.length === 0) return;
        
        debugLog(`Processing ${files.length} files...`);
        
        // Convert FileList to array for easier handling
        const fileArray = Array.from(files);
        
        // Process each file
        const filePromises = fileArray.map(file => {
            // Filter to only JSON files
            if (!file.name.toLowerCase().endsWith('.json')) {
                alert(`Skipping ${file.name}: Not a JSON file`);
                return null;
            }
            
            debugLog(`Reading file: ${file.name} (${formatFileSize(file.size)})`);
            
            return readFileAsJSON(file)
                .then(jsonData => {
                    try {
                        debugLog(`Successfully read ${file.name}, parsing SBOM data...`);
                        const sbom = sbomParser.parseSBOM(jsonData, file.name);
                        showDebugMessage(`Parsed ${file.name}: ${sbom.stats.totalComponents} components`);
                        return sbom;
                    } catch (error) {
                        console.error(`Error parsing ${file.name}:`, error);
                        alert(`Error parsing ${file.name}: ${error.message}`);
                        showDebugMessage(`Failed to parse ${file.name}: ${error.message}`, 'error');
                        return null;
                    }
                })
                .catch(error => {
                    console.error(`Error reading ${file.name}:`, error);
                    alert(`Error reading ${file.name}: ${error.message}`);
                    showDebugMessage(`Failed to read ${file.name}: ${error.message}`, 'error');
                    return null;
                });
        });
        
        // Wait for all files to be processed
        Promise.all(filePromises.filter(p => p !== null))
            .then(results => {
                // Filter out null results
                const validSboms = results.filter(sbom => sbom !== null);
                
                if (validSboms.length > 0) {
                    debugLog(`Successfully loaded ${validSboms.length} SBOMs`);
                    
                    // Clear any existing SBOMs if needed
                    //sbomParser.sboms = validSboms;
                    
                    // Update the SBOM list
                    updateSbomList();
                    
                    // Update visualizations
                    updateVisualization();
                } else {
                    showDebugMessage('No valid SBOMs were loaded', 'warning');
                }
            });
        
        // Reset the file input
        elements.fileInput.value = '';
    }
    
    /**
     * Read a file as JSON
     * @param {File} file - File to read
     * @returns {Promise<Object>} - Parsed JSON data
     */
    function readFileAsJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const jsonData = JSON.parse(event.target.result);
                    resolve(jsonData);
                } catch (error) {
                    reject(new Error(`Invalid JSON file: ${error.message}`));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsText(file);
        });
    }
    
    /**
     * Update the SBOM list in the sidebar
     */
    function updateSbomList() {
        // Clear existing list
        elements.sbomList.innerHTML = '';
        
        if (sbomParser.sboms.length === 0) {
            elements.sbomList.innerHTML = '<div class="no-sboms-message">No SBOMs uploaded yet</div>';
            return;
        }
        
        // Check if we have newly added SBOMs that aren't selected yet
        const newSboms = sbomParser.sboms.filter(sbom => !appState.visibleSboms.includes(sbom.id));
        if (newSboms.length > 0) {
            // Auto-select new SBOMs
            newSboms.forEach(sbom => {
                appState.visibleSboms.push(sbom.id);
                debugLog(`Auto-selected SBOM: ${sbom.fileName}`);
            });
            showDebugMessage(`Auto-selected ${newSboms.length} new SBOM(s)`);
        }
        
        // If no SBOMs are visible yet, make all visible
        if (appState.visibleSboms.length === 0) {
            appState.visibleSboms = sbomParser.sboms.map(sbom => sbom.id);
            debugLog('Selected all SBOMs by default');
        }
        
        // Create a list item for each SBOM
        sbomParser.sboms.forEach(sbom => {
            const isActive = appState.visibleSboms.includes(sbom.id);
            
            const sbomItem = document.createElement('div');
            sbomItem.className = `sbom-item${isActive ? ' active' : ''}`;
            sbomItem.style.borderLeftColor = sbom.color;
            sbomItem.dataset.sbomId = sbom.id;
            
            // SBOM name and stats
            sbomItem.innerHTML = `
                <div class="sbom-name">${sbom.fileName}</div>
                <div class="sbom-stats">
                    <span>${sbom.stats.softwareCount} software</span> | 
                    <span>${sbom.hardware.length} hardware</span> | 
                    <span>${sbom.systems.length} systems</span>
                </div>
            `;
            
            // Toggle visibility on click
            sbomItem.addEventListener('click', () => {
                // Determine if we should add or remove from visible list
                if (isActive) {
                    // Only allow deactivation if there will still be at least one visible SBOM
                    if (appState.visibleSboms.length > 1) {
                        appState.visibleSboms = appState.visibleSboms.filter(id => id !== sbom.id);
                        debugLog(`Deselected SBOM: ${sbom.fileName}`);
                    }
                } else {
                    appState.visibleSboms.push(sbom.id);
                    debugLog(`Selected SBOM: ${sbom.fileName}`);
                }
                
                // Update UI
                updateSbomList();
                updateVisualization();
            });
            
            elements.sbomList.appendChild(sbomItem);
        });
    }
    
    /**
     * Update the currently visible component types from filters
     */
    function updateTypeFilters() {
        appState.visibleTypes = [];
        
        elements.typeFilters.forEach(checkbox => {
            if (checkbox.checked) {
                appState.visibleTypes.push(checkbox.value);
            }
        });
    }
    
    /**
     * Update the visualization based on current state
     */
    function updateVisualization() {
        // Get visible SBOMs
        const visibleSboms = sbomParser.sboms.filter(sbom => 
            appState.visibleSboms.includes(sbom.id)
        );
        
        if (visibleSboms.length === 0) {
            return; // Nothing to visualize
        }
        
        const totalComponents = countTotalComponents(visibleSboms);
        
        // Show loading overlay for large datasets
        if (totalComponents > 100) {
            showLoadingOverlay();
        }
        
        // Prepare options
        const options = {
            visibleSboms: appState.visibleSboms,
            visibleTypes: appState.visibleTypes,
            highlightCommon: appState.highlightCommon
        };
        
        // Set visualization settings - disable clustering by default
        sbomVisualizer.clusteringEnabled = false;
        sbomVisualizer.densityReductionEnabled = false;
        sbomVisualizer.useRadialLayout = false;
        
        // Use setTimeout to allow the loading overlay to appear before starting visualization
        setTimeout(() => {
            // Update active view
            if (appState.activeView === 'graph') {
                sbomVisualizer.render(visibleSboms, options);
            } else {
                sbomMatrixView.render(visibleSboms, options);
            }
            
            // Hide loading overlay
            hideLoadingOverlay();
        }, 50);
    }
    
    /**
     * Count total components across visible SBOMs
     * @param {Array} sboms - Visible SBOMs
     * @returns {number} Total component count
     */
    function countTotalComponents(sboms) {
        let total = 0;
        sboms.forEach(sbom => {
            total += sbom.software.length + sbom.hardware.length + sbom.systems.length;
        });
        console.log(`Total components across ${sboms.length} SBOMs: ${total}`);
        return total;
    }
    
    /**
     * Show loading overlay during visualization of large datasets
     */
    function showLoadingOverlay() {
        // Create overlay if it doesn't exist
        let overlay = document.querySelector('.loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'loading-overlay';
            
            const spinner = document.createElement('div');
            spinner.className = 'loading-spinner';
            
            const message = document.createElement('div');
            message.className = 'loading-message';
            message.textContent = 'Processing large dataset...';
            
            overlay.appendChild(spinner);
            overlay.appendChild(message);
            
            const container = document.querySelector('.visualization-container');
            container.appendChild(overlay);
        }
        
        // Show the overlay
        overlay.style.display = 'flex';
        appState.isLoading = true;
    }
    
    /**
     * Hide loading overlay
     */
    function hideLoadingOverlay() {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
        appState.isLoading = false;
    }
    
    /**
     * Switch between graph and matrix views
     * @param {string} viewType - 'graph' or 'matrix'
     */
    function switchView(viewType) {
        appState.activeView = viewType;
        
        // Update UI
        if (viewType === 'graph') {
            elements.graphView.classList.add('active-view');
            elements.graphView.classList.remove('hidden-view');
            elements.matrixView.classList.add('hidden-view');
            elements.matrixView.classList.remove('active-view');
        } else {
            elements.matrixView.classList.add('active-view');
            elements.matrixView.classList.remove('hidden-view');
            elements.graphView.classList.add('hidden-view');
            elements.graphView.classList.remove('active-view');
        }
        
        // Update visualization
        updateVisualization();
    }
    
    /**
     * Perform search based on the search input
     */
    function performSearch() {
        const query = elements.searchInput.value.trim();
        
        if (query.length === 0) {
            return;
        }
        
        // Search for components
        const results = sbomParser.searchComponents(query);
        
        if (results.length === 0) {
            showSearchResults(`No results found for "${query}"`);
            return;
        }
        
        // Display search results
        showSearchResults(`Found ${results.length} results for "${query}"`, results);
    }
    
    /**
     * Show search results in the detail panel
     * @param {string} message - Search result message
     * @param {Array} results - Search results
     */
    function showSearchResults(message, results = []) {
        const detailContent = document.getElementById('detail-content');
        
        let html = `<h3>Search Results</h3>`;
        html += `<p>${message}</p>`;
        
        if (results.length > 0) {
            html += `<ul class="search-results">`;
            
            results.forEach(result => {
                const { component, sbomId, type } = result;
                const sbom = sbomParser.getSBOMById(sbomId);
                
                html += `<li class="search-result-item" data-uuid="${component.uuid}" data-sbom-id="${sbomId}">`;
                html += `<strong>${component.name}</strong> (${type})`;
                html += `<div>SBOM: ${sbom ? sbom.fileName : 'Unknown'}</div>`;
                html += `</li>`;
            });
            
            html += `</ul>`;
            
            // Add click event listeners after rendering
            detailContent.innerHTML = html;
            
            document.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const uuid = item.dataset.uuid;
                    const sbomId = item.dataset.sbomId;
                    
                    // Find the component
                    const component = sbomParser.getComponentByUuid(uuid);
                    if (component) {
                        // Show details
                        displayComponentDetails(component);
                        
                        // If in graph view, try to highlight the node
                        if (appState.activeView === 'graph') {
                            sbomVisualizer.selectedNodeId = uuid;
                            // Update node colors
                            sbomVisualizer.nodeGroup.selectAll('path')
                                .attr('fill', node => sbomVisualizer.getNodeColor(node, appState.highlightCommon));
                        }
                    }
                });
            });
        }
    }
    
    /**
     * Show welcome message
     */
    function showWelcomeMessage() {
        const detailContent = document.getElementById('detail-content');
        
        let html = `
            <h3>Welcome to SBOM Visualizer</h3>
            <p>This tool helps you visualize and analyze Software Bill of Materials (SBOM) files.</p>
            <p>To get started:</p>
            <ol>
                <li>Import one or more SBOM JSON files using the "Import SBOM" button or by dragging and dropping files.</li>
                <li>Use the graph or matrix view to explore components and relationships.</li>
                <li>Filter components by type using the sidebar options.</li>
                <li>Search for specific components using the search bar.</li>
                <li>Export visualizations or generate reports using the export options.</li>
            </ol>
            <p>Common dependencies across multiple SBOMs will be highlighted automatically.</p>
        `;
        
        detailContent.innerHTML = html;
    }
});
