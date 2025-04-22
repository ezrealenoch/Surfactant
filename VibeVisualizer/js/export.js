/**
 * SBOM Export Module
 * Handles exporting visualizations and data from the SBOM Visualizer
 */
class SBOMExport {
    constructor() {
        // Initialize event listeners
        this.initializeEventListeners();
    }
    
    /**
     * Initialize event listeners for export buttons
     */
    initializeEventListeners() {
        // Export visualization as PNG
        document.getElementById('export-png').addEventListener('click', () => {
            this.exportAsPNG();
        });
        
        // Export visualization as SVG
        document.getElementById('export-svg').addEventListener('click', () => {
            this.exportAsSVG();
        });
        
        // Export data as JSON
        document.getElementById('export-json').addEventListener('click', () => {
            this.exportAsJSON();
        });
        
        // Export data as CSV
        document.getElementById('export-csv').addEventListener('click', () => {
            this.exportAsCSV();
        });
        
        // Generate report
        document.getElementById('generate-report').addEventListener('click', () => {
            this.generateReport();
        });
    }
    
    /**
     * Export the current visualization as PNG
     */
    exportAsPNG() {
        const activeView = document.querySelector('.active-view');
        const viewType = activeView.id === 'graph-view' ? 'graph' : 'matrix';
        const svg = activeView.querySelector('svg');
        
        if (!svg) {
            this.showExportError('No visualization found to export.');
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
                    saveAs(blob, `sbom-${viewType}-visualization-${timestamp}.png`);
                });
            };
            
            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
        } catch (error) {
            console.error('Error exporting PNG:', error);
            this.showExportError('Failed to export as PNG. Please try again.');
        }
    }
    
    /**
     * Export the current visualization as SVG
     */
    exportAsSVG() {
        const activeView = document.querySelector('.active-view');
        const viewType = activeView.id === 'graph-view' ? 'graph' : 'matrix';
        const svg = activeView.querySelector('svg');
        
        if (!svg) {
            this.showExportError('No visualization found to export.');
            return;
        }
        
        try {
            // Clone the SVG to avoid modifying the original
            const clonedSvg = svg.cloneNode(true);
            
            // Fix styling
            const styles = document.createElement('style');
            styles.textContent = this.getSvgStyles();
            clonedSvg.insertBefore(styles, clonedSvg.firstChild);
            
            // Export
            const svgData = new XMLSerializer().serializeToString(clonedSvg);
            const blob = new Blob([svgData], { type: 'image/svg+xml' });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            saveAs(blob, `sbom-${viewType}-visualization-${timestamp}.svg`);
        } catch (error) {
            console.error('Error exporting SVG:', error);
            this.showExportError('Failed to export as SVG. Please try again.');
        }
    }
    
    /**
     * Get CSS styles for SVG export
     */
    getSvgStyles() {
        return `
            .link { stroke: #999; stroke-opacity: 0.6; stroke-width: 1px; }
            .node path { stroke: #fff; stroke-width: 1.5px; }
            .sbom-label, .component-label { font-family: Arial, sans-serif; }
            .matrix-cell { stroke: #fff; stroke-width: 2px; }
        `;
    }
    
    /**
     * Export SBOM data as JSON
     */
    exportAsJSON() {
        if (sbomParser.sboms.length === 0) {
            this.showExportError('No SBOM data available to export.');
            return;
        }
        
        try {
            // Create a formatted SBOM export
            const exportData = sbomParser.sboms.map(sbom => {
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
            const commonComponents = sbomParser.findCommonComponents();
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
                    totalSboms: sbomParser.sboms.length,
                    totalComponents: sbomParser.sboms.reduce((acc, sbom) => 
                        acc + sbom.stats.totalComponents, 0),
                    commonComponentsCount: commonComponentsList.length
                }
            };
            
            // Convert to JSON and save
            const jsonData = JSON.stringify(fullExport, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            saveAs(blob, `sbom-data-export-${timestamp}.json`);
        } catch (error) {
            console.error('Error exporting JSON:', error);
            this.showExportError('Failed to export as JSON. Please try again.');
        }
    }
    
    /**
     * Export SBOM data as CSV
     */
    exportAsCSV() {
        if (sbomParser.sboms.length === 0) {
            this.showExportError('No SBOM data available to export.');
            return;
        }
        
        try {
            // Create CSV content for components
            let componentCsvContent = 'SBOM File,Component Type,UUID,Name,FileName,Version,SHA256,Common Component\n';
            
            // Get common components
            const commonComponents = sbomParser.findCommonComponents();
            const commonUuids = new Set();
            
            commonComponents.forEach(common => {
                common.occurrences.forEach(occurrence => {
                    commonUuids.add(occurrence.uuid);
                });
            });
            
            // Add all components
            sbomParser.sboms.forEach(sbom => {
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
            
            sbomParser.sboms.forEach(sbom => {
                sbom.relationships.forEach(rel => {
                    relationshipCsvContent += `"${sbom.fileName}","${rel.source}","${rel.target}","${rel.type}"\n`;
                });
            });
            
            // Export components CSV
            const componentBlob = new Blob([componentCsvContent], { type: 'text/csv' });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            saveAs(componentBlob, `sbom-components-${timestamp}.csv`);
            
            // Export relationships CSV
            const relationshipBlob = new Blob([relationshipCsvContent], { type: 'text/csv' });
            saveAs(relationshipBlob, `sbom-relationships-${timestamp}.csv`);
        } catch (error) {
            console.error('Error exporting CSV:', error);
            this.showExportError('Failed to export as CSV. Please try again.');
        }
    }
    
    /**
     * Generate an HTML report for the current SBOMs
     */
    generateReport() {
        if (sbomParser.sboms.length === 0) {
            this.showExportError('No SBOM data available for report generation.');
            return;
        }
        
        try {
            // Get common components
            const commonComponents = sbomParser.findCommonComponents();
            
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
                    <p>Total SBOMs analyzed: ${sbomParser.sboms.length}</p>
                    <p>Total components: ${sbomParser.sboms.reduce((acc, sbom) => 
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
            sbomParser.sboms.forEach(sbom => {
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
                for (const [, common] of commonComponents) {
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
                        const sbom = sbomParser.getSBOMById(sbomId);
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
            
            // Add SBOM details sections
            htmlContent += `
                <h2>SBOM Details</h2>
            `;
            
            sbomParser.sboms.forEach(sbom => {
                htmlContent += `
                <h3>${sbom.fileName}</h3>
                
                <h4>Software Components (${sbom.software.length})</h4>
                `;
                
                if (sbom.software.length > 0) {
                    htmlContent += `
                    <table>
                        <tr>
                            <th>Name</th>
                            <th>File Names</th>
                            <th>Version</th>
                            <th>Size</th>
                            <th>Type</th>
                            <th>Common</th>
                        </tr>
                    `;
                    
                    sbom.software.forEach(sw => {
                        const fileNames = sw.fileName.join(', ');
                        const isCommon = Array.from(commonComponents.values()).some(common => 
                            common.occurrences.some(o => o.uuid === sw.uuid)
                        );
                        
                        let type = 'Other';
                        if (sw.elfMetadata) {
                            if (sw.elfMetadata.isExecutable) type = 'Executable';
                            else if (sw.elfMetadata.isLibrary) type = 'Library';
                        }
                        
                        htmlContent += `
                        <tr${isCommon ? ' class="common-highlight"' : ''}>
                            <td>${sw.name}</td>
                            <td>${fileNames}</td>
                            <td>${sw.version || ''}</td>
                            <td>${formatFileSize(sw.size)}</td>
                            <td>${type}</td>
                            <td>${isCommon ? 'Yes' : 'No'}</td>
                        </tr>
                        `;
                    });
                    
                    htmlContent += `
                    </table>
                    `;
                } else {
                    htmlContent += `
                    <p>No software components found in this SBOM.</p>
                    `;
                }
            });
            
            // Close HTML document
            htmlContent += `
            </body>
            </html>
            `;
            
            // Export as HTML
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            saveAs(blob, `sbom-report-${timestamp}.html`);
        } catch (error) {
            console.error('Error generating report:', error);
            this.showExportError('Failed to generate report. Please try again.');
        }
    }
    
    /**
     * Show export error notification
     * @param {string} message - Error message
     */
    showExportError(message) {
        alert(message);
    }
}

// Create a global instance
const sbomExport = new SBOMExport();
