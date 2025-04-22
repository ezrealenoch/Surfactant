/**
 * SBOM Parser Module
 * Handles parsing and normalizing SBOM JSON files
 */
class SBOMParser {
    constructor() {
        this.sboms = [];
        this.colorPalette = [
            '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
            '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
        ];
    }

    /**
     * Parse a single SBOM JSON file
     * @param {Object} jsonData - Parsed JSON data
     * @param {string} fileName - Name of the file
     * @returns {Object} Normalized SBOM data
     */
    parseSBOM(jsonData, fileName) {
        debugLog(`Parsing SBOM: ${fileName}`);
        
        // Create a new SBOM object with a unique ID
        const sbomId = 'sbom_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        const color = this.colorPalette[this.sboms.length % this.colorPalette.length];
        
        const sbom = {
            id: sbomId,
            fileName: fileName,
            color: color,
            systems: this.normalizeSystems(jsonData.systems || []),
            hardware: this.normalizeHardware(jsonData.hardware || []),
            software: this.normalizeSoftware(jsonData.software || []),
            relationships: this.normalizeRelationships(jsonData.relationships || []),
            raw: jsonData // Keep the raw data for reference
        };

        // Add metadata for visualization
        sbom.stats = this.calculateStats(sbom);
        sbom.graphData = this.createGraphData(sbom);
        
        debugLog(`SBOM parsed: ${sbom.stats.totalComponents} components found`);
        debugLog(`Graph data created: ${sbom.graphData.nodes.length} nodes, ${sbom.graphData.links.length} links`);
        
        // Add to the collection
        this.sboms.push(sbom);
        
        return sbom;
    }

    /**
     * Normalize systems data
     * @param {Array} systems - Array of system objects
     * @returns {Array} Normalized systems array
     */
    normalizeSystems(systems) {
        return systems.map(system => {
            return {
                uuid: system.UUID || '',
                name: system.name || 'Unnamed System',
                vendor: system.vendor || '',
                captureStart: system.captureStart || 0,
                captureEnd: system.captureEnd || 0,
                type: 'system',
                metadata: system.metadata || []
            };
        });
    }

    /**
     * Normalize hardware data
     * @param {Array} hardware - Array of hardware objects
     * @returns {Array} Normalized hardware array
     */
    normalizeHardware(hardware) {
        return hardware.map(hw => {
            return {
                uuid: hw.UUID || '',
                name: hw.name || 'Unnamed Hardware',
                vendor: hw.vendor || [],
                type: 'hardware',
                metadata: hw.metadata || []
            };
        });
    }

    /**
     * Normalize software data
     * @param {Array} software - Array of software objects
     * @returns {Array} Normalized software array
     */
    normalizeSoftware(software) {
        return software.map(sw => {
            return {
                uuid: sw.UUID || '',
                name: this.extractName(sw),
                fileName: sw.fileName || [],
                version: sw.version || '',
                size: sw.size || 0,
                vendor: sw.vendor || [],
                description: sw.description || '',
                installPath: sw.installPath || [],
                containerPath: sw.containerPath || [],
                captureTime: sw.captureTime || 0,
                sha1: sw.sha1 || '',
                sha256: sw.sha256 || '',
                md5: sw.md5 || '',
                metadata: sw.metadata || [],
                type: 'software',
                elfMetadata: this.extractElfMetadata(sw)
            };
        });
    }

    /**
     * Extract a readable name from a software component
     * @param {Object} sw - Software component
     * @returns {string} Readable name
     */
    extractName(sw) {
        if (sw.name) return sw.name;
        if (sw.fileName && sw.fileName.length > 0) return sw.fileName[0];
        return 'Unnamed Component';
    }

    /**
     * Extract ELF metadata if available
     * @param {Object} sw - Software component
     * @returns {Object|null} ELF metadata or null
     */
    extractElfMetadata(sw) {
        if (!sw.metadata) return null;
        
        for (const meta of sw.metadata) {
            if (meta.OS === 'Linux' && meta.elfIdent) {
                return {
                    isExecutable: meta.elfIsExe || false,
                    isLibrary: meta.elfIsLib || false,
                    dependencies: meta.elfDependencies || [],
                    soname: meta.elfSoname || [],
                    interpreter: meta.elfInterpreter || [],
                    architecture: meta.elfHumanArch || '',
                    comments: meta.elfComment || []
                };
            }
        }
        
        return null;
    }

    /**
     * Normalize relationship data
     * @param {Array} relationships - Array of relationship objects
     * @returns {Array} Normalized relationships array
     */
    normalizeRelationships(relationships) {
        return relationships.map(rel => {
            return {
                source: rel.xUUID || '',
                target: rel.yUUID || '',
                type: rel.relationship || 'Unknown'
            };
        });
    }

    /**
     * Calculate statistics for an SBOM
     * @param {Object} sbom - SBOM object
     * @returns {Object} Statistics
     */
    calculateStats(sbom) {
        const softwareCount = sbom.software.length;
        const executableCount = sbom.software.filter(sw => 
            sw.elfMetadata && sw.elfMetadata.isExecutable
        ).length;
        const libraryCount = sbom.software.filter(sw => 
            sw.elfMetadata && sw.elfMetadata.isLibrary
        ).length;
        
        let captureTime = 0;
        if (sbom.systems.length > 0) {
            captureTime = sbom.systems[0].captureEnd || sbom.systems[0].captureStart;
        } else if (sbom.software.length > 0) {
            // Use the first software's capture time as fallback
            captureTime = sbom.software[0].captureTime;
        }
        
        return {
            totalComponents: sbom.systems.length + sbom.hardware.length + sbom.software.length,
            softwareCount,
            executableCount,
            libraryCount,
            captureTime: new Date(captureTime * 1000).toLocaleDateString()
        };
    }

    /**
     * Create graph data for visualization
     * @param {Object} sbom - SBOM object
     * @returns {Object} Graph data with nodes and links
     */
    createGraphData(sbom) {
        const nodes = [];
        const links = [];
        
        // Add system nodes
        sbom.systems.forEach(system => {
            nodes.push({
                id: system.uuid,
                name: system.name,
                type: 'system',
                sbomId: sbom.id,
                data: system
            });
        });
        
        // Add hardware nodes
        sbom.hardware.forEach(hw => {
            nodes.push({
                id: hw.uuid,
                name: hw.name,
                type: 'hardware',
                sbomId: sbom.id,
                data: hw
            });
        });
        
        // Add software nodes
        sbom.software.forEach(sw => {
            nodes.push({
                id: sw.uuid,
                name: sw.name,
                type: 'software',
                subtype: sw.elfMetadata ? 
                    (sw.elfMetadata.isExecutable ? 'executable' : 
                     sw.elfMetadata.isLibrary ? 'library' : 'other') : 'other',
                sbomId: sbom.id,
                data: sw
            });
        });
        
        // Add relationship links
        sbom.relationships.forEach(rel => {
            links.push({
                source: rel.source,
                target: rel.target,
                type: rel.type,
                sbomId: sbom.id
            });
        });
        
        return { nodes, links };
    }

    /**
     * Find components that are common across multiple SBOMs
     * @returns {Object} Map of common components with their occurrences
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
    }
    
    /**
     * Get a specific SBOM by its ID
     * @param {string} sbomId - SBOM ID
     * @returns {Object|null} SBOM object or null if not found
     */
    getSBOMById(sbomId) {
        return this.sboms.find(sbom => sbom.id === sbomId) || null;
    }
    
    /**
     * Get a component by its UUID
     * @param {string} uuid - Component UUID
     * @returns {Object|null} Component object or null if not found
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
    }
    
    /**
     * Search for components across all SBOMs
     * @param {string} query - Search query
     * @returns {Array} Matching components
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
    }
}

// Create a global instance
const sbomParser = new SBOMParser();
