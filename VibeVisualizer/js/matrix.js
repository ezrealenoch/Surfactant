/**
 * SBOM Matrix Visualization Module
 * Renders a matrix/table view showing component relationships across SBOMs
 */
class SBOMMatrixView {
    constructor() {
        this.container = document.getElementById('matrix-view');
        this.tooltip = null;
        this.cellSize = 24;  // Increased from 20
        this.margin = { top: 120, right: 20, bottom: 20, left: 250 };  // Increased margins
    }
    
    /**
     * Initialize the matrix view
     */
    initialize() {
        // Clear any existing content
        this.container.innerHTML = '';
        
        // Create tooltip if it doesn't exist
        if (!this.tooltip) {
            this.tooltip = d3.select('body').append('div')
                .attr('class', 'tooltip')
                .style('opacity', 0);
        }
        
        // Compute dimensions
        this.width = this.container.clientWidth - this.margin.left - this.margin.right;
        this.height = this.container.clientHeight - this.margin.top - this.margin.bottom;
        
        // Create SVG container
        this.svg = d3.select(this.container).append('svg')
            .attr('width', this.container.clientWidth)
            .attr('height', this.container.clientHeight)
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
    }
    
    /**
     * Render the matrix view
     * @param {Array} sboms - Array of SBOM objects to visualize
     * @param {Object} options - Rendering options
     */
    render(sboms, options = {}) {
        // Store the highlighting preference
        const highlightCommon = options.highlightCommon === undefined ? true : options.highlightCommon;
        if (!this.svg) this.initialize();
        
        // Filter SBOMs by visibility
        const visibleSboms = sboms.filter(sbom => 
            !options.visibleSboms || options.visibleSboms.includes(sbom.id)
        );
        
        if (visibleSboms.length === 0) {
            this.showEmptyMessage();
            return;
        }
        
        // Get common components across all SBOMs
        const commonComponents = this.getCommonComponents(visibleSboms);
        if (commonComponents.length === 0) {
            this.showNoCommonComponentsMessage();
            return;
        }
        
        // Clear the container
        this.svg.selectAll('*').remove();
        
        // Adjust cell size based on number of components
        this.cellSize = Math.min(
            Math.floor(this.width / visibleSboms.length), 
            Math.floor(this.height / commonComponents.length),
            36  // Increased maximum size from 30
        );
        
        // Minimum cell size
        this.cellSize = Math.max(this.cellSize, 18);  // Increased from 15
        
        // Create scales
        const x = d3.scaleBand()
            .domain(visibleSboms.map(sbom => sbom.id))
            .range([0, visibleSboms.length * this.cellSize]);
        
        const y = d3.scaleBand()
            .domain(commonComponents.map(comp => comp.key))
            .range([0, commonComponents.length * this.cellSize]);
        
        // Add grid background
        this.svg.append('rect')
            .attr('width', visibleSboms.length * this.cellSize)
            .attr('height', commonComponents.length * this.cellSize)
            .attr('fill', '#f8f9fa')
            .attr('rx', 4)  // Rounded corners
            .attr('ry', 4);
        
        // Draw SBOM column headers (rotated)
        this.svg.selectAll('.sbom-label')
            .data(visibleSboms)
            .enter()
            .append('text')
            .attr('class', 'sbom-label')
            .attr('x', d => x(d.id) + this.cellSize / 2)
            .attr('y', -15)  // Moved further up
            .attr('text-anchor', 'start')
            .attr('transform', d => `rotate(-45, ${x(d.id) + this.cellSize / 2}, -15)`)
            .style('font-size', '12px')
            .style('font-weight', 'bold')  // Make headers bold
            .text(d => this.truncateLabel(d.fileName));
        
        // Color rectangles for SBOM headers
        this.svg.selectAll('.sbom-color')
            .data(visibleSboms)
            .enter()
            .append('rect')
            .attr('class', 'sbom-color')
            .attr('x', d => x(d.id))
            .attr('y', -80)  // Position above the rotated labels
            .attr('width', this.cellSize)
            .attr('height', 10)
            .attr('fill', d => d.color)
            .attr('rx', 2)  // Rounded corners
            .attr('ry', 2);
        
        // Draw component row labels
        this.svg.selectAll('.component-label')
            .data(commonComponents)
            .enter()
            .append('text')
            .attr('class', 'component-label')
            .attr('x', -10)
            .attr('y', d => y(d.key) + this.cellSize / 2)
            .attr('text-anchor', 'end')
            .attr('dominant-baseline', 'middle')
            .style('font-size', '11px')  // Slightly larger
            .style('font-weight', '500')  // Semi-bold
            .text(d => this.truncateLabel(d.name));
        
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
        
        // Draw matrix cell backgrounds (grid lines)
        this.svg.selectAll('.matrix-cell-bg')
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
        
        // Draw matrix cells for present components
        const presentCells = this.svg.selectAll('.matrix-cell')
            .data(matrixData.filter(d => d.present))
            .enter();
        
        // Add circles for present cells
        presentCells.append('circle')
            .attr('class', 'matrix-cell')
            .attr('cx', d => x(d.sbomId) + this.cellSize / 2)
            .attr('cy', d => y(d.componentKey) + this.cellSize / 2)
            .attr('r', this.cellSize / 2 - 4)  // Radius slightly smaller than cell
            .attr('fill', d => d.color)
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .on('mouseover', (event, d) => this.showTooltip(event, d))
            .on('mouseout', () => this.hideTooltip())
            .on('click', (event, d) => this.handleCellClick(event, d));
        
        // Add a highlight ring around all cells for common components, but only if highlighting is enabled
        if (highlightCommon) {
            this.svg.selectAll('.matrix-row-highlight')
                .data(commonComponents)
                .enter()
                .append('rect')
                .attr('class', 'matrix-row-highlight')
                .attr('x', -5)
                .attr('y', d => y(d.key))
                .attr('width', visibleSboms.length * this.cellSize + 10)
                .attr('height', this.cellSize)
                .attr('fill', 'none')
                .attr('stroke', '#FF5722')  // Orange highlight matching the graph view
                .attr('stroke-width', 1)
                .attr('stroke-dasharray', '3,3')
                .attr('rx', 4)
                .attr('ry', 4)
                .attr('opacity', 0.6);
        }
        
        // Add a title to the matrix
        this.svg.append('text')
            .attr('x', (visibleSboms.length * this.cellSize) / 2)
            .attr('y', -90)
            .attr('text-anchor', 'middle')
            .style('font-size', '18px')  // Larger
            .style('font-weight', 'bold')
            .text('Common Components Matrix');
        
        // Add a subtitle with counts
        this.svg.append('text')
            .attr('x', (visibleSboms.length * this.cellSize) / 2)
            .attr('y', -65)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')  // Larger
            .text(`${commonComponents.length} common components across ${visibleSboms.length} SBOMs`);
    }
    
    /**
     * Extract common components from a list of SBOMs
     * @param {Array} sboms - List of SBOM objects
     * @returns {Array} Common components
     */
    getCommonComponents(sboms) {
        const commonComponents = [];
        const commonComponentsMap = sbomParser.findCommonComponents();
        
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
        
        // Add a visual feedback for the click
        d3.select(event.currentTarget)
            .transition()
            .duration(100)
            .attr('r', this.cellSize / 2 - 2)  // Slightly smaller
            .transition()
            .duration(100)
            .attr('r', this.cellSize / 2 - 4);  // Back to original size
        
        // Display details
        displayComponentDetails(componentInfo);
    }
    
    /**
     * Show tooltip for a matrix cell
     * @param {Event} event - Mouse event
     * @param {Object} d - Cell data
     */
    showTooltip(event, d) {
        if (!d.present) return;
        
        this.tooltip.transition()
            .duration(200)
            .style('opacity', .9);
        
        let content = `<strong>${d.componentName}</strong><br>`;
        content += `SBOM: ${d.sbomName}<br>`;
        
        if (d.component) {
            if (d.component.version) content += `Version: ${d.component.version}<br>`;
            if (d.component.size) content += `Size: ${formatFileSize(d.component.size)}<br>`;
            
            // Add file info if available
            if (d.component.fileName && d.component.fileName.length > 0) {
                const fileNames = d.component.fileName.join(', ');
                if (fileNames.length < 40) {  // Only if not too long
                    content += `Files: ${fileNames}<br>`;
                } else {
                    content += `Files: ${d.component.fileName.length} files<br>`;
                }
            }
        }
        
        if (highlightCommon) {
            content += `<span class="common-indicator">Common Dependency</span><br>`;
        }
        content += `<em>Click for details</em>`;
        
        this.tooltip.html(content)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
    }
    
    /**
     * Hide the tooltip
     */
    hideTooltip() {
        this.tooltip.transition()
            .duration(500)
            .style('opacity', 0);
    }
    
    /**
     * Show message when no SBOMs are visible
     */
    showEmptyMessage() {
        this.svg.selectAll('*').remove();
        
        this.svg.append('rect')
            .attr('width', this.width)
            .attr('height', 100)
            .attr('x', 0)
            .attr('y', this.height / 2 - 50)
            .attr('fill', '#f8f9fa')
            .attr('rx', 8)
            .attr('ry', 8);
        
        this.svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', this.height / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('font-weight', '500')
            .text('No SBOMs selected. Please select at least one SBOM to visualize.');
    }
    
    /**
     * Show message when no common components are found
     */
    showNoCommonComponentsMessage() {
        this.svg.selectAll('*').remove();
        
        this.svg.append('rect')
            .attr('width', this.width)
            .attr('height', 100)
            .attr('x', 0)
            .attr('y', this.height / 2 - 50)
            .attr('fill', '#f8f9fa')
            .attr('rx', 8)
            .attr('ry', 8);
        
        this.svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', this.height / 2 - 10)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('font-weight', '500')
            .text('No common components found across the selected SBOMs.');
        
        this.svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', this.height / 2 + 15)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('fill', '#666')
            .text('Try selecting more SBOMs or switch to the Graph view for full visualization.');
    }
    
    /**
     * Truncate text to fit in limited space
     * @param {string} text - Original text
     * @returns {string} Truncated text
     */
    truncateLabel(text) {
        if (!text) return '';
        return text.length > 25 ? text.substring(0, 22) + '...' : text;
    }
}

// Create a global instance
const sbomMatrixView = new SBOMMatrixView();
