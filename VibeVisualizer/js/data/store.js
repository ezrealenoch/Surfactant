/**
 * Data store for SBOM data
 */
const SBOMStore = {
    // Collection of loaded SBOMs
    sboms: [],
    
    // Listeners for data changes
    listeners: [],
    
    /**
     * Check if an SBOM with similar content already exists in the store
     * @param {Object} jsonData - SBOM data to check
     * @param {string} fileName - Name of the file
     * @returns {boolean} - True if a duplicate exists
     */
    isDuplicateSBOM(jsonData, fileName) {
        // Check if the file name already exists
        const fileNameExists = this.sboms.some(sbom => sbom.fileName === fileName);
        if (fileNameExists) {
            Debug.info(`SBOM with filename ${fileName} already exists`);
            return true;
        }
        
        // More comprehensive check based on content
        // Check if the SBOM has the same components count and similar systems
        if (!jsonData.systems || !jsonData.software) {
            return false; // Can't properly check without these
        }
        
        return this.sboms.some(existingSbom => {
            // If component counts are very different, it's likely a different SBOM
            const softwareDiff = Math.abs((jsonData.software?.length || 0) - existingSbom.software.length);
            const systemsDiff = Math.abs((jsonData.systems?.length || 0) - existingSbom.systems.length);
            const hardwareDiff = Math.abs((jsonData.hardware?.length || 0) - existingSbom.hardware.length);
            
            if (softwareDiff + systemsDiff + hardwareDiff > 5) {
                return false; // Too different in structure
            }
            
            // Check for similar systems (if any system has the same name and vendor, it's likely the same SBOM)
            if (jsonData.systems && jsonData.systems.length > 0 && existingSbom.systems.length > 0) {
                return jsonData.systems.some(newSystem => 
                    existingSbom.systems.some(existingSystem => 
                        existingSystem.name === newSystem.name && 
                        existingSystem.vendor === newSystem.vendor
                    )
                );
            }
            
            // Check for similar software components by SHA256 or name
            if (jsonData.software && jsonData.software.length > 0) {
                let matchCount = 0;
                const sampleSize = Math.min(10, jsonData.software.length);
                
                // Take a sample of software components to check
                for (let i = 0; i < sampleSize; i++) {
                    const sw = jsonData.software[i];
                    
                    if (sw.sha256) {
                        // Check by SHA256
                        if (existingSbom.software.some(existingSw => existingSw.sha256 === sw.sha256)) {
                            matchCount++;
                        }
                    } else if (sw.name && sw.version) {
                        // Check by name and version
                        if (existingSbom.software.some(existingSw => 
                            existingSw.name === sw.name && existingSw.version === sw.version
                        )) {
                            matchCount++;
                        }
                    }
                }
                
                // If more than 70% of the sample matches, it's likely a duplicate
                return (matchCount / sampleSize) > 0.7;
            }
            
            return false;
        });
    },
    
    /**
     * Add a new SBOM to the store
     * @param {Object} jsonData - Parsed JSON data
     * @param {string} fileName - Name of the file
     * @returns {Object} - New SBOM or null if duplicate
     */
    addSBOM(jsonData, fileName) {
        Debug.info(`Adding SBOM: ${fileName}`);
        
        // Check if this SBOM already exists
        if (this.isDuplicateSBOM(jsonData, fileName)) {
            Debug.info(`Duplicate SBOM detected: ${fileName} - Ignoring`);
            Debug.showMessage(`Duplicate SBOM detected: ${fileName} - Ignoring`, 'warning');
            return null;
        }
        
        // Create a new SBOM object with a unique ID
        const sbomId = Formatter.uniqueId('sbom_');
        const color = Config.visualization.colorPalette[this.sboms.length % Config.visualization.colorPalette.length];
        
        const sbom = SBOMModel.createSBOM(sbomId, fileName, color);
        
        // Normalize data
        sbom.systems = SBOMNormalizer.normalizeSystems(jsonData.systems || []);
        sbom.hardware = SBOMNormalizer.normalizeHardware(jsonData.hardware || []);
        sbom.software = SBOMNormalizer.normalizeSoftware(jsonData.software || []);
        sbom.relationships = SBOMNormalizer.normalizeRelationships(jsonData.relationships || []);
        
        // Add metadata for visualization
        sbom.stats = SBOMNormalizer.calculateStats(sbom);
        sbom.graphData = SBOMNormalizer.createGraphData(sbom);
        
        Debug.info(`SBOM parsed: ${sbom.stats.totalComponents} components`);
        Debug.info(`Graph data created: ${sbom.graphData.nodes.length} nodes, ${sbom.graphData.links.length} links`);
        
        // Add to the collection
        this.sboms.push(sbom);
        
        // Notify listeners
        this.notifyListeners('sbom-added', sbom);
        
        // Update UI
        if (window.UIControls && window.UIControls.handleSBOMLoaded) {
            window.UIControls.handleSBOMLoaded(sbom);
        }
        
        return sbom;
    },
    
    /**
     * Remove an SBOM from the store
     * @param {string} sbomId - SBOM ID to remove
     * @returns {boolean} - Success
     */
    removeSBOM(sbomId) {
        const initialLength = this.sboms.length;
        this.sboms = this.sboms.filter(sbom => sbom.id !== sbomId);
        
        const removed = this.sboms.length < initialLength;
        
        if (removed) {
            this.notifyListeners('sbom-removed', sbomId);
            Debug.info(`Removed SBOM: ${sbomId}`);
        }
        
        return removed;
    },
    
    /**
     * Get an SBOM by ID
     * @param {string} sbomId - SBOM ID
     * @returns {Object|null} - SBOM or null if not found
     */
    getSBOMById(sbomId) {
        return this.sboms.find(sbom => sbom.id === sbomId) || null;
    },
    
    /**
     * Clear all SBOMs from the store
     */
    clear() {
        this.sboms = [];
        this.notifyListeners('store-cleared');
        Debug.info('Cleared all SBOMs from store');
    },
    
    /**
     * Find common components across SBOMs
     * @returns {Map} - Map of common components
     */
    findCommonComponents() {
        const componentMap = new Map();
        const commonComponents = new Map();
        
        // First pass: collect all components by SHA256 or filename
        this.sboms.forEach(sbom => {
            sbom.software.forEach(sw => {
                let key = '';
                // Prefer using SHA256 for identification
                if (sw.sha256) {
                    key = `sha256:${sw.sha256}`;
                } else if (sw.fileName && sw.fileName.length > 0) {
                    // Fallback to the first filename
                    key = `name:${sw.fileName[0]}`;
                } else {
                    return; // Skip components without identifiers
                }
                
                if (!componentMap.has(key)) {
                    componentMap.set(key, []);
                }
                
                componentMap.get(key).push({
                    sbomId: sbom.id,
                    uuid: sw.uuid,
                    component: sw
                });
            });
        });
        
        // Second pass: identify components that appear in multiple SBOMs
        for (const [key, occurrences] of componentMap.entries()) {
            if (occurrences.length > 1) {
                // Get unique SBOM IDs
                const sbomIds = [...new Set(occurrences.map(o => o.sbomId))];
                
                // Only consider as common if it appears in different SBOMs
                if (sbomIds.length > 1) {
                    commonComponents.set(key, {
                        occurrences,
                        sbomIds
                    });
                }
            }
        }
        
        return commonComponents;
    },
    
    /**
     * Get a component by UUID
     * @param {string} uuid - Component UUID
     * @returns {Object|null} - Component info or null if not found
     */
    getComponentByUuid(uuid) {
        for (const sbom of this.sboms) {
            // Check in systems
            const system = sbom.systems.find(s => s.uuid === uuid);
            if (system) return { component: system, sbomId: sbom.id, type: 'system' };
            
            // Check in hardware
            const hardware = sbom.hardware.find(h => h.uuid === uuid);
            if (hardware) return { component: hardware, sbomId: sbom.id, type: 'hardware' };
            
            // Check in software
            const software = sbom.software.find(s => s.uuid === uuid);
            if (software) return { component: software, sbomId: sbom.id, type: 'software' };
        }
        
        return null;
    },
    
    /**
     * Search for components
     * @param {string} query - Search query
     * @returns {Array} - Matching components
     */
    searchComponents(query) {
        const results = [];
        const queryLower = query.toLowerCase();
        
        this.sboms.forEach(sbom => {
            // Search in systems
            sbom.systems.forEach(system => {
                if (system.name.toLowerCase().includes(queryLower) ||
                    system.vendor.toString().toLowerCase().includes(queryLower)) {
                    results.push({
                        component: system,
                        sbomId: sbom.id,
                        type: 'system'
                    });
                }
            });
            
            // Search in hardware
            sbom.hardware.forEach(hardware => {
                if (hardware.name.toLowerCase().includes(queryLower) ||
                    hardware.vendor.toString().toLowerCase().includes(queryLower)) {
                    results.push({
                        component: hardware,
                        sbomId: sbom.id,
                        type: 'hardware'
                    });
                }
            });
            
            // Search in software
            sbom.software.forEach(software => {
                if (software.name.toLowerCase().includes(queryLower) ||
                    software.fileName.toString().toLowerCase().includes(queryLower) ||
                    software.vendor.toString().toLowerCase().includes(queryLower) ||
                    software.description.toLowerCase().includes(queryLower)) {
                    results.push({
                        component: software,
                        sbomId: sbom.id,
                        type: 'software'
                    });
                }
            });
        });
        
        return results;
    },
    
    /**
     * Subscribe to store changes
     * @param {Function} listener - Callback function
     * @returns {Function} - Unsubscribe function
     */
    subscribe(listener) {
        this.listeners.push(listener);
        
        // Return unsubscribe function
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    },
    
    /**
     * Notify all listeners of changes
     * @param {string} event - Event type
     * @param {any} data - Event data
     */
    notifyListeners(event, data) {
        this.listeners.forEach(listener => {
            listener(event, data);
        });
    }
};

// Export the SBOMStore
window.SBOMStore = SBOMStore;
