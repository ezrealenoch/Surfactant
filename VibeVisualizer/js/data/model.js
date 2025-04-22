/**
 * Data models for the SBOM Visualizer
 */
const SBOMModel = {
    /**
     * Create a new SBOM object
     * @param {string} id - Unique ID
     * @param {string} fileName - File name
     * @param {string} color - Display color
     * @returns {Object} - New SBOM object
     */
    createSBOM(id, fileName, color) {
        return {
            id,
            fileName,
            color,
            systems: [],
            hardware: [],
            software: [],
            relationships: [],
            stats: {
                totalComponents: 0,
                softwareCount: 0,
                executableCount: 0,
                libraryCount: 0,
                captureTime: null
            },
            graphData: {
                nodes: [],
                links: []
            }
        };
    },
    
    /**
     * Create a system component
     * @param {string} uuid - Component UUID
     * @param {string} name - Component name
     * @param {Object} data - Raw component data
     * @returns {Object} - System component
     */
    createSystem(uuid, name, data) {
        return {
            uuid: uuid || '',
            name: name || 'Unnamed System',
            vendor: data.vendor || '',
            captureStart: data.captureStart || 0,
            captureEnd: data.captureEnd || 0,
            type: 'system',
            metadata: data.metadata || []
        };
    },
    
    /**
     * Create a hardware component
     * @param {string} uuid - Component UUID
     * @param {string} name - Component name
     * @param {Object} data - Raw component data
     * @returns {Object} - Hardware component
     */
    createHardware(uuid, name, data) {
        return {
            uuid: uuid || '',
            name: name || 'Unnamed Hardware',
            vendor: data.vendor || [],
            type: 'hardware',
            metadata: data.metadata || []
        };
    },
    
    /**
     * Create a software component
     * @param {string} uuid - Component UUID
     * @param {string} name - Component name
     * @param {Object} data - Raw component data
     * @returns {Object} - Software component
     */
    createSoftware(uuid, name, data) {
        return {
            uuid: uuid || '',
            name: name || 'Unnamed Software',
            fileName: data.fileName || [],
            version: data.version || '',
            size: data.size || 0,
            vendor: data.vendor || [],
            description: data.description || '',
            installPath: data.installPath || [],
            containerPath: data.containerPath || [],
            captureTime: data.captureTime || 0,
            sha1: data.sha1 || '',
            sha256: data.sha256 || '',
            md5: data.md5 || '',
            metadata: data.metadata || [],
            type: 'software',
            elfMetadata: this.extractElfMetadata(data)
        };
    },
    
    /**
     * Extract ELF metadata if available
     * @param {Object} data - Component data
     * @returns {Object|null} - ELF metadata
     */
    extractElfMetadata(data) {
        if (!data.metadata) return null;
        
        for (const meta of data.metadata) {
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
    },
    
    /**
     * Create a relationship
     * @param {string} source - Source UUID
     * @param {string} target - Target UUID
     * @param {string} type - Relationship type
     * @returns {Object} - Relationship
     */
    createRelationship(source, target, type) {
        return {
            source: source || '',
            target: target || '',
            type: type || 'Unknown'
        };
    },
    
    /**
     * Create a node for visualization
     * @param {string} id - Node ID
     * @param {string} name - Node name
     * @param {string} type - Node type
     * @param {string} sbomId - SBOM ID
     * @param {Object} data - Component data
     * @returns {Object} - Node
     */
    createNode(id, name, type, sbomId, data) {
        return {
            id,
            name,
            type,
            subtype: this.getSubtype(data, type),
            sbomId,
            data,
            isCommon: false
        };
    },
    
    /**
     * Get component subtype
     * @param {Object} data - Component data
     * @param {string} type - Component type
     * @returns {string|null} - Subtype
     */
    getSubtype(data, type) {
        if (type === 'software' && data.elfMetadata) {
            if (data.elfMetadata.isExecutable) return 'executable';
            if (data.elfMetadata.isLibrary) return 'library';
            return 'other';
        }
        return null;
    },
    
    /**
     * Create a link for visualization
     * @param {string} source - Source ID
     * @param {string} target - Target ID
     * @param {string} type - Link type
     * @param {string} sbomId - SBOM ID
     * @returns {Object} - Link
     */
    createLink(source, target, type, sbomId) {
        return {
            source,
            target,
            type,
            sbomId
        };
    }
};

// Export the SBOMModel
window.SBOMModel = SBOMModel;
