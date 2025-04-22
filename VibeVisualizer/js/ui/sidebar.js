/**
 * Sidebar UI management for SBOM Visualizer
 */
const Sidebar = {
    /**
     * Initialize the sidebar
     */
    initialize() {
        this.sbomList = document.getElementById('sbom-list');
        
        // Subscribe to SBOM store changes
        SBOMStore.subscribe(this.handleStoreChange.bind(this));
        
        Debug.info('Sidebar initialized');
    },
    
    /**
     * Handle store changes
     * @param {string} event - Event type
     * @param {any} data - Event data
     */
    handleStoreChange(event, data) {
        if (event === 'sbom-added' || event === 'sbom-removed' || event === 'store-cleared') {
            this.updateSBOMList();
        }
    },
    
    /**
     * Update the SBOM list
     */
    updateSBOMList() {
        Debug.info('Updating SBOM list');
        
        // Clear existing list
        this.sbomList.innerHTML = '';
        
        if (SBOMStore.sboms.length === 0) {
            this.sbomList.innerHTML = '<div class="no-sboms-message">No SBOMs uploaded yet</div>';
            return;
        }
        
        // Check if we have newly added SBOMs that aren't selected yet
        const newSboms = SBOMStore.sboms.filter(sbom => !AppState.current.visibleSboms.includes(sbom.id));
        if (newSboms.length > 0) {
            // Auto-select new SBOMs
            newSboms.forEach(sbom => {
                AppState.current.visibleSboms.push(sbom.id);
                Debug.info(`Auto-selected SBOM: ${sbom.fileName}`);
            });
            Debug.showMessage(`Auto-selected ${newSboms.length} new SBOM(s)`);
        }
        
        // If no SBOMs are visible yet, make all visible
        if (AppState.current.visibleSboms.length === 0) {
            AppState.current.visibleSboms = SBOMStore.sboms.map(sbom => sbom.id);
            Debug.info('Selected all SBOMs by default');
        }
        
        // Create a list item for each SBOM
        SBOMStore.sboms.forEach(sbom => {
            const isActive = AppState.current.visibleSboms.includes(sbom.id);
            
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
                    if (AppState.current.visibleSboms.length > 1) {
                        AppState.current.visibleSboms = AppState.current.visibleSboms.filter(id => id !== sbom.id);
                        Debug.info(`Deselected SBOM: ${sbom.fileName}`);
                    }
                } else {
                    AppState.current.visibleSboms.push(sbom.id);
                    Debug.info(`Selected SBOM: ${sbom.fileName}`);
                }
                
                // Update UI
                this.updateSBOMList();
                
                // Trigger state update event
                const event = new CustomEvent('visualization-update-requested');
                document.dispatchEvent(event);
            });
            
            this.sbomList.appendChild(sbomItem);
        });
    }
};

// Export the Sidebar object
window.Sidebar = Sidebar;
