/**
 * Data normalization for SBOM files
 */
const SBOMNormalizer = {
    /**
     * Normalize systems data
     * @param {Array} systems - Array of system objects
     * @returns {Array} - Normalized systems array
     */
    normalizeSystems(systems) {
        return systems.map(system => {
            return SBOMModel.createSystem(
                system.UUID,
                system.name || 'Unnamed System', 
                system
            );
        });
    },

    /**
     * Normalize hardware data
     * @param {Array} hardware - Array of hardware objects
     * @returns {Array} - Normalized hardware array
     */
    normalizeHardware(hardware) {
        return hardware.map(hw => {
            return SBOMModel.createHardware(
                hw.UUID,
                hw.name || 'Unnamed Hardware',
                hw
            );
        });
    },

    /**
     * Normalize software data
     * @param {Array} software - Array of software objects
     * @returns {Array} - Normalized software array
     */
    normalizeSoftware(software) {
        return software.map(sw => {
            return SBOMModel.createSoftware(
                sw.UUID,
                this.extractName(sw),
                sw
            );
        });
    },

    /**
     * Extract a readable name from a software component
     * @param {Object} sw - Software component
     * @returns {string} - Readable name
     */
    extractName(sw) {
        if (sw.name) return sw.name;
        if (sw.fileName && sw.fileName.length > 0) return sw.fileName[0];
        return 'Unnamed Component';
    },

    /**
     * Normalize relationship data
     * @param {Array} relationships - Array of relationship objects
     * @returns {Array} - Normalized relationships array
     */
    normalizeRelationships(relationships) {
        return relationships.map(rel => {
            return SBOMModel.createRelationship(
                rel.xUUID || '',
                rel.yUUID || '',
                rel.relationship || 'Unknown'
            );
        });
    },

    /**
     * Calculate statistics for an SBOM
     * @param {Object} sbom - SBOM object
     * @returns {Object} - Statistics
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
            captureTime: Formatter.date(captureTime)
        };
    },

    /**
     * Create graph data for visualization
     * @param {Object} sbom - SBOM object
     * @returns {Object} - Graph data with nodes and links
     */
    createGraphData(sbom) {
        const nodes = [];
        const links = [];
        
        // Add system nodes
        sbom.systems.forEach(system => {
            nodes.push(SBOMModel.createNode(
                system.uuid,
                system.name,
                'system',
                sbom.id,
                system
            ));
        });
        
        // Add hardware nodes
        sbom.hardware.forEach(hw => {
            nodes.push(SBOMModel.createNode(
                hw.uuid,
                hw.name,
                'hardware',
                sbom.id,
                hw
            ));
        });
        
        // Add software nodes
        sbom.software.forEach(sw => {
            nodes.push(SBOMModel.createNode(
                sw.uuid,
                sw.name,
                'software',
                sbom.id,
                sw
            ));
        });
        
        // Add relationship links
        sbom.relationships.forEach(rel => {
            links.push(SBOMModel.createLink(
                rel.source,
                rel.target,
                rel.type,
                sbom.id
            ));
        });
        
        return { nodes, links };
    }
};

// Export the SBOMNormalizer
window.SBOMNormalizer = SBOMNormalizer;
