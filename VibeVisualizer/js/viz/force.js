/**
 * Force layout simulation for SBOM visualization
 */
const ForceLayout = {
    /**
     * Create a force simulation
     * @param {Array} nodes - Node data
     * @param {Array} links - Link data
     * @param {Object} dimensions - Container dimensions
     * @returns {Object} - D3 force simulation
     */
    createSimulation(nodes, links, dimensions) {
        const { width, height } = dimensions;
        
        // Create simulation
        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id))
            .force('charge', d3.forceManyBody())
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide());
        
        // Optimize based on node count
        this.optimizeForce(simulation, nodes.length);
        
        return simulation;
    },
    
    /**
     * Optimize force parameters based on graph size
     * @param {Object} simulation - D3 force simulation
     * @param {number} nodeCount - Number of nodes
     * @returns {Object} - Updated simulation
     */
    optimizeForce(simulation, nodeCount) {
        // Get force settings from config
        const config = Config.visualization.forceSimulation;
        
        // Very small graphs (less than 20 nodes)
        if (nodeCount < 20) {
            simulation.alphaDecay(0.02)
                .velocityDecay(0.3)
                .force('charge', d3.forceManyBody()
                    .strength(-800)
                    .distanceMax(800))
                .force('link', d3.forceLink().id(d => d.id)
                    .distance(80))
                .force('collision', d3.forceCollide()
                    .radius(d => VizStyles.getNodeRadius(d) * 2)
                    .strength(0.5));
        }
        // Small graphs (20-50 nodes)
        else if (nodeCount < 50) {
            simulation.alphaDecay(0.025)
                .velocityDecay(0.4)
                .force('charge', d3.forceManyBody()
                    .strength(-600)
                    .distanceMax(600))
                .force('link', d3.forceLink().id(d => d.id)
                    .distance(100))
                .force('collision', d3.forceCollide()
                    .radius(d => VizStyles.getNodeRadius(d) * 1.8)
                    .strength(0.5));
        }
        // Medium graphs (50-100 nodes)
        else if (nodeCount < 100) {
            simulation.alphaDecay(0.03)
                .velocityDecay(0.5)
                .force('charge', d3.forceManyBody()
                    .strength(-500)
                    .distanceMax(500))
                .force('link', d3.forceLink().id(d => d.id)
                    .distance(100))
                .force('collision', d3.forceCollide()
                    .radius(d => VizStyles.getNodeRadius(d) * 1.5)
                    .strength(0.5));
        }
        // Medium-large graphs (100-200 nodes)
        else if (nodeCount < 200) {
            simulation.alphaDecay(0.04)
                .velocityDecay(0.6)
                .force('charge', d3.forceManyBody()
                    .strength(-400)
                    .distanceMax(400))
                .force('link', d3.forceLink().id(d => d.id)
                    .distance(100))
                .force('collision', d3.forceCollide()
                    .radius(d => VizStyles.getNodeRadius(d) * 1.3)
                    .strength(0.6));
        }
        // Large graphs (200+ nodes)
        else {
            simulation.alphaDecay(0.05)
                .velocityDecay(0.7)
                .force('charge', d3.forceManyBody()
                    .strength(-300)
                    .distanceMax(300))
                .force('link', d3.forceLink().id(d => d.id)
                    .distance(100))
                .force('collision', d3.forceCollide()
                    .radius(d => VizStyles.getNodeRadius(d) * 1.2)
                    .strength(0.7));
        }
        
        return simulation;
    },
    
    /**
     * Create a radial layout for initial positioning
     * @param {Array} nodes - Node data
     * @param {Object} dimensions - Container dimensions
     * @returns {Array} - Nodes with positions
     */
    createRadialLayout(nodes, dimensions) {
        const { width, height } = dimensions;
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Group nodes by type
        const nodesByType = new Map();
        nodes.forEach(node => {
            const type = node.type;
            if (!nodesByType.has(type)) {
                nodesByType.set(type, []);
            }
            nodesByType.get(type).push(node);
        });
        
        const numTypes = nodesByType.size;
        const maxRadius = Math.min(width, height) * 0.4;
        
        // Position nodes in concentric circles based on type
        let typeIndex = 0;
        nodesByType.forEach((typeNodes, type) => {
            // Calculate radius for this type
            const radius = maxRadius * (0.3 + 0.7 * (typeIndex / (numTypes - 1 || 1)));
            
            // Position nodes in a circle
            typeNodes.forEach((node, i) => {
                const angle = (i / typeNodes.length) * 2 * Math.PI;
                node.x = centerX + radius * Math.cos(angle);
                node.y = centerY + radius * Math.sin(angle);
            });
            
            typeIndex++;
        });
        
        return nodes;
    },
    
    /**
     * Create a simple layout for very small graphs
     * @param {Array} nodes - Node data
     * @param {Object} dimensions - Container dimensions
     * @returns {Array} - Nodes with positions
     */
    createSimpleLayout(nodes, dimensions) {
        const { width, height } = dimensions;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) * 0.3;
        
        nodes.forEach((node, i) => {
            const angle = (i / nodes.length) * 2 * Math.PI;
            node.x = centerX + radius * Math.cos(angle);
            node.y = centerY + radius * Math.sin(angle);
        });
        
        return nodes;
    },
    
    /**
     * Create drag behavior for nodes
     * @param {Object} simulation - D3 force simulation
     * @returns {Object} - D3 drag behavior
     */
    createDragBehavior(simulation) {
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
};

// Export the ForceLayout object
window.ForceLayout = ForceLayout;
