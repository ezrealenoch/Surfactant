/**
 * Graph visualization for SBOM Visualizer
 */
class GraphVisualization extends BaseVisualization {
    constructor(elementId) {
        super(elementId);
        
        this.svg = null;
        this.simulation = null;
        this.zoom = null;
        this.nodes = [];
        this.links = [];
        this.rawNodes = []; // Original nodes before processing
        this.rawLinks = []; // Original links before processing
        this.selectedNodeId = null;
        this.expandedClusters = new Set(); // Track expanded clusters
        
        // Performance indicator
        this.indicator = null;
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
        
        // Create a group for the graph that can be zoomed and panned
        const g = this.svg.append('g')
            .attr('class', 'graph-container');
        
        // Add zoom behavior
        this.zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });
        
        this.svg.call(this.zoom);
        
        // Create arrow marker definitions for the links
        this.svg.append('defs').append('marker')
            .attr('id', 'arrowhead')
            .attr('viewBox', '-0 -5 10 10')
            .attr('refX', 25)
            .attr('refY', 0)
            .attr('orient', 'auto')
            .attr('markerWidth', 8)
            .attr('markerHeight', 8)
            .attr('xoverflow', 'visible')
            .append('svg:path')
            .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
            .attr('fill', '#999')
            .style('stroke', 'none');
        
        // Create the link and node groups
        this.linkGroup = g.append('g').attr('class', 'links');
        this.nodeGroup = g.append('g').attr('class', 'nodes');
        
        // Create performance indicator
        this.createPerformanceIndicator();
    }
    
    /**
     * Render the graph visualization
     * @param {Array} sboms - Array of SBOMs to visualize
     * @param {Object} options - Rendering options
     */
    render(sboms, options = {}) {
        if (!this.svg) this.initialize();
        
        Debug.info(`Rendering graph visualization for ${sboms.length} SBOMs`);
        
        // Clear current visualization
        this.linkGroup.selectAll('*').remove();
        this.nodeGroup.selectAll('*').remove();
        
        // Reset nodes and links
        this.nodes = [];
        this.links = [];
        this.expandedClusters.clear();
        
        // Process visible SBOMs
        sboms.forEach(sbom => {
            // Skip if not visible
            if (options.visibleSboms && !options.visibleSboms.includes(sbom.id)) {
                return;
            }
            
            // Filter nodes by type
            const filteredNodes = sbom.graphData.nodes.filter(node => {
                return !options.visibleTypes || options.visibleTypes.includes(node.type);
            });
            
            // Add nodes with SBOM color
            filteredNodes.forEach(node => {
                node.color = sbom.color;
            });
            
            this.nodes.push(...filteredNodes);
            
            // Add links between visible nodes
            const nodeIds = new Set(filteredNodes.map(n => n.id));
            const filteredLinks = sbom.graphData.links.filter(link => {
                const sourceId = link.source.id || link.source;
                const targetId = link.target.id || link.target;
                return nodeIds.has(sourceId) && nodeIds.has(targetId);
            });
            
            this.links.push(...filteredLinks);
        });
        
        // Mark common nodes
        this.markCommonNodes();
        
        // Store raw data before any processing
        this.rawNodes = [...this.nodes];
        this.rawLinks = [...this.links];
        
        // Apply clustering if enabled and needed
        if (options.clusteringEnabled && this.nodes.length > Config.visualization.clustering.threshold) {
            Debug.info(`Applying clustering to ${this.nodes.length} nodes`);
            const clustered = VizClusters.applyClustering(this.nodes, this.links);
            this.nodes = clustered.nodes;
            this.links = clustered.links;
            this.clusters = clustered.clusters;
        }
        
        // Create force simulation
        this.simulation = ForceLayout.createSimulation(
            this.nodes, 
            this.links, 
            { width: this.width, height: this.height }
        );
        
        // Apply initial layout if enabled
        if (options.useRadialLayout && this.nodes.length > 10) {
            ForceLayout.createRadialLayout(this.nodes, { width: this.width, height: this.height });
        } else if (this.nodes.length <= 10) {
            ForceLayout.createSimpleLayout(this.nodes, { width: this.width, height: this.height });
        }
        
        // Draw links
        const link = this.linkGroup.selectAll('.link')
            .data(this.links)
            .enter()
            .append('line')
            .attr('class', d => `link ${d.isCommonLink ? 'common-link' : ''} ${d.isDependencyLink ? 'dependency-link' : ''}`)
            .attr('stroke', d => {
                if (d.isCommonLink) return '#3498db'; // Changed to blue
                if (d.isDependencyLink) return '#f1c40f'; // Changed to yellow
                const sbom = SBOMStore.getSBOMById(d.sbomId);
                return sbom ? sbom.color : '#999';
            })
            .attr('stroke-width', d => {
                if (d.isCommonLink) return 3;
                if (d.isDependencyLink) return 2;
                return d.count ? Math.min(5, 1 + Math.log(d.count)) : 2;
            })
            .attr('stroke-dasharray', d => d.isCommonLink ? '5,5' : 'none')
            .attr('marker-end', 'url(#arrowhead)');
        
        // Draw nodes
        const node = this.nodeGroup.selectAll('.node')
            .data(this.nodes)
            .enter()
            .append('g')
            .attr('class', 'node')
            .call(ForceLayout.createDragBehavior(this.simulation))
            .on('click', (event, d) => this.handleNodeClick(event, d))
            .on('mouseover', (event, d) => this.handleNodeMouseOver(event, d))
            .on('mouseout', (event, d) => this.handleNodeMouseOut(event, d));
        
        // Add common dependency highlight circles
        if (options.highlightCommon) {
            // Highlight common nodes with circles
            node.filter(d => d.isCommon)
                .append('circle')
                .attr('class', 'common-node-indicator')
                .attr('r', d => VizStyles.getNodeRadius(d) * 1.6)
                .attr('fill', 'none')
                .attr('stroke', Config.visualization.highlighting.color)
                .attr('stroke-width', Config.visualization.highlighting.strokeWidth)
                .attr('stroke-dasharray', Config.visualization.highlighting.dashArray);
        }
        
        // Add node shapes
        node.each(function(d) {
            const nodeGroup = d3.select(this);
            
            // Create different shapes based on node type
            if (d.isCluster) {
                // Cluster nodes are circles
                nodeGroup.append('circle')
                    .attr('class', 'node-shape cluster-node')
                    .attr('r', Math.min(25, 10 + Math.sqrt(d.nodeCount) * 2))
                    .attr('fill', d.color)
                    .attr('fill-opacity', 0.8)
                    .attr('stroke', '#000')
                    .attr('stroke-width', 1.5);
                
                // Add count badge
                nodeGroup.append('text')
                    .attr('class', 'count-badge')
                    .attr('text-anchor', 'middle')
                    .attr('dominant-baseline', 'central')
                    .attr('font-size', '10px')
                    .attr('fill', '#fff')
                    .attr('font-weight', 'bold')
                    .text(d.nodeCount);
            } else {
                // Regular nodes use symbols based on type
                nodeGroup.append('path')
                    .attr('class', 'node-shape')
                    .attr('d', d => {
                        const size = VizStyles.getNodeRadius(d) * 2;
                        const symbol = d3.symbol()
                            .type(VizStyles.getNodeSymbol(d))
                            .size(size * size);
                        return symbol();
                    })
                    .attr('fill', d => VizStyles.getNodeColor(d, d.id === this.selectedNodeId))
                    .attr('stroke', '#000')
                    .attr('stroke-width', d.isCommon ? 2 : 1.5);
            }
            
            // Add text labels for nodes
            const labelSize = d.isCluster ? 10 : 8;
            const labelOffset = d.isCluster ? 30 : VizStyles.getNodeRadius(d) + 12;
            
            nodeGroup.append('text')
                .attr('class', 'node-label')
                .attr('dy', '.35em')
                .attr('y', labelOffset)
                .attr('text-anchor', 'middle')
                .attr('font-size', `${labelSize}px`)
                .attr('fill', '#333')
                .attr('stroke', '#fff')
                .attr('stroke-width', 0.5)
                .attr('paint-order', 'stroke')
                .text(Formatter.truncate(d.name, 15));
        });
        
        // Update the simulation
        this.simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
            
            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });
        
        // Center the view
        this.centerView();
        
        // Update performance indicator
        this.updatePerformanceIndicator();
    }
    
    /**
     * Mark common nodes across SBOMs
     */
    markCommonNodes() {
        // Find common components
        const commonComponents = SBOMStore.findCommonComponents();
        
        // Mark common nodes
        this.nodes.forEach(node => {
            // Check if this node is in the common components
            for (const [key, data] of commonComponents.entries()) {
                const isInCommon = data.occurrences.some(o => o.uuid === node.id);
                if (isInCommon) {
                    node.isCommon = true;
                    node.commonKey = key;
                    node.relatedSboms = data.sbomIds;
                    break;
                }
            }
        });
        
        // Create connections between common nodes
        this.createCommonNodeConnections(commonComponents);
    }
    
    /**
     * Create connections between common nodes across SBOMs
     * @param {Map} commonComponents - Map of common components
     */
    createCommonNodeConnections(commonComponents) {
        for (const [key, data] of commonComponents.entries()) {
            // Group occurrences by SBOM
            const nodesBySbom = {};
            data.occurrences.forEach(o => {
                if (!nodesBySbom[o.sbomId]) {
                    nodesBySbom[o.sbomId] = [];
                }
                nodesBySbom[o.sbomId].push(o);
            });
            
            // Create links between common nodes in different SBOMs
            const sbomIds = Object.keys(nodesBySbom);
            for (let i = 0; i < sbomIds.length - 1; i++) {
                const sourceNodes = nodesBySbom[sbomIds[i]];
                
                for (let j = i + 1; j < sbomIds.length; j++) {
                    const targetNodes = nodesBySbom[sbomIds[j]];
                    
                    // Add links between each pair of common nodes
                    sourceNodes.forEach(sourceNode => {
                        targetNodes.forEach(targetNode => {
                            // Create a relationship link
                            this.links.push({
                                source: sourceNode.uuid,
                                target: targetNode.uuid,
                                type: 'common_component',
                                isCommonLink: true,
                                sbomId: 'common', // Mark as common link
                                commonKey: key
                            });
                        });
                    });
                }
            }
        }
        
        // Also find relationships based on dependencies between components
        this.createDependencyConnections();
    }
    
    /**
     * Create connections based on dependencies between components
     */
    createDependencyConnections() {
        // Build a map of components by filename
        const componentsByFileName = new Map();
        
        this.nodes.forEach(node => {
            if (node.type === 'software' && node.data && node.data.fileName) {
                // For each filename, add this component
                node.data.fileName.forEach(filename => {
                    if (!componentsByFileName.has(filename)) {
                        componentsByFileName.set(filename, []);
                    }
                    componentsByFileName.get(filename).push(node);
                });
            }
        });
        
        // For each software component with ELF dependencies
        this.nodes.forEach(node => {
            if (node.type === 'software' && 
                node.data && 
                node.data.elfMetadata && 
                node.data.elfMetadata.dependencies &&
                node.data.elfMetadata.dependencies.length > 0) {
                
                // For each dependency
                node.data.elfMetadata.dependencies.forEach(depName => {
                    // Find components matching this dependency
                    if (componentsByFileName.has(depName)) {
                        const dependencyComponents = componentsByFileName.get(depName);
                        
                        // Create links to dependency components
                        dependencyComponents.forEach(depNode => {
                            // Don't create self-links
                            if (node.id !== depNode.id) {
                                this.links.push({
                                    source: node.id,
                                    target: depNode.id,
                                    type: 'depends_on',
                                    isDependencyLink: true,
                                    sbomId: node.sbomId
                                });
                            }
                        });
                    }
                });
            }
        });
    }
    
    /**
     * Center the view to fit all nodes
     */
    centerView() {
        if (this.nodes.length === 0) return;
        
        const padding = 100;
        
        // Calculate bounds
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        
        this.nodes.forEach(node => {
            if (node.x < minX) minX = node.x;
            if (node.x > maxX) maxX = node.x;
            if (node.y < minY) minY = node.y;
            if (node.y > maxY) maxY = node.y;
        });
        
        // Add padding
        minX -= padding;
        maxX += padding;
        minY -= padding;
        maxY += padding;
        
        // Calculate scale and translate
        const width = Math.max(maxX - minX, 200);
        const height = Math.max(maxY - minY, 200);
        const scale = Math.min(this.width / width, this.height / height, 2.0);
        const translateX = (this.width - scale * width) / 2 - scale * minX;
        const translateY = (this.height - scale * height) / 2 - scale * minY;
        
        // Apply transform
        this.svg.transition()
            .duration(Config.ui.animation.duration)
            .call(this.zoom.transform, d3.zoomIdentity
                .translate(translateX, translateY)
                .scale(scale));
        
        Debug.info(`Centered view with scale: ${scale.toFixed(2)}`);
    }
    
    /**
     * Handle node click to display details or expand/collapse clusters
     * @param {Event} event - Click event
     * @param {Object} d - Node data
     */
    handleNodeClick(event, d) {
        event.stopPropagation();
        this.selectedNodeId = d.id;
        
        // Check if it's a cluster node
        if (d.isCluster) {
            // Toggle expand/collapse
            if (this.expandedClusters.has(d.id)) {
                this.collapseCluster(d);
            } else {
                this.expandCluster(d);
            }
            return;
        }
        
        // For regular nodes, trigger node selection event
        const detail = SBOMStore.getComponentByUuid(d.id);
        if (detail) {
            // Dispatch node selection event
            const event = new CustomEvent('node-selected', { 
                detail: detail 
            });
            document.dispatchEvent(event);
            
            // Update node visualization
            this.updateSelectedNode();
        }
    }
    
    /**
     * Handle mouse over node
     * @param {Event} event - Mouse event
     * @param {Object} d - Node data
     */
    handleNodeMouseOver(event, d) {
        // Create tooltip with node name
        const tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);
        
        tooltip.transition()
            .duration(200)
            .style('opacity', 0.9);
        
        tooltip.html(`<strong>${d.name}</strong>${d.isCluster ? ` (${d.nodeCount} nodes)` : ''}`)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
        
        // Save tooltip reference
        d3.select(event.currentTarget).datum().tooltip = tooltip;
        
        // Highlight this node
        d3.select(event.currentTarget).classed('highlighted', true);
        
        // Highlight connected nodes and links
        this.highlightConnectedElements(d);
    }
    
    /**
     * Handle mouse out from node
     * @param {Event} event - Mouse event
     * @param {Object} d - Node data
     */
    handleNodeMouseOut(event, d) {
        // Remove tooltip
        const tooltip = d3.select(event.currentTarget).datum().tooltip;
        if (tooltip) {
            tooltip.transition()
                .duration(200)
                .style('opacity', 0)
                .remove();
        }
        
        // Remove highlight from this node
        d3.select(event.currentTarget).classed('highlighted', false);
        
        // Remove highlight from connected nodes and links
        this.removeConnectedHighlights();
    }
    
    /**
     * Highlight nodes and links connected to the selected node
     * @param {Object} node - The source node
     */
    highlightConnectedElements(node) {
        // Get all nodes connected by links
        const connectedNodeIds = new Set();
        
        // Find links connected to this node
        this.linkGroup.selectAll('.link').each(function(linkData) {
            const sourceId = typeof linkData.source === 'object' ? linkData.source.id : linkData.source;
            const targetId = typeof linkData.target === 'object' ? linkData.target.id : linkData.target;
            
            if (sourceId === node.id || targetId === node.id) {
                // Add the connected node ID
                connectedNodeIds.add(sourceId === node.id ? targetId : sourceId);
                
                // Highlight the link
                d3.select(this).classed('connected-link', true);
            }
        });
        
        // Highlight connected nodes
        this.nodeGroup.selectAll('.node').each(function(nodeData) {
            if (connectedNodeIds.has(nodeData.id)) {
                d3.select(this).classed('connected-node', true);
            }
        });
        
        // Also highlight nodes that are common with this node if it's a common node
        if (node.isCommon && node.commonKey) {
            this.nodeGroup.selectAll('.node').each(function(nodeData) {
                if (nodeData.isCommon && nodeData.commonKey === node.commonKey && nodeData.id !== node.id) {
                    d3.select(this).classed('connected-node', true);
                }
            });
        }
    }
    
    /**
     * Remove highlights from all connected elements
     */
    removeConnectedHighlights() {
        this.nodeGroup.selectAll('.node').classed('connected-node', false);
        this.linkGroup.selectAll('.link').classed('connected-link', false);
    }
    
    /**
     * Expand a cluster to show its nodes
     * @param {Object} cluster - Cluster to expand
     */
    expandCluster(cluster) {
        // Add to expanded clusters set
        this.expandedClusters.add(cluster.id);
        
        // Get expanded nodes and links
        const expansion = VizClusters.expandCluster(
            cluster,
            this.rawNodes,
            this.rawLinks
        );
        
        // Add expanded nodes and links
        const newNodes = expansion.nodes;
        const newLinks = expansion.links;
        
        if (newNodes.length === 0) return;
        
        // Update data
        this.nodes = this.nodes.concat(newNodes);
        this.links = this.links.concat(newLinks);
        
        // Update the visualization
        this.updateVisualization();
        
        Debug.info(`Expanded cluster: ${cluster.name} (${newNodes.length} nodes)`);
        
        // Dispatch cluster expanded event
        const event = new CustomEvent('cluster-expanded', {
            detail: { 
                cluster: cluster,
                expandedNodes: newNodes.length
            }
        });
        document.dispatchEvent(event);
    }
    
    /**
     * Collapse an expanded cluster
     * @param {Object} cluster - Cluster to collapse
     */
    collapseCluster(cluster) {
        // Remove from expanded clusters set
        this.expandedClusters.delete(cluster.id);
        
        // Remove nodes that belong to this cluster
        this.nodes = this.nodes.filter(node => 
            !cluster.originalNodeIds.includes(node.id)
        );
        
        // Remove links connected to those nodes
        this.links = this.links.filter(link => {
            const sourceId = link.source.id || link.source;
            const targetId = link.target.id || link.target;
            return !cluster.originalNodeIds.includes(sourceId) && 
                   !cluster.originalNodeIds.includes(targetId);
        });
        
        // Keep the cluster node itself
        this.nodes.push(cluster);
        
        // Update the visualization
        this.updateVisualization();
        
        Debug.info(`Collapsed cluster: ${cluster.name}`);
        
        // Dispatch cluster collapsed event
        const event = new CustomEvent('cluster-collapsed', {
            detail: { cluster: cluster }
        });
        document.dispatchEvent(event);
    }
    
    /**
     * Update visualization after expanding/collapsing clusters
     */
    updateVisualization() {
        // Create new links
        const link = this.linkGroup.selectAll('.link')
            .data(this.links, d => {
                const sourceId = d.source.id || d.source;
                const targetId = d.target.id || d.target;
                return `${sourceId}-${targetId}-${d.type || 'default'}`;
            });
        
        // Remove old links
        link.exit().remove();
        
        // Add new links
        link.enter()
            .append('line')
            .attr('class', d => `link ${d.isCommonLink ? 'common-link' : ''} ${d.isDependencyLink ? 'dependency-link' : ''}`)
            .attr('stroke', d => {
                if (d.isCommonLink) return '#3498db'; // Changed to blue
                if (d.isDependencyLink) return '#f1c40f'; // Changed to yellow
                const sbom = SBOMStore.getSBOMById(d.sbomId);
                return sbom ? sbom.color : '#999';
            })
            .attr('stroke-width', d => {
                if (d.isCommonLink) return 3;
                if (d.isDependencyLink) return 2;
                return d.count ? Math.min(5, 1 + Math.log(d.count)) : 2;
            })
            .attr('stroke-dasharray', d => d.isCommonLink ? '5,5' : 'none')
            .attr('marker-end', 'url(#arrowhead)');
        
        // Create new nodes
        const node = this.nodeGroup.selectAll('.node')
            .data(this.nodes, d => d.id);
        
        // Remove old nodes
        node.exit().remove();
        
        // Add new nodes
        const newNodes = node.enter()
            .append('g')
            .attr('class', 'node')
            .call(ForceLayout.createDragBehavior(this.simulation))
            .on('click', (event, d) => this.handleNodeClick(event, d))
            .on('mouseover', (event, d) => this.handleNodeMouseOver(event, d))
            .on('mouseout', (event, d) => this.handleNodeMouseOut(event, d));
        
        // Add common indicators for new nodes
        newNodes.filter(d => d.isCommon)
            .append('circle')
            .attr('class', 'common-node-indicator')
            .attr('r', d => VizStyles.getNodeRadius(d) * 1.6)
            .attr('fill', 'none')
            .attr('stroke', Config.visualization.highlighting.color)
            .attr('stroke-width', Config.visualization.highlighting.strokeWidth)
            .attr('stroke-dasharray', Config.visualization.highlighting.dashArray);
        
        // Add shapes for new nodes
        newNodes.each(function(d) {
            const nodeGroup = d3.select(this);
            
            if (d.isCluster) {
                nodeGroup.append('circle')
                    .attr('class', 'node-shape cluster-node')
                    .attr('r', Math.min(25, 10 + Math.sqrt(d.nodeCount) * 2))
                    .attr('fill', d.color)
                    .attr('fill-opacity', 0.8)
                    .attr('stroke', '#000')
                    .attr('stroke-width', 1.5);
                    
                nodeGroup.append('text')
                    .attr('class', 'count-badge')
                    .attr('text-anchor', 'middle')
                    .attr('dominant-baseline', 'central')
                    .attr('font-size', '10px')
                    .attr('fill', '#fff')
                    .attr('font-weight', 'bold')
                    .text(d.nodeCount);
            } else {
                nodeGroup.append('path')
                    .attr('class', 'node-shape')
                    .attr('d', () => {
                        const size = VizStyles.getNodeRadius(d) * 2;
                        const symbol = d3.symbol()
                            .type(VizStyles.getNodeSymbol(d))
                            .size(size * size);
                        return symbol();
                    })
                    .attr('fill', d.color)
                    .attr('stroke', '#000')
                    .attr('stroke-width', d.isCommon ? 2 : 1.5);
            }
            
            // Add text label
            const labelSize = d.isCluster ? 10 : 8;
            const labelOffset = d.isCluster ? 30 : VizStyles.getNodeRadius(d) + 12;
            
            nodeGroup.append('text')
                .attr('class', 'node-label')
                .attr('dy', '.35em')
                .attr('y', labelOffset)
                .attr('text-anchor', 'middle')
                .attr('font-size', `${labelSize}px`)
                .attr('fill', '#333')
                .attr('stroke', '#fff')
                .attr('stroke-width', 0.5)
                .attr('paint-order', 'stroke')
                .text(Formatter.truncate(d.name, 15));
        });
        
        // Update the simulation
        this.simulation.nodes(this.nodes);
        this.simulation.force('link').links(this.links);
        this.simulation.alpha(1).restart();
        
        // Update the performance indicator
        this.updatePerformanceIndicator();
    }
    
    /**
     * Update selected node highlighting
     */
    updateSelectedNode() {
        this.nodeGroup.selectAll('.node-shape')
            .attr('fill', d => VizStyles.getNodeColor(d, d.id === this.selectedNodeId));
        
        // Add a pulse effect to the selected node
        if (this.selectedNodeId) {
            const selectedNode = this.nodeGroup.selectAll('.node')
                .filter(d => d.id === this.selectedNodeId)
                .select('.node-shape');
                
            selectedNode
                .transition()
                .duration(300)
                .attr('stroke', '#e91e63')
                .attr('stroke-width', 3)
                .transition()
                .duration(300)
                .attr('stroke', '#000')
                .attr('stroke-width', d => d.isCommon ? 2 : 1.5);
        }
    }
    
    /**
     * Create performance indicator
     */
    createPerformanceIndicator() {
        this.indicator = document.createElement('div');
        this.indicator.className = 'performance-indicator';
        this.container.appendChild(this.indicator);
    }
    
    /**
     * Update performance indicator with current stats
     */
    updatePerformanceIndicator() {
        if (!this.indicator) return;
        
        const totalNodeCount = this.rawNodes.length;
        const visibleNodeCount = this.nodes.length;
        const compressionRatio = totalNodeCount > 0 ? 
            (visibleNodeCount / totalNodeCount * 100).toFixed(1) : 100;
        
        this.indicator.innerHTML = `
            <div class="indicator-item">
                <span class="label">Total Components:</span>
                <span class="value">${totalNodeCount}</span>
            </div>
            <div class="indicator-item">
                <span class="label">Visible:</span>
                <span class="value">${visibleNodeCount} (${compressionRatio}%)</span>
            </div>
        `;
    }
}

// Export the GraphVisualization class
window.GraphVisualization = GraphVisualization;
