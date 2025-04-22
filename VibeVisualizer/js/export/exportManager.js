/**
 * Export Manager for SBOM Visualizer
 */
const ExportManager = {
    /**
     * Initialize the export manager
     */
    initialize() {
        // Setup event listeners for export buttons
        document.getElementById('export-png').addEventListener('click', () => {
            this.exportVisualizationAsPNG();
        });
        
        document.getElementById('export-svg').addEventListener('click', () => {
            this.exportVisualizationAsSVG();
        });
        
        document.getElementById('export-json').addEventListener('click', () => {
            this.exportDataAsJSON();
        });
        
        document.getElementById('export-csv').addEventListener('click', () => {
            this.exportDataAsCSV();
        });
        
        document.getElementById('generate-report').addEventListener('click', () => {
            this.generateReport();
        });
        
        Debug.info('Export manager initialized');
    },
    
    /**
     * Export the current visualization as PNG
     */
    exportVisualizationAsPNG() {
        Debug.info('Exporting visualization as PNG');
        
        // Get the active view container
        const activeView = document.querySelector('.active-view');
        const viewType = activeView.id === 'graph-view' ? 'graph' : 'matrix';
        const svg = activeView.querySelector('svg');
        
        if (!svg) {
            Debug.error('No SVG found for export');
            alert('No visualization found to export.');
            return;
        }
        
        try {
            // Create a canvas element to convert SVG to PNG
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set canvas dimensions to match SVG
            const svgRect = svg.getBoundingClientRect();
            canvas.width = svgRect.width;
            canvas.height = svgRect.height;
            
            // Background color
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Create an image from the SVG
            const svgData = new XMLSerializer().serializeToString(svg);
            const img = new Image();
            
            img.onload = function() {
                ctx.drawImage(img, 0, 0);
                
                // Export as PNG
                canvas.toBlob(function(blob) {
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    FileHandler.saveAs(blob, `sbom-${viewType}-visualization-${timestamp}.png`);
                    Debug.showMessage('Exported visualization as PNG');
                });
            };
            
            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
        } catch (error) {
            Debug.error('Error exporting PNG', error);
            alert('Failed to export as PNG. Please try again.');
        }
    },
    
    /**
     * Export the current visualization as SVG
     */
    exportVisualizationAsSVG() {
        Debug.info('Exporting visualization as SVG');
        
        // Get the active view container
        const activeView = document.querySelector('.active-view');
        const viewType = activeView.id === 'graph-view' ? 'graph' : 'matrix';
        const svg = activeView.querySelector('svg');
        
        if (!svg) {
            Debug.error('No SVG found for export');
            alert('No visualization found to export.');
            return;
        }
        
        try {
            // Clone the SVG to avoid modifying the original
            const clonedSvg = svg.cloneNode(true);
            
            // Fix styling
            const styles = document.createElement('style');
            styles.textContent = VizStyles.getSvgStyles();
            clonedSvg.insertBefore(styles, clonedSvg.firstChild);
            
            // Export
            const svgData = new XMLSerializer().serializeToString(clonedSvg);
            const blob = new Blob([svgData], { type: 'image/svg+xml' });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            FileHandler.saveAs(blob, `sbom-${viewType}-visualization-${timestamp}.svg`);
            Debug.showMessage('Exported visualization as SVG');
        } catch (error) {
            Debug.error('Error exporting SVG', error);
            alert('Failed to export as SVG. Please try again.');
        }
    },
    
    /**
     * Export SBOM data as JSON
     */
    exportDataAsJSON() {
        Debug.info('Exporting data as JSON');
        
        if (SBOMStore.sboms.length === 0) {
            alert('No SBOM data available to export.');
            return;
        }
        
        try {
            // Create a formatted SBOM export
            const exportData = SBOMStore.sboms.map(sbom => {
                return {
                    fileName: sbom.fileName,
                    systems: sbom.systems,
                    hardware: sbom.hardware,
                    software: sbom.software,
                    relationships: sbom.relationships,
                    stats: sbom.stats
                };
            });
            
            // Add common components metadata
            const commonComponents = SBOMStore.findCommonComponents();
            const commonComponentsList = [];
            
            for (const [key, common] of commonComponents.entries()) {
                commonComponentsList.push({
                    key,
                    sbomIds: common.sbomIds,
                    occurrences: common.occurrences.map(o => ({
                        sbomId: o.sbomId,
                        uuid: o.uuid,
                        fileName: o.component.fileName,
                        name: o.component.name
                    }))
                });
            }
            
            const fullExport = {
                sboms: exportData,
                commonComponents: commonComponentsList,
                exportDate: new Date().toISOString(),
                exportSummary: {
                    totalSboms: SBOMStore.sboms.length,
                    totalComponents: SBOMStore.sboms.reduce((acc, sbom) => 
                        acc + sbom.stats.totalComponents, 0),
                    commonComponentsCount: commonComponentsList.length
                }
            };
            
            // Convert to JSON and save
            const jsonData = JSON.stringify(fullExport, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            FileHandler.saveAs(blob, `sbom-data-export-${timestamp}.json`);
            Debug.showMessage('Exported data as JSON');
        } catch (error) {
            Debug.error('Error exporting JSON', error);
            alert('Failed to export as JSON. Please try again.');
        }
    },
    
    /**
     * Export SBOM data as CSV
     */
    exportDataAsCSV() {
        Debug.info('Exporting data as CSV');
        
        if (SBOMStore.sboms.length === 0) {
            alert('No SBOM data available to export.');
            return;
        }
        
        try {
            // Create CSV content for components
            let componentCsvContent = 'SBOM File,Component Type,UUID,Name,FileName,Version,SHA256,Common Component\n';
            
            // Get common components
            const commonComponents = SBOMStore.findCommonComponents();
            const commonUuids = new Set();
            
            commonComponents.forEach(common => {
                common.occurrences.forEach(occurrence => {
                    commonUuids.add(occurrence.uuid);
                });
            });
            
            // Add all components
            SBOMStore.sboms.forEach(sbom => {
                // Systems
                sbom.systems.forEach(system => {
                    componentCsvContent += `"${sbom.fileName}","System","${system.uuid}","${system.name}","","","",`;
                    componentCsvContent += `"${commonUuids.has(system.uuid) ? 'Yes' : 'No'}"\n`;
                });
                
                // Hardware
                sbom.hardware.forEach(hw => {
                    componentCsvContent += `"${sbom.fileName}","Hardware","${hw.uuid}","${hw.name}","","","",`;
                    componentCsvContent += `"${commonUuids.has(hw.uuid) ? 'Yes' : 'No'}"\n`;
                });
                
                // Software
                sbom.software.forEach(sw => {
                    const fileNames = sw.fileName.join(', ');
                    componentCsvContent += `"${sbom.fileName}","Software","${sw.uuid}","${sw.name}","${fileNames}","${sw.version || ''}","${sw.sha256 || ''}",`;
                    componentCsvContent += `"${commonUuids.has(sw.uuid) ? 'Yes' : 'No'}"\n`;
                });
            });
            
            // Create CSV content for relationships
            let relationshipCsvContent = 'SBOM File,Source UUID,Target UUID,Relationship Type\n';
            
            SBOMStore.sboms.forEach(sbom => {
                sbom.relationships.forEach(rel => {
                    relationshipCsvContent += `"${sbom.fileName}","${rel.source}","${rel.target}","${rel.type}"\n`;
                });
            });
            
            // Export components CSV
            const componentBlob = new Blob([componentCsvContent], { type: 'text/csv' });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            FileHandler.saveAs(componentBlob, `sbom-components-${timestamp}.csv`);
            
            // Export relationships CSV
            const relationshipBlob = new Blob([relationshipCsvContent], { type: 'text/csv' });
            FileHandler.saveAs(relationshipBlob, `sbom-relationships-${timestamp}.csv`);
            
            Debug.showMessage('Exported data as CSV files');
        } catch (error) {
            Debug.error('Error exporting CSV', error);
            alert('Failed to export as CSV. Please try again.');
        }
    },
    
    /**
     * Generate an HTML report for SBOMs
     */
    generateReport() {
        Debug.info('Generating SBOM report');
        
        if (SBOMStore.sboms.length === 0) {
            alert('No SBOM data available for report generation.');
            return;
        }
        
        try {
            // Get common components
            const commonComponents = SBOMStore.findCommonComponents();
            
            // Create HTML content
            let htmlContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>SBOM Analysis Report</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 1200px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    h1, h2, h3 {
                        color: #2c3e50;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 20px;
                    }
                    th, td {
                        border: 1px solid #ddd;
                        padding: 8px;
                        text-align: left;
                    }
                    th {
                        background-color: #f2f2f2;
                    }
                    tr:nth-child(even) {
                        background-color: #f9f9f9;
                    }
                    .summary-box {
                        background-color: #f8f9fa;
                        border: 1px solid #ddd;
                        padding: 15px;
                        border-radius: 5px;
                        margin-bottom: 20px;
                    }
                    .common-highlight {
                        background-color: #fff3cd;
                    }
                </style>
            </head>
            <body>
                <h1>SBOM Analysis Report</h1>
                <p>Generated on: ${new Date().toLocaleString()}</p>
                
                <div class="summary-box">
                    <h2>Summary</h2>
                    <p>Total SBOMs analyzed: ${SBOMStore.sboms.length}</p>
                    <p>Total components: ${SBOMStore.sboms.reduce((acc, sbom) => 
                        acc + sbom.stats.totalComponents, 0)}</p>
                    <p>Common components found across multiple SBOMs: ${commonComponents.size}</p>
                </div>
                
                <h2>SBOM Overview</h2>
                <table>
                    <tr>
                        <th>SBOM File</th>
                        <th>Total Components</th>
                        <th>Software Components</th>
                        <th>Hardware Components</th>
                        <th>Systems</th>
                        <th>Capture Date</th>
                    </tr>
            `;
            
            // Add SBOM rows
            SBOMStore.sboms.forEach(sbom => {
                htmlContent += `
                    <tr>
                        <td>${sbom.fileName}</td>
                        <td>${sbom.stats.totalComponents}</td>
                        <td>${sbom.stats.softwareCount}</td>
                        <td>${sbom.hardware.length}</td>
                        <td>${sbom.systems.length}</td>
                        <td>${sbom.stats.captureTime}</td>
                    </tr>
                `;
            });
            
            htmlContent += `
                </table>
                
                <h2>Common Dependencies</h2>
            `;
            
            if (commonComponents.size > 0) {
                htmlContent += `
                <table>
                    <tr>
                        <th>Component</th>
                        <th>Type</th>
                        <th>Present In SBOMs</th>
                        <th>SHA256 (if available)</th>
                    </tr>
                `;
                
                // Add common component rows
                for (const [, common] of commonComponents.entries()) {
                    const firstOccurrence = common.occurrences[0];
                    let name = 'Unknown Component';
                    let type = 'Software';
                    let sha256 = '';
                    
                    if (firstOccurrence && firstOccurrence.component) {
                        if (firstOccurrence.component.name) {
                            name = firstOccurrence.component.name;
                        } else if (firstOccurrence.component.fileName && firstOccurrence.component.fileName.length > 0) {
                            name = firstOccurrence.component.fileName.join(', ');
                        }
                        
                        sha256 = firstOccurrence.component.sha256 || '';
                    }
                    
                    // Get the list of SBOMs this component appears in
                    const sbomNames = common.sbomIds.map(sbomId => {
                        const sbom = SBOMStore.getSBOMById(sbomId);
                        return sbom ? sbom.fileName : 'Unknown';
                    }).join(', ');
                    
                    htmlContent += `
                        <tr class="common-highlight">
                            <td>${name}</td>
                            <td>${type}</td>
                            <td>${sbomNames}</td>
                            <td>${sha256}</td>
                        </tr>
                    `;
                }
                
                htmlContent += `
                </table>
                `;
            } else {
                htmlContent += `
                <p>No common dependencies found across the analyzed SBOMs.</p>
                `;
            }
            
            // Close HTML document
            htmlContent += `
            </body>
            </html>
            `;
            
            // Export as HTML
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            FileHandler.saveAs(blob, `sbom-report-${timestamp}.html`);
            Debug.showMessage('Generated HTML report');
        } catch (error) {
            Debug.error('Error generating report', error);
            alert('Failed to generate report. Please try again.');
        }
    }
};

// Export the ExportManager object
window.ExportManager = ExportManager;
