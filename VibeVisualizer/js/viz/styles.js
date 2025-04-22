/**
 * Visualization styling utilities for SBOM Visualizer
 */
const VizStyles = {
    /**
     * Get node size based on type
     * @param {Object} node - Node data
     * @returns {number} - Node radius
     */
    getNodeRadius(node) {
        const nodeSize = Config.visualization.nodeSize;
        
        if (node.type === 'software' && node.subtype) {
            return nodeSize[node.subtype] || nodeSize.other;
        }
        return nodeSize[node.type] || nodeSize.other;
    },
    
    /**
     * Get node symbol type based on node type
     * @param {Object} node - Node data
     * @returns {Function} - D3 symbol type
     */
    getNodeSymbol(node) {
        const symbols = {
            system: d3.symbolDiamond,
            hardware: d3.symbolSquare,
            software: d3.symbolCircle,
            executable: d3.symbolTriangle,
            library: d3.symbolCross,
            other: d3.symbolCircle
        };
        
        if (node.type === 'software' && node.subtype) {
            return symbols[node.subtype] || symbols.other;
        }
        return symbols[node.type] || symbols.other;
    },
    
    /**
     * Get node color
     * @param {Object} node - Node data
     * @param {boolean} isSelected - Whether the node is selected
     * @returns {string} - Node color
     */
    getNodeColor(node, isSelected) {
        if (isSelected) {
            return '#e91e63'; // Highlight selected node
        }
        
        return node.color || '#999';
    },
    
    /**
     * Get link styling
     * @param {Object} link - Link data
     * @param {boolean} isSelected - Whether the link is selected
     * @returns {Object} - Link style properties
     */
    getLinkStyle(link, isSelected) {
        const color = link.color || '#999';
        
        return {
            stroke: color,
            strokeWidth: isSelected ? 3 : (link.count ? Math.min(5, 1 + Math.log(link.count)) : 2),
            strokeOpacity: 0.6
        };
    },
    
    /**
     * Create CSS for SVG export
     * @returns {string} - CSS styles
     */
    getSvgStyles() {
        return `
            .link { 
                stroke: #999; 
                stroke-opacity: 0.6; 
                stroke-width: 2px; 
            }
            .node path { 
                stroke: #000; 
                stroke-width: 1.5px; 
            }
            .node-label { 
                font-family: Arial, sans-serif; 
                font-size: 10px;
                fill: #333;
            }
            .common-node-indicator { 
                fill: none; 
                stroke: ${Config.visualization.highlighting.color}; 
                stroke-width: ${Config.visualization.highlighting.strokeWidth}px;
                stroke-dasharray: ${Config.visualization.highlighting.dashArray};
            }
            .matrix-cell { 
                stroke: #fff; 
                stroke-width: 2px; 
            }
        `;
    },
    
    /**
     * Create tooltip content for a node
     * @param {Object} node - Node data
     * @returns {string} - HTML content
     */
    createNodeTooltip(node) {
        let content = `<strong>${node.name}</strong><br>`;
        content += `Type: ${node.type}${node.subtype ? ' (' + node.subtype + ')' : ''}<br>`;
        
        if (node.isCommon) {
            content += '<strong class="common-indicator">Common dependency!</strong><br>';
        }
        
        if (node.isCluster) {
            content += `Contains ${node.nodeCount} components<br>`;
            content += `<em>Click to expand</em>`;
        }
        
        const sbom = SBOMStore.getSBOMById(node.sbomId);
        if (sbom) {
            content += `SBOM: ${sbom.fileName}<br>`;
        }
        
        return content;
    }
};

// Export the VizStyles object
window.VizStyles = VizStyles;
