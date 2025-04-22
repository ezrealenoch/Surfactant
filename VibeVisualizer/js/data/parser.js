/**
 * SBOM Parser Module
 * Handles parsing and processing SBOM files
 */
const SBOMParser = {
    /**
     * Parse SBOM files and add them to the store
     * @param {Array} files - Array of File objects
     * @returns {Promise<Array>} - Array of processed SBOMs
     */
    parseFiles(files) {
        Debug.info(`Parsing ${files.length} SBOM files`);
        
        return FileHandler.handleFiles(files)
            .then(jsonDataArray => {
                const sboms = [];
                let duplicateCount = 0;
                
                jsonDataArray.forEach((jsonData, index) => {
                    try {
                        const fileName = files[index].name;
                        const sbom = SBOMStore.addSBOM(jsonData, fileName);
                        if (sbom) {
                            sboms.push(sbom);
                            Debug.showMessage(`Parsed SBOM: ${fileName} (${sbom.stats.totalComponents} components)`);
                        } else {
                            // sbom is null, meaning it was a duplicate
                            duplicateCount++;
                        }
                    } catch (error) {
                        Debug.error(`Failed to parse SBOM: ${files[index].name}`, error);
                        Debug.showMessage(`Failed to parse SBOM: ${files[index].name}`, 'error');
                    }
                });
                
                // If we had some duplicates, show a summary message
                if (duplicateCount > 0) {
                    Debug.showMessage(`${duplicateCount} duplicate SBOM(s) were ignored`, 'info');
                }
                
                return sboms;
            })
            .catch(error => {
                Debug.error('Error processing SBOM files', error);
                return [];
            });
    },
    
    /**
     * Load example SBOM data
     * @returns {Promise<Array>} - Array of loaded SBOMs
     */
    loadExampleData() {
        Debug.info('Loading example SBOM data');
        
        // Simple example SBOM for testing
        const exampleData = {
            systems: [
                {
                    UUID: '123456',
                    name: 'Example System',
                    vendor: 'Example Vendor',
                    captureStart: Date.now() / 1000,
                    captureEnd: Date.now() / 1000
                }
            ],
            hardware: [],
            software: [
                {
                    UUID: 'sw-123',
                    name: 'Example Software 1',
                    fileName: ['example1.exe'],
                    version: '1.0.0',
                    size: 1024 * 1024 * 2, // 2MB
                    sha256: 'abc123'
                },
                {
                    UUID: 'sw-456',
                    name: 'Example Software 2',
                    fileName: ['example2.so'],
                    version: '2.1.0',
                    size: 1024 * 512, // 512KB
                    sha256: 'def456',
                    metadata: [
                        {
                            OS: 'Linux',
                            elfIdent: { EI_CLASS: 2 },
                            elfIsLib: true,
                            elfDependencies: ['libc.so.6']
                        }
                    ]
                }
            ],
            relationships: [
                {
                    xUUID: '123456',
                    yUUID: 'sw-123',
                    relationship: 'Contains'
                },
                {
                    xUUID: '123456',
                    yUUID: 'sw-456',
                    relationship: 'Contains'
                }
            ]
        };
        
        try {
            const sbom = SBOMStore.addSBOM(exampleData, 'example.json');
            Debug.showMessage('Loaded example SBOM data');
            return Promise.resolve([sbom]);
        } catch (error) {
            Debug.error('Failed to load example data', error);
            return Promise.resolve([]);
        }
    }
};

// Export the SBOMParser
window.SBOMParser = SBOMParser;
