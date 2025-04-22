/**
 * Matrix visualization for SBOM Visualizer
 */
class MatrixVisualization extends BaseVisualization {
    constructor(elementId) {
        super(elementId);
        
        this.svg = null;
        this.cellSize = 24; // Default cell size
        this.margin = { top: 120, right: 20, bottom: 20, left: 250 };
    }
    
    /**
     * Initialize the visualization
     */
    initialize() {
        super.initialize();
        
        // Create SVG container
        this.svg = d3.select(this.container).append('svg')
            .attr('width', this.width)
            .attr('height', this.height);
        
        // Create a group for the matrix with margin
        this.matrixGroup = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
    }
    
    /**
     * Render the matrix visualization
     * @param {Array} sboms - Array of SBOMs to visualize
     * @param {Object} options - Rendering options
     */
    render(sboms, options = {}) {
        if (!this.svg) this.initialize();
        
        Debug.info(`Rendering matrix visualization for ${sboms.length} SBOMs`);
        
        // Clear current visualization
        this.matrixGroup.selectAll('*').remove();
        
        // Filter SBOMs by visibility
        const visibleSboms = sboms.filter(sbom => 
            !options.visibleSboms || options.visibleSboms.includes(sbom.id)
        );
        
        if (visibleSboms.length === 0) {
            this.showEmptyMessage();
            return;
        }
        
        // Get common components across SBOMs
        const commonComponents = this.getCommonComponents(visibleSboms);
        
        if (commonComponents.length === 0) {
            this.showNoCommonComponentsMessage();
            return;
        }
        
        Debug.info(`Found ${commonComponents.length} common components`);
        
        // Adjust cell size based on the number of components and SBOMs
        this.adjustCellSize(visibleSboms.length, commonComponents.length);
        
        // Create scales
        const x = d3.scaleBand()
            .domain(visibleSboms.map(sbom => sbom.id))
            .range([0, visibleSboms.length * this.cellSize]);
        
        const y = d3.scaleBand()
            .domain(commonComponents.map(comp => comp.key))
            .range([0, commonComponents.length * this.cellSize]);
        
        // Add grid background
        this.matrixGroup.append('rect')
            .attr('width', visibleSboms.length * this.cellSize)
            .attr('height', commonComponents.length * this.cellSize)
            .attr('fill', '#f8f9fa')
            .attr('rx', 4)
            .attr('ry', 4);
        
        // Draw SBOM column headers
        this.matrixGroup.selectAll('.sbom-label')
            .data(visibleSboms)
            .enter()
            .append('text')
            .attr('class', 'sbom-label')
            .attr('x', d => x(d.id) + this.cellSize / 2)
            .attr('y', -15)
            .attr('text-anchor', 'start')
            .attr('transform', d => `rotate(-45, ${x(d.id) + this.cellSize / 2}, -15)`)
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .text(d => Formatter.truncate(d.fileName, 25));
        
        // Add color blocks for SBOM headers
        this.matrixGroup.selectAll('.sbom-color')
            .data(visibleSboms)
            .enter()
            .append('rect')
            .attr('class', 'sbom-color')
            .attr('x', d => x(d.id))
            .attr('y', -80)
            .attr('width', this.cellSize)
            .attr('height', 10)
            .attr('fill', d => d.color)
            .attr('rx', 2)
            .attr('ry', 2);
        
        // Draw component row labels
        this.matrixGroup.selectAll('.component-label')
            .data(commonComponents)
            .enter()
            .append('text')
            .attr('class', 'component-label')
            .attr('x', -10)
            .attr('y', d => y(d.key) + this.cellSize / 2)
            .attr('text-anchor', 'end')
            .attr('dominant-baseline', 'middle')
            .style('font-size', '11px')
            .style('font-weight', '500')
            .text(d => Formatter.truncate(d.name, 25));
        
        // Create matrix data
        const matrixData = [];
        
        visibleSboms.forEach(sbom => {
            commonComponents.forEach(component => {
                const isPresent = component.sbomIds.includes(sbom.id);
                
                matrixData.push({
                    sbomId: sbom.id,
                    componentKey: component.key,
                    componentName: component.name,
                    sbomName: sbom.fileName,
                    present: isPresent,
                    color: isPresent ? sbom.color : '#f5f5f5',
                    component: isPresent ? 
                        component.occurrences.find(o => o.sbomId === sbom.id)?.component : null
                });
            });
        });
        
        // Draw matrix cell backgrounds
        this.matrixGroup.selectAll('.matrix-cell-bg')
            .data(matrixData)
            .enter()
            .append('rect')
            .attr('class', 'matrix-cell-bg')
            .attr('x', d => x(d.sbomId))
            .attr('y', d => y(d.componentKey))
            .attr('width', this.cellSize)
            .attr('height', this.cellSize)
            .attr('fill', 'white')
            .attr('stroke', '#e9ecef')
            .attr('stroke-width', 1);
        
        // Draw cells for present components
        const presentCells = this.matrixGroup.selectAll('.matrix-cell')
            .data(matrixData.filter(d => d.present))
            .enter();
        
        // Add circles for present cells
        presentCells.append('circle')
            .attr('class', 'matrix-cell')
            .attr('cx', d => x(d.sbomId) + this.cellSize / 2)
            .attr('cy', d => y(d.componentKey) + this.cellSize / 2)
            .attr('r', this.cellSize / 2 - 4)
            .attr('fill', d => d.color)
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .attr('cursor', 'pointer')
            .on('mouseover', (event, d) => this.handleCellMouseOver(event, d))
            .on('mouseout', () => this.hideTooltip())
            .on('click', (event, d) => this.handleCellClick(event, d));
        
        // Add highlight for common rows
        if (options.highlightCommon) {
            this.matrixGroup.selectAll('.matrix-row-highlight')
                .data(commonComponents)
                .enter()
                .append('rect')
                .attr('class', 'matrix-row-highlight')
                .attr('x', -5)
                .attr('y', d => y(d.key))
                .attr('width', visibleSboms.length * this.cellSize + 10)
                .attr('height', this.cellSize)
                .attr('fill', 'none')
                .attr('stroke', Config.visualization.highlighting.color)
                .attr('stroke-width', 1)
                .attr('stroke-dasharray', '3,3')
                .attr('rx', 4)
                .attr('ry', 4)
                .attr('opacity', 0.6);
        }
        
        // Add a title to the matrix
        this.matrixGroup.append('text')
            .attr('x', (visibleSboms.length * this.cellSize) / 2)
            .attr('y', -90)
            .attr('text-anchor', 'middle')
            .style('font-size', '18px')
            .style('font-weight', 'bold')
            .text('Common Components Matrix');
        
        // Add a subtitle with counts
        this.matrixGroup.append('text')
            .attr('x', (visibleSboms.length * this.cellSize) / 2)
            .attr('y', -65)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .text(`${commonComponents.length} common components across ${visibleSboms.length} SBOMs`);
    }
    
    /**
     * Adjust cell size based on available space and component count
     * @param {number} sbomCount - Number of SBOMs
     * @param {number} componentCount - Number of components
     */
    adjustCellSize(sbomCount, componentCount) {
        const availableWidth = this.width - this.margin.left - this.margin.right;
        const availableHeight = this.height - this.margin.top - this.margin.bottom;
        
        this.cellSize = Math.min(
            Math.floor(availableWidth / sbomCount),
            Math.floor(availableHeight / componentCount),
            36 // Maximum cell size
        );
        
        // Ensure minimum cell size
        this.cellSize = Math.max(this.cellSize, 18);
        
        Debug.info(`Adjusted cell size to ${this.cellSize}px`);
    }
    
    /**
     * Extract common components from SBOMs
     * @param {Array} sboms - SBOM objects
     * @returns {Array} - Common components
     */
    getCommonComponents(sboms) {
        const commonComponents = [];
        const commonComponentsMap = SBOMStore.findCommonComponents();
        
        for (const [key, common] of commonComponentsMap.entries()) {
            // Filter to only include visible SBOMs
            const relevantSbomIds = common.sbomIds.filter(sbomId => 
                sboms.some(sbom => sbom.id === sbomId)
            );
            
            if (relevantSbomIds.length > 1) {
                // Get a representative name for the component
                const firstOccurrence = common.occurrences[0];
                let name = 'Unknown Component';
                
                if (firstOccurrence && firstOccurrence.component) {
                    if (firstOccurrence.component.name) {
                        name = firstOccurrence.component.name;
                    } else if (firstOccurrence.component.fileName && firstOccurrence.component.fileName.length > 0) {
                        name = firstOccurrence.component.fileName[0];
                    }
                }
                
                commonComponents.push({
                    key,
                    name,
                    sbomIds: relevantSbomIds,
                    occurrences: common.occurrences
                });
            }
        }
        
        return commonComponents;
    }
    
    /**
     * Handle cell click to show component details
     * @param {Event} event - Click event
     * @param {Object} d - Cell data
     */
    handleCellClick(event, d) {
        if (!d.present || !d.component) return;
        
        // Find the component info
        const componentInfo = {
            component: d.component,
            sbomId: d.sbomId,
            type: 'software'
        };
        
        // Add visual feedback for click
        d3.select(event.currentTarget)
            .transition()
            .duration(100)
            .attr('r', this.cellSize / 2 - 2)
            .transition()
            .duration(100)
            .attr('r', this.cellSize / 2 - 4);
        
        // Dispatch component selected event
        const customEvent = new CustomEvent('node-selected', { 
            detail: componentInfo
        });
        document.dispatchEvent(customEvent);
    }
    
    /**
     * Handle cell mouseover to show tooltip
     * @param {Event} event - Mouse event
     * @param {Object} d - Cell data
     */
    handleCellMouseOver(event, d) {
        if (!d.present) return;
        
        // Show tooltip
        let content = `<strong>${d.componentName}</strong><br>`;
        content += `SBOM: ${d.sbomName}<br>`;
        
        if (d.component) {
            if (d.component.version) content += `Version: ${d.component.version}<br>`;
            if (d.component.size) content += `Size: ${Formatter.fileSize(d.component.size)}<br>`;
            
            // Add file info
            if (d.component.fileName && d.component.fileName.length > 0) {
                const fileNames = d.component.fileName.join(', ');
                if (fileNames.length < 40) {
                    content += `Files: ${fileNames}<br>`;
                } else {
                    content += `Files: ${d.component.fileName.length} files<br>`;
                }
            }
        }
        
        content += `<span class="common-indicator">Common Dependency</span><br>`;
        content += `<em>Click for details</em>`;
        
        this.showTooltip(event, content);
    }
    
    /**
     * Show message when no SBOMs are visible
     */
    showEmptyMessage() {
        this.matrixGroup.append('rect')
            .attr('width', this.width - this.margin.left - this.margin.right)
            .attr('height', 100)
            .attr('x', 0)
            .attr('y', (this.height - this.margin.top - this.margin.bottom) / 2 - 50)
            .attr('fill', '#f8f9fa')
            .attr('rx', 8)
            .attr('ry', 8);
        
        this.matrixGroup.append('text')
            .attr('x', (this.width - this.margin.left - this.margin.right) / 2)
            .attr('y', (this.height - this.margin.top - this.margin.bottom) / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('font-weight', '500')
            .text('No SBOMs selected. Please select at least one SBOM to visualize.');
    }
    
    /**
     * Show message when no common components are found
     */
    showNoCommonComponentsMessage() {
        const width = this.width - this.margin.left - this.margin.right;
        const height = this.height - this.margin.top - this.margin.bottom;
        
        this.matrixGroup.append('rect')
            .attr('width', width)
            .attr('height', 100)
            .attr('x', 0)
            .attr('y', height / 2 - 50)
            .attr('fill', '#f8f9fa')
            .attr('rx', 8)
            .attr('ry', 8);
        
        this.matrixGroup.append('text')
            .attr('x', width / 2)
            .attr('y', height / 2 - 10)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('font-weight', '500')
            .text('No common components found across the selected SBOMs.');
        
        this.matrixGroup.append('text')
            .attr('x', width / 2)
            .attr('y', height / 2 + 15)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('fill', '#666')
            .text('Try selecting more SBOMs or switch to the Graph view for full visualization.');
    }
}

// Export the MatrixVisualization class
window.MatrixVisualization = MatrixVisualization;
