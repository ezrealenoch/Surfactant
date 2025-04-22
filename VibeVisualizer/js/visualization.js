    /**
     * Optimize the force simulation based on node count
     * @param {d3.forceSimulation} simulation - D3 force simulation
     * @param {number} nodeCount - Number of nodes in the graph
     */
    optimizeForceSimulation(simulation) {
        // Get the current node count
        const nodeCount = this.nodes.length;
        
        // For very small graphs (less than 20 nodes)
        if (nodeCount < 20) {
            simulation.alphaDecay(0.02)
                .velocityDecay(0.3)
                .force('charge', d3.forceManyBody().strength(-800).distanceMax(800))
                .force('link', d3.forceLink().id(d => d.id).distance(80))
                .force('collision', d3.forceCollide().radius(d => this.getNodeRadius(d) * 2).strength(0.5));
        }
        // For small graphs (20-50 nodes)
        else if (nodeCount < 50) {
            simulation.alphaDecay(0.025)
                .velocityDecay(0.4)
                .force('charge', d3.forceManyBody().strength(-600).distanceMax(600))
                .force('link', d3.forceLink().id(d => d.id).distance(100))
                .force('collision', d3.forceCollide().radius(d => this.getNodeRadius(d) * 1.8).strength(0.5));
        }
        // For medium graphs
        else if (nodeCount < 100) {
            simulation.alphaDecay(0.03)
                .velocityDecay(0.5)
                .force('charge', d3.forceManyBody().strength(-500).distanceMax(500))
                .force('link', d3.forceLink().id(d => d.id).distance(100))
                .force('collision', d3.forceCollide().radius(d => this.getNodeRadius(d) * 1.5).strength(0.5));
        }
        // For medium-large graphs
        else if (nodeCount < 200) {
            simulation.alphaDecay(0.04)
                .velocityDecay(0.6)
                .force('charge', d3.forceManyBody().strength(-400).distanceMax(400))
                .force('link', d3.forceLink().id(d => d.id).distance(100))
                .force('collision', d3.forceCollide().radius(d => this.getNodeRadius(d) * 1.3).strength(0.6));
        }
        // For large graphs
        else {
            simulation.alphaDecay(0.05) // Faster decay
                .velocityDecay(0.7)    // More damping
                .force('charge', d3.forceManyBody().strength(-300).distanceMax(300))
                .force('link', d3.forceLink().id(d => d.id).distance(100))
                .force('collision', d3.forceCollide().radius(d => this.getNodeRadius(d) * 1.2).strength(0.7));
        }
        
        return simulation;
    }    /**
     * Expand a cluster node to show its contents
     * @param {Object} cluster - Cluster node to expand
     */
    expandCluster(cluster) {
        // Add to expanded clusters set
        this.expandedClusters.add(cluster.id);
        
        // Get the expanded nodes and links
        const expansion = sbomClusterer.expandCluster(
            cluster,
            this.rawNodes,
            this.rawLinks
        );
        
        // Add the expanded nodes and links to the visualization
        const newNodes = expansion.nodes;
        const newLinks = expansion.links;
        
        if (newNodes.length === 0) return;
        
        // Update data
        this.nodes = this.nodes.concat(newNodes);
        this.links = this.links.concat(newLinks);
        
        // Update the visualization
        this.updateVisualization();
        
        // Display info about the expanded cluster
        const detailContent = document.getElementById('detail-content');
        detailContent.innerHTML = `
            <h3>Cluster Expanded: ${cluster.name}</h3>
            <p>Showing ${newNodes.length} components and ${newLinks.length} connections.</p>
            <p>Click on any component to see its details, or click on the cluster again to collapse it.</p>
        `;
    }
    
    /**
     * Collapse an expanded cluster
     * @param {Object} cluster - Cluster node to collapse
     */
    collapseCluster(cluster) {
        // Remove from expanded clusters set
        this.expandedClusters.delete(cluster.id);
        
        // Remove all nodes that belong to this cluster
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
    }
    
    /**
     * Update the visualization with current nodes and links
     */
    updateVisualization() {
        // Update the node visualization
        const node = this.nodeGroup.selectAll('.node')
            .data(this.nodes, d => d.id);
            
        // Handle removing nodes
        node.exit().remove();
        
        // Handle adding nodes
        const enterNode = node.enter()
            .append('g')
            .attr('class', 'node')
            .call(this.drag(this.simulation))
            .on('click', this.handleNodeClick.bind(this))
            .on('mouseover', this.handleNodeMouseOver.bind(this))
            .on('mouseout', this.handleNodeMouseOut.bind(this));
            
        // Add shapes for the new nodes
        enterNode.each(function(d) {
            const nodeGroup = d3.select(this);
            
            // If it's a cluster node
            if (d.isCluster) {
                nodeGroup.append('circle')
                    .attr('class', 'node-shape cluster-node')
                    .attr('r', Math.min(25, 10 + Math.sqrt(d.nodeCount) * 2))
                    .attr('fill', d => d.color)
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
                // Regular node
                nodeGroup.append('path')
                    .attr('class', 'node-shape')
                    .attr('d', d => {
                        const size = sbomVisualizer.getNodeRadius(d) * 2;
                        const symbol = d3.symbol()
                            .type(sbomVisualizer.getNodeSymbol(d))
                            .size(size * size);
                        return symbol();
                    })
                    .attr('fill', d => d.color)
                    .attr('stroke', '#000')
                    .attr('stroke-width', d.isCommon ? 2 : 1.5);
            }
        });
        
        // Update links
        const link = this.linkGroup.selectAll('.link')
            .data(this.links, d => {
                // Create a unique ID for each link
                const sourceId = d.source.id || d.source;
                const targetId = d.target.id || d.target;
                return `${sourceId}-${targetId}-${d.type}`;
            });
            
        // Remove old links
        link.exit().remove();
        
        // Add new links
        link.enter()
            .append('line')
            .attr('class', 'link')
            .attr('stroke', d => {
                const sbom = sbomParser.getSBOMById(d.sbomId);
                return sbom ? sbom.color : '#999';
            })
            .attr('stroke-width', d => d.count ? Math.min(5, 1 + Math.log(d.count)) : 2)
            .attr('marker-end', 'url(#arrowhead)');
            
        // Update the simulation
        this.simulation.nodes(this.nodes);
        this.simulation.force('link').links(this.links);
        this.simulation.alpha(1).restart();
    }
    
    /**
     * Update the performance indicator in the UI
     */
    updatePerformanceIndicator() {
        // Check if the indicator exists, create if not
        let indicator = document.getElementById('performance-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'performance-indicator';
            indicator.className = 'performance-indicator';
            document.getElementById('graph-view').appendChild(indicator);
        }
        
        // Update the indicator text
        const totalNodeCount = this.rawNodes.length;
        const visibleNodeCount = this.nodes.length;
        const compressionRatio = totalNodeCount > 0 ? (visibleNodeCount / totalNodeCount * 100).toFixed(1) : 100;
        
        indicator.innerHTML = `
            <div class="indicator-item">
                <span class="label">Total Components:</span>
                <span class="value">${totalNodeCount}</span>
            </div>
            <div class="indicator-item">
                <span class="label">Visible:</span>
                <span class="value">${visibleNodeCount} (${compressionRatio}%)</span>
            </div>
        `;
        
        // Add controls if clustering is active
        if (this.clusteringEnabled || this.densityReductionEnabled) {
            const controlsDiv = document.createElement('div');
            controlsDiv.className = 'indicator-controls';
            
            if (this.clusteringEnabled) {
                const clusteringToggle = document.createElement('button');
                clusteringToggle.className = 'indicator-button';
                clusteringToggle.textContent = 'Disable Clustering';
                clusteringToggle.onclick = () => {
                    this.clusteringEnabled = !this.clusteringEnabled;
                    this.render(sbomParser.sboms, {
                        visibleSboms: appState.visibleSboms,
                        visibleTypes: appState.visibleTypes,
                        highlightCommon: appState.highlightCommon
                    });
                };
                controlsDiv.appendChild(clusteringToggle);
            }
            
            indicator.appendChild(controlsDiv);
        }
    }/**
 * SBOM Visualization Module
 * Handles rendering the graph visualization using D3.js
 */
class SBOMVisualizer {
    constructor() {
        this.svg = null;
        this.simulation = null;
        this.tooltip = null;
        this.width = 0;
        this.height = 0;
        this.zoom = null;
        this.nodes = [];
        this.links = [];
        this.rawNodes = []; // Store original nodes before clustering
        this.rawLinks = []; // Store original links before clustering
        this.selectedNodeId = null;
        
        // Visualization mode flags
        this.clusteringEnabled = true; // Enable clustering for large datasets
        this.densityReductionEnabled = true; // Enable density reduction for very large datasets
        this.useRadialLayout = true; // Use radial layout for initial positioning
        this.expandedClusters = new Set(); // Track which clusters are expanded
        
        // Node size based on type
        this.nodeSize = {
            system: 25,    // Increased from 20
            hardware: 20,  // Increased from 15
            software: 16,  // Increased from 12
            executable: 14, // Increased from 10
            library: 12,    // Increased from 8
            other: 10       // Increased from 6
        };
        
        // Node shape based on type
        this.nodeShape = {
            system: d3.symbolDiamond,
            hardware: d3.symbolSquare,
            software: d3.symbolCircle,
            executable: d3.symbolTriangle,
            library: d3.symbolCross,
            other: d3.symbolCircle
        };
    }
    
    /**
     * Initialize the visualization
     */
    initialize() {
        // Create the SVG container
        const container = document.getElementById('graph-view');
        this.width = container.clientWidth;
        this.height = container.clientHeight;
        
        // Create tooltip
        this.tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);
        
        // Create SVG
        this.svg = d3.select(container).append('svg')
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
            .attr('refX', 25)  // Increased from 20 to adjust for larger nodes
            .attr('refY', 0)
            .attr('orient', 'auto')
            .attr('markerWidth', 8)   // Increased from 6
            .attr('markerHeight', 8)  // Increased from 6
            .attr('xoverflow', 'visible')
            .append('svg:path')
            .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
            .attr('fill', '#999')
            .style('stroke', 'none');
        
        // Create force simulation with optimized settings for small graphs
        this.simulation = d3.forceSimulation()
            .force('link', d3.forceLink().id(d => d.id).distance(80))
            .force('charge', d3.forceManyBody().strength(-600))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collision', d3.forceCollide().radius(d => this.getNodeRadius(d) * 2));
        
        // Create the link and node groups
        this.linkGroup = g.append('g').attr('class', 'links');
        this.nodeGroup = g.append('g').attr('class', 'nodes');
        
        // Handle window resize
        window.addEventListener('resize', this.handleResize.bind(this));
    }
    
    /**
     * Render the visualization with the provided data
     * @param {Array} sboms - Array of SBOM objects from the parser
     * @param {Object} options - Visualization options
     */
    render(sboms, options = {}) {
        if (!this.svg) this.initialize();
        
        // Merge all node and link data from visible SBOMs
        this.nodes = [];
        this.links = [];
        
        sboms.forEach(sbom => {
            if (options.visibleSboms && !options.visibleSboms.includes(sbom.id)) {
                return; // Skip if not visible
            }
            
            // Filter nodes by type if specified
            const filteredNodes = sbom.graphData.nodes.filter(node => {
                if (options.visibleTypes) {
                    return options.visibleTypes.includes(node.type);
                }
                return true;
            });
            
            // Add nodes with SBOM color
            filteredNodes.forEach(node => {
                node.color = sbom.color;
            });
            
            this.nodes.push(...filteredNodes);
            
            // Add links that connect visible nodes
            const nodeIds = new Set(filteredNodes.map(n => n.id));
            const filteredLinks = sbom.graphData.links.filter(link => 
                nodeIds.has(link.source.id || link.source) && 
                nodeIds.has(link.target.id || link.target)
            );
            
            this.links.push(...filteredLinks);
        });
        
        // Find common components
        const commonComponents = sbomParser.findCommonComponents();
        const commonUuids = new Set();
        
        commonComponents.forEach(common => {
            common.occurrences.forEach(occurrence => {
                commonUuids.add(occurrence.uuid);
            });
        });
        
        // Mark common nodes
        this.nodes.forEach(node => {
            node.isCommon = commonUuids.has(node.id);
        });
        
        // Update the legend
        this.updateLegend(sboms, commonUuids.size > 0, options.highlightCommon);
        
        // Draw the links
        const link = this.linkGroup.selectAll('.link')
            .data(this.links, d => `${d.source}-${d.target}-${d.type}`)
            .join(
                enter => enter.append('line')
                    .attr('class', 'link')
                    .attr('stroke', d => {
                        const sbom = sbomParser.getSBOMById(d.sbomId);
                        return sbom ? sbom.color : '#999';
                    })
                    .attr('stroke-width', 2)  // Increased from 1
                    .attr('marker-end', 'url(#arrowhead)'),
                update => update
                    .attr('stroke', d => {
                        const sbom = sbomParser.getSBOMById(d.sbomId);
                        return sbom ? sbom.color : '#999';
                    })
                    .attr('stroke-width', 2),  // Increased from 1
                exit => exit.remove()
            );
        
        // Store the raw data regardless of clustering
        this.rawNodes = this.nodes.slice();
        this.rawLinks = this.links.slice();
        
        // Apply clustering for large datasets
        if (this.clusteringEnabled && this.nodes.length > sbomClusterer.clusterThreshold) {
            console.log(`Clustering ${this.nodes.length} nodes...`);
            const clustered = sbomClusterer.applyClustering(this.nodes, this.links, {
                threshold: sbomClusterer.clusterThreshold
            });
            
            this.nodes = clustered.nodes;
            this.links = clustered.links;
            this.clusters = clustered.clusters;
            console.log(`Reduced to ${this.nodes.length} nodes after clustering`);
        }
        // Apply density reduction for very large datasets
        else if (this.densityReductionEnabled && this.nodes.length > sbomClusterer.maxNodeLimit) {
            console.log(`Applying density reduction on ${this.nodes.length} nodes...`);
            const reduced = sbomClusterer.applyDensityReduction(this.nodes, this.links, {
                maxNodes: sbomClusterer.maxNodeLimit
            });
            
            this.nodes = reduced.nodes;
            this.links = reduced.links;
            console.log(`Reduced to ${this.nodes.length} nodes after density reduction`);
        }
        else {
            console.log(`Displaying ${this.nodes.length} nodes normally (no clustering needed)`);
        }
        
        // Add performance indicators
        this.updatePerformanceIndicator();
        
        // Draw the nodes
        const node = this.nodeGroup.selectAll('.node')
            .data(this.nodes, d => d.id)
            .join(
                enter => {
                    const nodeGroup = enter.append('g')
                        .attr('class', 'node')
                        .call(this.drag(this.simulation))
                        .on('click', this.handleNodeClick.bind(this))
                        .on('mouseover', this.handleNodeMouseOver.bind(this))
                        .on('mouseout', this.handleNodeMouseOut.bind(this));
                    
                    // Add common dependency highlight circle for common nodes
                    // Only add if highlighting is enabled
                    if (options.highlightCommon) {
                        nodeGroup.filter(d => d.isCommon)
                            .append('circle')
                            .attr('class', 'common-node-indicator')
                            .attr('r', d => this.getNodeRadius(d) * 1.6)  // Make the circle 60% larger than the node
                            .attr('fill', 'none')
                            .attr('stroke', '#FF5722')  // Orange highlight color
                            .attr('stroke-width', 3)
                            .attr('stroke-dasharray', '5,3');  // Dashed stroke
                    }
                    
                    // Add the node shape
                    // If it's a cluster node, create a different shape
                    if (d.isCluster) {
                        nodeGroup.append('circle')
                            .attr('class', 'node-shape cluster-node')
                            .attr('r', d => Math.min(25, 10 + Math.sqrt(d.nodeCount) * 2))
                            .attr('fill-opacity', 0.8);
                    } else {
                        nodeGroup.append('path')
                            .attr('class', 'node-shape')
                            .attr('d', d => {
                                const size = this.getNodeRadius(d) * 2;
                                const symbol = d3.symbol()
                                    .type(this.getNodeSymbol(d))
                                    .size(size * size);
                                return symbol();
                            })
                    }
                        .attr('fill', d => this.getNodeColor(d, options.highlightCommon))
                        .attr('stroke', '#000')  // Changed from #fff to #000
                        .attr('stroke-width', d => d.isCommon ? 2 : 1.5);  // Increased stroke width
                    
                    // Add text label for larger nodes only
                    nodeGroup.filter(d => this.getNodeRadius(d) > 10)
                        .append('text')
                        .attr('class', 'node-label')
                        .attr('dy', '.35em')
                        .attr('y', d => this.getNodeRadius(d) + 12)  // Increased from 8
                        .attr('text-anchor', 'middle')
                        .text(d => this.truncateLabel(d.name))
                        .attr('font-size', '10px')  // Increased from 8px
                        .attr('fill', '#333')  // Changed from #666 to #333
                        .attr('stroke', '#fff')  // Add white outline to text
                        .attr('stroke-width', 0.5)
                        .attr('paint-order', 'stroke');
                    
                    return nodeGroup;
                },
                update => {
                    // For cluster nodes, update the node count badge
                    update.each(function(d) {
                        const nodeGroup = d3.select(this);
                        
                        // If it's a cluster, update the size based on node count
                        if (d.isCluster) {
                            nodeGroup.select('.node-shape')
                                .attr('r', Math.min(25, 10 + Math.sqrt(d.nodeCount) * 2));
                                
                            // Update or add the count badge
                            let badge = nodeGroup.select('.count-badge');
                            if (badge.empty()) {
                                badge = nodeGroup.append('text')
                                    .attr('class', 'count-badge')
                                    .attr('text-anchor', 'middle')
                                    .attr('dominant-baseline', 'central')
                                    .attr('font-size', '10px')
                                    .attr('fill', '#fff')
                                    .attr('font-weight', 'bold');
                            }
                            badge.text(d.nodeCount);
                        }
                    
                    // Update common dependency highlight circle

                        const nodeGroup = d3.select(this);
                        
                        // Check if common indicator exists
                        const hasIndicator = nodeGroup.select('.common-node-indicator').size() > 0;
                        
                        if (d.isCommon && !hasIndicator && options.highlightCommon) {
                            // Add circle if it's common but doesn't have indicator and highlighting is enabled
                            nodeGroup.insert('circle', ':first-child')
                                .attr('class', 'common-node-indicator')
                                .attr('r', d => sbomVisualizer.getNodeRadius(d) * 1.6)
                                .attr('fill', 'none')
                                .attr('stroke', '#FF5722')
                                .attr('stroke-width', 3)
                                .attr('stroke-dasharray', '5,3');
                        } else if ((!d.isCommon || !options.highlightCommon) && hasIndicator) {
                            // Remove circle if it's not common or highlighting is disabled but has indicator
                            nodeGroup.select('.common-node-indicator').remove();
                        } else if (d.isCommon && hasIndicator && options.highlightCommon) {
                            // Update the circle size if needed
                            nodeGroup.select('.common-node-indicator')
                                .attr('r', d => sbomVisualizer.getNodeRadius(d) * 1.6);
                        }
                    });
                    
                    // Update node colors and sizes
                    update.select('.node-shape')
                        .attr('d', d => {
                            const size = this.getNodeRadius(d) * 2;
                            const symbol = d3.symbol()
                                .type(this.getNodeSymbol(d))
                                .size(size * size);
                            return symbol();
                        })
                        .attr('fill', d => this.getNodeColor(d, options.highlightCommon))
                        .attr('stroke', '#000')
                        .attr('stroke-width', d => d.isCommon ? 2 : 1.5);
                    
                    // Update text label
                    update.select('.node-label')
                        .text(d => this.truncateLabel(d.name));
                    
                    return update;
                },
                exit => exit.remove()
            );
        
        // Optimize the force simulation based on node count
        this.optimizeForceSimulation(this.simulation);
        
        // Use radial layout for initial positioning if enabled
        if (this.useRadialLayout) {
            this.nodes = sbomClusterer.createRadialLayout(this.nodes, {
                width: this.width,
                height: this.height
            });
        }
        
        // Update the simulation
        this.simulation.nodes(this.nodes)
            .on('tick', () => {
                // Apply link rendering based on cluster state
                link
                    .attr('x1', d => d.source.x)
                    .attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x)
                    .attr('y2', d => d.target.y)
                    .attr('stroke-width', d => d.count ? Math.min(5, 1 + Math.log(d.count)) : 2); // Adjust link width for cluster links
                
                node.attr('transform', d => `translate(${d.x},${d.y})`);
            });
        
        this.simulation.force('link').links(this.links);
        this.simulation.alpha(1).restart();
        
        // Center the view
        this.centerView();
    }
    
    /**
     * Get the radius for a node based on its type
     * @param {Object} node - Node data
     * @returns {number} Node radius
     */
    getNodeRadius(node) {
        if (node.type === 'software' && node.subtype) {
            return this.nodeSize[node.subtype] || this.nodeSize.other;
        }
        return this.nodeSize[node.type] || this.nodeSize.other;
    }
    
    /**
     * Get the symbol for a node based on its type
     * @param {Object} node - Node data
     * @returns {Function} D3 symbol generator
     */
    getNodeSymbol(node) {
        if (node.type === 'software' && node.subtype) {
            return this.nodeShape[node.subtype] || this.nodeShape.other;
        }
        return this.nodeShape[node.type] || this.nodeShape.other;
    }
    
    /**
     * Get the color for a node
     * @param {Object} node - Node data
     * @param {boolean} highlightCommon - Whether to highlight common nodes
     * @returns {string} Node color
     */
    getNodeColor(node, highlightCommon = true) {
        if (node.id === this.selectedNodeId) {
            return '#e91e63'; // Highlight selected node
        }
        
        // Now we use circles for common nodes instead of changing their color
        return node.color;
    }
    
    /**
     * Truncate node label to fit
     * @param {string} label - Node label
     * @returns {string} Truncated label
     */
    truncateLabel(label) {
        if (!label) return '';
        return label.length > 15 ? label.substring(0, 12) + '...' : label;
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
            // Handle expanding/collapsing clusters
            if (this.expandedClusters.has(d.id)) {
                // Collapse the cluster
                this.collapseCluster(d);
            } else {
                // Expand the cluster
                this.expandCluster(d);
            }
            return;
        }
        
        // For regular nodes, show component details
        const componentInfo = sbomParser.getComponentByUuid(d.id);
        if (componentInfo) {
            displayComponentDetails(componentInfo);
        }
        
        // Update node colors to highlight selection
        this.nodeGroup.selectAll('.node-shape')
            .attr('fill', node => this.getNodeColor(node, true));
        
        // Add a pulsing effect to the selected node
        this.nodeGroup.selectAll('.node-shape')
            .filter(node => node.id === d.id)
            .transition()
            .duration(300)
            .attr('stroke', '#e91e63')
            .attr('stroke-width', 3)
            .transition()
            .duration(300)
            .attr('stroke', '#000')
            .attr('stroke-width', d.isCommon ? 2 : 1.5);
    }
    
    /**
     * Handle node mouseover to show tooltip
     * @param {Event} event - Mouseover event
     * @param {Object} d - Node data
     */
    handleNodeMouseOver(event, d) {
        // Enlarge the node slightly on hover
        d3.select(event.currentTarget).select('.node-shape')
            .transition()
            .duration(200)
            .attr('d', () => {
                const size = this.getNodeRadius(d) * 2.2;  // 10% larger
                const symbol = d3.symbol()
                    .type(this.getNodeSymbol(d))
                    .size(size * size);
                return symbol();
            });
        
        // Show tooltip
        this.tooltip.transition()
            .duration(200)
            .style('opacity', .9);
        
        let tooltipContent = `<strong>${d.name}</strong><br>`;
        tooltipContent += `Type: ${d.type}${d.subtype ? ' (' + d.subtype + ')' : ''}<br>`;
        
        if (d.isCommon) {
            tooltipContent += '<strong class="common-indicator">Common dependency!</strong><br>';
        }
        
        const sbom = sbomParser.getSBOMById(d.sbomId);
        if (sbom) {
            tooltipContent += `SBOM: ${sbom.fileName}<br>`;
        }
        
        this.tooltip.html(tooltipContent)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
    }
    
    /**
     * Handle node mouseout to hide tooltip
     * @param {Event} event - Mouseout event
     * @param {Object} d - Node data
     */
    handleNodeMouseOut(event, d) {
        // Restore original size
        d3.select(event.currentTarget).select('.node-shape')
            .transition()
            .duration(200)
            .attr('d', () => {
                const size = this.getNodeRadius(d) * 2;
                const symbol = d3.symbol()
                    .type(this.getNodeSymbol(d))
                    .size(size * size);
                return symbol();
            });
        
        // Hide tooltip
        this.tooltip.transition()
            .duration(500)
            .style('opacity', 0);
    }
    
    /**
     * Update the color legend
     * @param {Array} sboms - Array of visible SBOM objects
     * @param {boolean} hasCommon - Whether there are common components
     * @param {boolean} highlightCommon - Whether common highlighting is enabled
     */
    updateLegend(sboms, hasCommon, highlightCommon) {
        const legendContent = document.getElementById('legend-content');
        legendContent.innerHTML = '';
        
        // Add SBOM colors
        sboms.forEach(sbom => {
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            
            const colorBox = document.createElement('div');
            colorBox.className = 'legend-color';
            colorBox.style.backgroundColor = sbom.color;
            
            const label = document.createElement('span');
            label.textContent = sbom.fileName;
            
            legendItem.appendChild(colorBox);
            legendItem.appendChild(label);
            legendContent.appendChild(legendItem);
        });
        
        // Add common dependency indicator if applicable and highlighting is enabled
        if (hasCommon && highlightCommon) {
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            
            // Create SVG for the common dependency indicator
            const svgContainer = document.createElement('div');
            svgContainer.style.width = '24px';
            svgContainer.style.height = '24px';
            svgContainer.style.marginRight = '8px';
            
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '24');
            svg.setAttribute('height', '24');
            
            // Create circle with dashed border
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', '12');
            circle.setAttribute('cy', '12');
            circle.setAttribute('r', '10');
            circle.setAttribute('fill', 'none');
            circle.setAttribute('stroke', '#FF5722');
            circle.setAttribute('stroke-width', '2');
            circle.setAttribute('stroke-dasharray', '4,2');
            
            svg.appendChild(circle);
            svgContainer.appendChild(svg);
            
            const label = document.createElement('span');
            label.textContent = 'Common Dependency';
            label.style.fontWeight = 'bold';
            
            legendItem.appendChild(svgContainer);
            legendItem.appendChild(label);
            legendContent.appendChild(legendItem);
        }
        
        // Add node type shapes
        const nodeTypes = [
            { type: 'system', label: 'System' },
            { type: 'hardware', label: 'Hardware' },
            { type: 'software', label: 'Software' },
            { type: 'executable', label: 'Executable' },
            { type: 'library', label: 'Library' }
        ];
        
        const shapeSection = document.createElement('div');
        shapeSection.className = 'legend-section';
        shapeSection.innerHTML = '<h4 style="margin-top: 10px;">Node Shapes</h4>';
        legendContent.appendChild(shapeSection);
        
        nodeTypes.forEach(typeInfo => {
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            
            // Create SVG for the node shape
            const svgContainer = document.createElement('div');
            svgContainer.style.width = '24px';
            svgContainer.style.height = '24px';
            svgContainer.style.marginRight = '8px';
            
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '24');
            svg.setAttribute('height', '24');
            
            const symbol = d3.symbol()
                .type(this.nodeShape[typeInfo.type] || this.nodeShape.other)
                .size(150);  // Increased from 100
            
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', symbol());
            path.setAttribute('transform', 'translate(12, 12)');
            path.setAttribute('fill', '#666');
            path.setAttribute('stroke', '#000');
            path.setAttribute('stroke-width', '1');
            
            svg.appendChild(path);
            svgContainer.appendChild(svg);
            
            const label = document.createElement('span');
            label.textContent = typeInfo.label;
            
            legendItem.appendChild(svgContainer);
            legendItem.appendChild(label);
            shapeSection.appendChild(legendItem);
        });
    }
    
    /**
     * Center the view to fit all nodes
     */
    centerView() {
        if (!this.nodes.length) return;
        
        const padding = 100; // Increased padding for small graphs
        
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
        const width = Math.max(maxX - minX, 200); // Ensure minimum width
        const height = Math.max(maxY - minY, 200); // Ensure minimum height
        const scale = Math.min(this.width / width, this.height / height, 2.0); // Limit max zoom
        const translateX = (this.width - scale * width) / 2 - scale * minX;
        const translateY = (this.height - scale * height) / 2 - scale * minY;
        
        // Apply transform
        this.svg.transition()
            .duration(750)
            .call(this.zoom.transform, d3.zoomIdentity
                .translate(translateX, translateY)
                .scale(scale));
        
        console.log(`Centered view with scale: ${scale}`);
    }
    
    /**
     * Handle window resize
     */
    handleResize() {
        const container = document.getElementById('graph-view');
        this.width = container.clientWidth;
        this.height = container.clientHeight;
        
        this.svg
            .attr('width', this.width)
            .attr('height', this.height);
        
        this.simulation.force('center', d3.forceCenter(this.width / 2, this.height / 2));
        this.simulation.alpha(0.3).restart();
    }
    
    /**
     * D3 drag behavior for nodes
     * @param {Object} simulation - D3 force simulation
     * @returns {Object} D3 drag behavior
     */
    drag(simulation) {
        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }
        
        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }
        
        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }
        
        return d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended);
    }
}

/**
 * Display component details in the detail panel
 * @param {Object} componentInfo - Component information
 */
function displayComponentDetails(componentInfo) {
    const detailContent = document.getElementById('detail-content');
    const { component, sbomId, type } = componentInfo;
    const sbom = sbomParser.getSBOMById(sbomId);
    
    let html = `<h3>${component.name}</h3>`;
    html += `<div class="detail-section">`;
    html += `<p><strong>Type:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)}</p>`;
    html += `<p><strong>UUID:</strong> ${component.uuid}</p>`;
    html += `<p><strong>SBOM:</strong> ${sbom ? sbom.fileName : 'Unknown'}</p>`;
    
    // Type-specific details
    if (type === 'software') {
        html += `<p><strong>File Names:</strong> ${component.fileName.join(', ') || 'None'}</p>`;
        if (component.version) html += `<p><strong>Version:</strong> ${component.version}</p>`;
        if (component.size) html += `<p><strong>Size:</strong> ${formatFileSize(component.size)}</p>`;
        
        // Show file hashes
        if (component.sha256 || component.sha1 || component.md5) {
            html += `<div class="hash-section">`;
            html += `<p><strong>Hashes:</strong></p>`;
            html += `<ul style="list-style: none; padding-left: 20px;">`;
            if (component.sha256) html += `<li><strong>SHA256:</strong> ${component.sha256}</li>`;
            if (component.sha1) html += `<li><strong>SHA1:</strong> ${component.sha1}</li>`;
            if (component.md5) html += `<li><strong>MD5:</strong> ${component.md5}</li>`;
            html += `</ul>`;
            html += `</div>`;
        }
        
        // ELF metadata if available
        if (component.elfMetadata) {
            const elf = component.elfMetadata;
            html += `<div class="elf-section">`;
            html += `<p><strong>ELF Metadata:</strong></p>`;
            
            // Create table for ELF metadata
            html += `<table class="detail-table">`;
            html += `<tr><th>Type</th><td>${elf.isExecutable ? 'Executable' : (elf.isLibrary ? 'Library' : 'Other')}</td></tr>`;
            
            if (elf.architecture) {
                html += `<tr><th>Architecture</th><td>${elf.architecture}</td></tr>`;
            }
            
            // Show dependencies
            if (elf.dependencies && elf.dependencies.length > 0) {
                html += `<tr>
                    <th>Dependencies</th>
                    <td>${elf.dependencies.join('<br>')}</td>
                </tr>`;
            }
            
            // Show soname for libraries
            if (elf.soname && elf.soname.length > 0) {
                html += `<tr><th>SONAME</th><td>${elf.soname.join(', ')}</td></tr>`;
            }
            
            // Show interpreter for executables
            if (elf.interpreter && elf.interpreter.length > 0) {
                html += `<tr><th>Interpreter</th><td>${elf.interpreter.join(', ')}</td></tr>`;
            }
            
            // Show comments
            if (elf.comments && elf.comments.length > 0) {
                html += `<tr>
                    <th>Comments</th>
                    <td>${elf.comments.join('<br>')}</td>
                </tr>`;
            }
            
            html += `</table>`;
            html += `</div>`;
        }
    } else if (type === 'system') {
        if (component.vendor) html += `<p><strong>Vendor:</strong> ${component.vendor}</p>`;
        if (component.captureStart) {
            const date = new Date(component.captureStart * 1000).toLocaleString();
            html += `<p><strong>Capture Start:</strong> ${date}</p>`;
        }
        if (component.captureEnd) {
            const date = new Date(component.captureEnd * 1000).toLocaleString();
            html += `<p><strong>Capture End:</strong> ${date}</p>`;
        }
    } else if (type === 'hardware') {
        if (component.vendor) html += `<p><strong>Vendor:</strong> ${component.vendor.join(', ') || 'Unknown'}</p>`;
    }
    
    html += `</div>`;
    
    // Check if this is a common component
    const commonComponents = sbomParser.findCommonComponents();
    let isCommon = false;
    
    for (const [, common] of commonComponents) {
        for (const occurrence of common.occurrences) {
            if (occurrence.uuid === component.uuid) {
                isCommon = true;
                
                // Show all occurrences
                html += `<div class="common-section">`;
                html += `<h4>Common Dependency Found in:</h4>`;
                html += `<ul>`;
                
                common.occurrences.forEach(o => {
                    const occSbom = sbomParser.getSBOMById(o.sbomId);
                    if (occSbom) {
                        html += `<li>${occSbom.fileName}</li>`;
                    }
                });
                
                html += `</ul>`;
                html += `</div>`;
                break;
            }
        }
        if (isCommon) break;
    }
    
    detailContent.innerHTML = html;
}

/**
 * Format file size in human-readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Create a global instance
const sbomVisualizer = new SBOMVisualizer();