/**
 * Base visualization class for SBOM Visualizer
 */
class BaseVisualization {
    constructor(elementId) {
        this.container = document.getElementById(elementId);
        this.width = 0;
        this.height = 0;
        this.tooltip = null;
    }
    
    /**
     * Initialize the visualization
     */
    initialize() {
        if (!this.container) {
            Debug.error(`Container element not found: ${this.container}`);
            return;
        }
        
        // Update dimensions
        this.updateDimensions();
        
        // Create tooltip
        this.tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);
        
        // Setup resize handler
        window.addEventListener('resize', this.handleResize.bind(this));
        
        Debug.info(`Initialized ${this.constructor.name}`);
    }
    
    /**
     * Update container dimensions
     */
    updateDimensions() {
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
    }
    
    /**
     * Handle window resize
     */
    handleResize() {
        this.updateDimensions();
        this.render();
    }
    
    /**
     * Render the visualization
     * This should be implemented by subclasses
     */
    render() {
        throw new Error('Render method must be implemented by subclass');
    }
    
    /**
     * Show tooltip
     * @param {Event} event - Mouse event
     * @param {string} content - Tooltip content
     */
    showTooltip(event, content) {
        this.tooltip.transition()
            .duration(200)
            .style('opacity', 0.9);
        
        this.tooltip.html(content)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
    }
    
    /**
     * Hide tooltip
     */
    hideTooltip() {
        this.tooltip.transition()
            .duration(500)
            .style('opacity', 0);
    }
    
    /**
     * Clear the visualization
     */
    clear() {
        // Remove all child elements
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }
    }
    
    /**
     * Destroy the visualization
     */
    destroy() {
        // Remove event listeners
        window.removeEventListener('resize', this.handleResize);
        
        // Remove tooltip
        if (this.tooltip) {
            this.tooltip.remove();
            this.tooltip = null;
        }
        
        // Clear the container
        this.clear();
    }
}

// Export BaseVisualization
window.BaseVisualization = BaseVisualization;
