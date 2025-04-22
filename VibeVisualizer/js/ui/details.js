/**
 * Details panel for SBOM Visualizer
 */
const DetailsPanel = {
    /**
     * Initialize the details panel
     */
    initialize() {
        this.container = document.getElementById('detail-panel');
        this.content = document.getElementById('detail-content');
        
        // Listen for node selection events
        document.addEventListener('node-selected', this.handleNodeSelected.bind(this));
        document.addEventListener('cluster-expanded', this.handleClusterExpanded.bind(this));
        document.addEventListener('cluster-collapsed', this.handleClusterCollapsed.bind(this));
        
        // Show welcome message initially
        this.showWelcomeMessage();
        
        Debug.info('Details panel initialized');
    },
    
    /**
     * Handle node selection event
     * @param {CustomEvent} event - Node selection event
     */
    handleNodeSelected(event) {
        const { component, sbomId, type } = event.detail;
        this.displayComponentDetails(component, sbomId, type);
    },
    
    /**
     * Handle cluster expanded event
     * @param {CustomEvent} event - Cluster expanded event
     */
    handleClusterExpanded(event) {
        const { cluster, expandedNodes } = event.detail;
        
        // Display info about the expanded cluster
        this.content.innerHTML = `
            <h3>Cluster Expanded: ${cluster.name}</h3>
            <p>Showing ${expandedNodes} components.</p>
            <p>Click on any component to see its details, or click on the cluster again to collapse it.</p>
        `;
    },
    
    /**
     * Handle cluster collapsed event
     * @param {CustomEvent} event - Cluster collapsed event
     */
    handleClusterCollapsed(event) {
        const { cluster } = event.detail;
        
        // Display info about the collapsed cluster
        this.content.innerHTML = `
            <h3>Cluster Collapsed: ${cluster.name}</h3>
            <p>The cluster contains ${cluster.nodeCount} components.</p>
            <p>Click on the cluster to expand it and see the individual components.</p>
        `;
    },
    
    /**
     * Display component details
     * @param {Object} component - Component data
     * @param {string} sbomId - SBOM ID
     * @param {string} type - Component type
     */
    displayComponentDetails(component, sbomId, type) {
        Debug.info(`Displaying details for component: ${component.name}`);
        
        const sbom = SBOMStore.getSBOMById(sbomId);
        
        let html = `<h3>${component.name}</h3>`;
        html += `<div class="detail-section">`;
        html += `<p><strong>Type:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)}</p>`;
        html += `<p><strong>UUID:</strong> ${component.uuid}</p>`;
        html += `<p><strong>SBOM:</strong> ${sbom ? sbom.fileName : 'Unknown'}</p>`;
        
        // Type-specific details
        if (type === 'software') {
            html += `<p><strong>File Names:</strong> ${component.fileName.join(', ') || 'None'}</p>`;
            if (component.version) html += `<p><strong>Version:</strong> ${component.version}</p>`;
            if (component.size) html += `<p><strong>Size:</strong> ${Formatter.fileSize(component.size)}</p>`;
            
            // Show file hashes
            if (component.sha256 || component.sha1 || component.md5) {
                html += `<div class="hash-section">`;
                html += `<p><strong>Hashes:</strong></p>`;
                html += `<ul style="list-style: none; padding-left: 20px;">`;
                if (component.sha256) html += `<li><strong>SHA256:</strong> ${component.sha256}</li>`;
                if (component.sha1) html += `<li><strong>SHA1:</strong> ${component.sha1}</li>`;
                if (component.md5) html += `<li><strong>MD5:</strong> ${component.md5}</li>`;
                html += `</ul>`;
                html += `</div>`;
            }
            
            // ELF metadata if available
            if (component.elfMetadata) {
                const elf = component.elfMetadata;
                html += `<div class="elf-section">`;
                html += `<p><strong>ELF Metadata:</strong></p>`;
                
                // Create table for ELF metadata
                html += `<table class="detail-table">`;
                html += `<tr><th>Type</th><td>${elf.isExecutable ? 'Executable' : (elf.isLibrary ? 'Library' : 'Other')}</td></tr>`;
                
                if (elf.architecture) {
                    html += `<tr><th>Architecture</th><td>${elf.architecture}</td></tr>`;
                }
                
                // Show dependencies
                if (elf.dependencies && elf.dependencies.length > 0) {
                    html += `<tr>
                        <th>Dependencies</th>
                        <td>${elf.dependencies.join('<br>')}</td>
                    </tr>`;
                }
                
                // Show soname for libraries
                if (elf.soname && elf.soname.length > 0) {
                    html += `<tr><th>SONAME</th><td>${elf.soname.join(', ')}</td></tr>`;
                }
                
                // Show interpreter for executables
                if (elf.interpreter && elf.interpreter.length > 0) {
                    html += `<tr><th>Interpreter</th><td>${elf.interpreter.join(', ')}</td></tr>`;
                }
                
                // Show comments
                if (elf.comments && elf.comments.length > 0) {
                    html += `<tr>
                        <th>Comments</th>
                        <td>${elf.comments.join('<br>')}</td>
                    </tr>`;
                }
                
                html += `</table>`;
                html += `</div>`;
            }
        } else if (type === 'system') {
            if (component.vendor) html += `<p><strong>Vendor:</strong> ${component.vendor}</p>`;
            if (component.captureStart) {
                html += `<p><strong>Capture Start:</strong> ${Formatter.date(component.captureStart)}</p>`;
            }
            if (component.captureEnd) {
                html += `<p><strong>Capture End:</strong> ${Formatter.date(component.captureEnd)}</p>`;
            }
        } else if (type === 'hardware') {
            if (component.vendor) html += `<p><strong>Vendor:</strong> ${component.vendor.join(', ') || 'Unknown'}</p>`;
        }
        
        html += `</div>`;
        
        // Check if this is a common component
        const commonComponents = SBOMStore.findCommonComponents();
        let isCommon = false;
        
        for (const [, common] of commonComponents.entries()) {
            for (const occurrence of common.occurrences) {
                if (occurrence.uuid === component.uuid) {
                    isCommon = true;
                    
                    // Show all occurrences
                    html += `<div class="common-section">`;
                    html += `<h4>Common Dependency Found in:</h4>`;
                    html += `<ul>`;
                    
                    common.occurrences.forEach(o => {
                        const occSbom = SBOMStore.getSBOMById(o.sbomId);
                        if (occSbom) {
                            html += `<li>${occSbom.fileName}</li>`;
                        }
                    });
                    
                    html += `</ul>`;
                    html += `</div>`;
                    break;
                }
            }
            if (isCommon) break;
        }
        
        this.content.innerHTML = html;
    },
    
    /**
     * Display search results
     * @param {string} query - Search query
     * @param {Array} results - Search results
     */
    displaySearchResults(query, results) {
        let html = `<h3>Search Results</h3>`;
        
        if (results.length === 0) {
            html += `<p>No results found for "${query}"</p>`;
        } else {
            html += `<p>Found ${results.length} results for "${query}"</p>`;
            html += `<ul class="search-results">`;
            
            results.forEach(result => {
                const { component, sbomId, type } = result;
                const sbom = SBOMStore.getSBOMById(sbomId);
                
                html += `<li class="search-result-item" data-uuid="${component.uuid}" data-sbom-id="${sbomId}">`;
                html += `<strong>${component.name}</strong> (${type})`;
                html += `<div>SBOM: ${sbom ? sbom.fileName : 'Unknown'}</div>`;
                html += `</li>`;
            });
            
            html += `</ul>`;
        }
        
        this.content.innerHTML = html;
        
        // Add click event listeners for results
        document.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const uuid = item.dataset.uuid;
                const sbomId = item.dataset.sbomId;
                
                // Find the component
                const component = SBOMStore.getComponentByUuid(uuid);
                if (component) {
                    // Show details
                    this.displayComponentDetails(component.component, component.sbomId, component.type);
                    
                    // Trigger node selection event
                    const event = new CustomEvent('search-result-selected', { 
                        detail: {
                            uuid,
                            sbomId
                        }
                    });
                    document.dispatchEvent(event);
                }
            });
        });
    },
    
    /**
     * Show welcome message
     */
    showWelcomeMessage() {
        this.content.innerHTML = `
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
    }
};

// Export the DetailsPanel object
window.DetailsPanel = DetailsPanel;
