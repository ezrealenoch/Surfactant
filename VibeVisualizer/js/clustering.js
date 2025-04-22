/**
 * SBOM Clustering Module
 * Handles clustering, performance optimizations, and density controls
 * for large SBOM visualizations
 */
class SBOMClusterer {
    constructor() {
        this.clusterThreshold = 30; // Default threshold for when to start clustering
        this.maxNodeLimit = 500; // Default limit for non-clustered visualization
        this.densityReductionRatio = 0.6; // How much to reduce visual density
        this.forceCollisionMultiplier = 1.2; // Default collision multiplier
    }

    /**
     * Apply clustering to nodes based on type and relationships
     * @param {Array} nodes - Original nodes
     * @param {Array} links - Original links
     * @param {Object} options - Clustering options
     * @returns {Object} Clustered nodes and links
     */
    applyClustering(nodes, links, options = {}) {
        const threshold = options.threshold || this.clusterThreshold;
        
        // If we're below the threshold, return original data
        if (nodes.length <= threshold) {
            console.log(`Dataset size (${nodes.length} nodes) below clustering threshold (${threshold}). Skipping clustering.`);
            return { nodes, links };
        }
        
        console.log(`Applying clustering to ${nodes.length} nodes`);
        
        // Create clusters based on node types and SBOM
        const clusters = this.createClusters(nodes, links);
        
        // Create cluster nodes
        const clusterNodes = this.createClusterNodes(clusters);
        
        // Create links between clusters
        const clusterLinks = this.createClusterLinks(clusters, links);
        
        // Add important individual nodes that shouldn't be clustered
        const importantNodes = this.findImportantNodes(nodes, links);
        const finalNodes = [...clusterNodes, ...importantNodes];
        
        // Create links for important nodes
        const importantLinks = this.createImportantLinks(importantNodes, clusters, links);
        const finalLinks = [...clusterLinks, ...importantLinks];
        
        console.log(`Reduced to ${finalNodes.length} nodes after clustering`);
        
        return { 
            nodes: finalNodes, 
            links: finalLinks,
            clusters: clusters // Store clusters for reference
        };
    }
    
    /**
     * Create clusters based on node types and SBOM
     * @param {Array} nodes - Original nodes
     * @param {Array} links - Original links
     * @returns {Object} Map of clusters
     */
    createClusters(nodes, links) {
        const clusters = new Map();
        
        // Group nodes by SBOM and type
        nodes.forEach(node => {
            const clusterId = `${node.sbomId}-${node.type}${node.subtype ? '-' + node.subtype : ''}`;
            
            if (!clusters.has(clusterId)) {
                clusters.set(clusterId, {
                    id: clusterId,
                    sbomId: node.sbomId,
                    type: node.type,
                    subtype: node.subtype,
                    nodes: [],
                    commonNodes: 0 // Count common nodes in this cluster
                });
            }
            
            const cluster = clusters.get(clusterId);
            cluster.nodes.push(node);
            
            if (node.isCommon) {
                cluster.commonNodes++;
            }
        });
        
        return clusters;
    }
    
    /**
     * Create cluster nodes from clusters
     * @param {Map} clusters - Map of clusters
     * @returns {Array} Cluster nodes for visualization
     */
    createClusterNodes(clusters) {
        const clusterNodes = [];
        
        clusters.forEach(cluster => {
            // Only create cluster if it has multiple nodes
            if (cluster.nodes.length > 1) {
                // Find a representative node for name
                const representativeNode = cluster.nodes.find(n => n.isCommon) || cluster.nodes[0];
                const sbom = sbomParser.getSBOMById(cluster.sbomId);
                
                clusterNodes.push({
                    id: cluster.id,
                    name: `${cluster.nodes.length} ${cluster.type}${cluster.subtype ? ' (' + cluster.subtype + ')' : ''} components`,
                    type: cluster.type,
                    subtype: cluster.subtype,
                    sbomId: cluster.sbomId,
                    color: sbom ? sbom.color : '#999',
                    isCluster: true,
                    nodeCount: cluster.nodes.length,
                    commonCount: cluster.commonNodes,
                    isCommon: cluster.commonNodes > 0,
                    // Store original node IDs for expanding
                    originalNodeIds: cluster.nodes.map(n => n.id)
                });
            } else if (cluster.nodes.length === 1) {
                // If only one node, just add the original node
                clusterNodes.push(cluster.nodes[0]);
            }
        });
        
        return clusterNodes;
    }
    
    /**
     * Create links between clusters
     * @param {Map} clusters - Map of clusters
     * @param {Array} originalLinks - Original links
     * @returns {Array} Links between clusters
     */
    createClusterLinks(clusters, originalLinks) {
        const clusterLinks = [];
        const linkMap = new Map(); // To avoid duplicate links
        
        originalLinks.forEach(link => {
            // Find the clusters for source and target
            let sourceClusterId = null;
            let targetClusterId = null;
            
            // Find which clusters contain these nodes
            clusters.forEach((cluster, clusterId) => {
                if (cluster.nodes.some(n => n.id === link.source.id || n.id === link.source)) {
                    sourceClusterId = clusterId;
                }
                if (cluster.nodes.some(n => n.id === link.target.id || n.id === link.target)) {
                    targetClusterId = clusterId;
                }
            });
            
            // Only create links between different clusters
            if (sourceClusterId && targetClusterId && sourceClusterId !== targetClusterId) {
                const linkId = `${sourceClusterId}-${targetClusterId}`;
                
                if (!linkMap.has(linkId)) {
                    linkMap.set(linkId, {
                        source: sourceClusterId,
                        target: targetClusterId,
                        type: 'cluster-link',
                        sbomId: link.sbomId,
                        count: 1
                    });
                } else {
                    // Increment link count if already exists
                    linkMap.get(linkId).count++;
                }
            }
        });
        
        // Convert map to array
        linkMap.forEach(link => {
            clusterLinks.push(link);
        });
        
        return clusterLinks;
    }
    
    /**
     * Find important individual nodes that shouldn't be clustered
     * @param {Array} nodes - Original nodes
     * @param {Array} links - Original links
     * @returns {Array} Important nodes to keep individually
     */
    findImportantNodes(nodes, links) {
        // Calculate node importance based on connection counts and common status
        const nodeImportance = new Map();
        
        // Count connections for each node
        links.forEach(link => {
            const sourceId = link.source.id || link.source;
            const targetId = link.target.id || link.target;
            
            nodeImportance.set(sourceId, (nodeImportance.get(sourceId) || 0) + 1);
            nodeImportance.set(targetId, (nodeImportance.get(targetId) || 0) + 1);
        });
        
        // Find nodes with high importance or special status
        return nodes.filter(node => {
            const connectionCount = nodeImportance.get(node.id) || 0;
            
            // Keep nodes that are:
            // 1. Highly connected (hub nodes)
            // 2. Common across multiple SBOMs and have connections
            // 3. System nodes (usually few in number)
            return connectionCount > 5 || 
                (node.isCommon && connectionCount > 2) || 
                node.type === 'system';
        });
    }
    
    /**
     * Create links for important nodes that weren't clustered
     * @param {Array} importantNodes - Nodes kept individually
     * @param {Map} clusters - Map of clusters
     * @param {Array} originalLinks - Original links
     * @returns {Array} Links for important nodes
     */
    createImportantLinks(importantNodes, clusters, originalLinks) {
        const importantLinks = [];
        const importantNodeIds = new Set(importantNodes.map(n => n.id));
        
        originalLinks.forEach(link => {
            const sourceId = link.source.id || link.source;
            const targetId = link.target.id || link.target;
            
            // If both ends are important nodes, keep the original link
            if (importantNodeIds.has(sourceId) && importantNodeIds.has(targetId)) {
                importantLinks.push(link);
                return;
            }
            
            // If one end is an important node, create link to the cluster
            let clusterLink = null;
            
            if (importantNodeIds.has(sourceId)) {
                // Find cluster containing target
                clusters.forEach((cluster, clusterId) => {
                    if (cluster.nodes.some(n => n.id === targetId) && cluster.nodes.length > 1) {
                        clusterLink = {
                            source: sourceId,
                            target: clusterId,
                            type: link.type,
                            sbomId: link.sbomId
                        };
                    }
                });
            } else if (importantNodeIds.has(targetId)) {
                // Find cluster containing source
                clusters.forEach((cluster, clusterId) => {
                    if (cluster.nodes.some(n => n.id === sourceId) && cluster.nodes.length > 1) {
                        clusterLink = {
                            source: clusterId,
                            target: targetId,
                            type: link.type,
                            sbomId: link.sbomId
                        };
                    }
                });
            }
            
            if (clusterLink) {
                importantLinks.push(clusterLink);
            }
        });
        
        return importantLinks;
    }
    
    /**
     * Filter nodes by relevance for large datasets
     * @param {Array} nodes - Original nodes
     * @param {Array} links - Original links
     * @param {Object} options - Filter options
     * @returns {Object} Filtered nodes and links
     */
    applyDensityReduction(nodes, links, options = {}) {
        const maxNodes = options.maxNodes || this.maxNodeLimit;
        
        // If we're below the limit, return original data
        if (nodes.length <= maxNodes) {
            return { nodes, links };
        }
        
        console.log(`Applying density reduction to ${nodes.length} nodes`);
        
        // Sort nodes by importance
        const nodeImportance = this.calculateNodeImportance(nodes, links);
        const sortedNodes = [...nodes].sort((a, b) => {
            return (nodeImportance.get(b.id) || 0) - (nodeImportance.get(a.id) || 0);
        });
        
        // Take only the most important nodes
        const reducedNodes = sortedNodes.slice(0, maxNodes);
        const reducedNodeIds = new Set(reducedNodes.map(n => n.id));
        
        // Filter links to only include links between kept nodes
        const reducedLinks = links.filter(link => {
            const sourceId = link.source.id || link.source;
            const targetId = link.target.id || link.target;
            return reducedNodeIds.has(sourceId) && reducedNodeIds.has(targetId);
        });
        
        console.log(`Reduced to ${reducedNodes.length} nodes after density reduction`);
        
        return { nodes: reducedNodes, links: reducedLinks };
    }
    
    /**
     * Calculate importance score for each node
     * @param {Array} nodes - Nodes to score
     * @param {Array} links - Links to consider
     * @returns {Map} Map of node IDs to importance scores
     */
    calculateNodeImportance(nodes, links) {
        const importance = new Map();
        
        // Initialize with base scores
        nodes.forEach(node => {
            let baseScore = 0;
            
            // Common nodes are more important
            if (node.isCommon) baseScore += 3;
            
            // Nodes of different types have different base importance
            if (node.type === 'system') baseScore += 5;
            else if (node.type === 'hardware') baseScore += 2;
            else if (node.type === 'software') {
                if (node.subtype === 'executable') baseScore += 2;
                else if (node.subtype === 'library') baseScore += 1;
            }
            
            importance.set(node.id, baseScore);
        });
        
        // Add scores based on connections
        links.forEach(link => {
            const sourceId = link.source.id || link.source;
            const targetId = link.target.id || link.target;
            
            importance.set(sourceId, (importance.get(sourceId) || 0) + 1);
            importance.set(targetId, (importance.get(targetId) || 0) + 1);
        });
        
        return importance;
    }
    
    /**
     * Optimize force simulation parameters for large graphs
     * @param {d3.forceSimulation} simulation - D3 force simulation
     * @param {number} nodeCount - Number of nodes in the graph
     */
    optimizeForceSimulation(simulation, nodeCount) {
        // Adjust parameters based on node count
        if (nodeCount > 200) {
            // For very large graphs
            simulation.alphaDecay(0.05) // Faster decay
                .velocityDecay(0.7)    // More damping
                .force('charge', d3.forceManyBody().strength(-300).distanceMax(300))
                .force('collision', d3.forceCollide().radius(d => d.radius * 1.4).strength(0.7));
        } else if (nodeCount > 100) {
            // For medium-large graphs
            simulation.alphaDecay(0.04)
                .velocityDecay(0.6)
                .force('charge', d3.forceManyBody().strength(-400).distanceMax(400))
                .force('collision', d3.forceCollide().radius(d => d.radius * 1.3).strength(0.6));
        } else {
            // For smaller graphs
            simulation.alphaDecay(0.03)
                .velocityDecay(0.5)
                .force('charge', d3.forceManyBody().strength(-500).distanceMax(500))
                .force('collision', d3.forceCollide().radius(d => d.radius * 1.2).strength(0.5));
        }
        
        return simulation;
    }
    
    /**
     * Create a radial layout for clustered nodes
     * @param {Array} nodes - Nodes to position
     * @param {Object} dimensions - Container dimensions
     */
    createRadialLayout(nodes, dimensions) {
        const { width, height } = dimensions;
        const centerX = width / 2;
        const centerY = height / 2;
        
        const numTypes = new Set(nodes.map(n => n.type)).size;
        const maxRadius = Math.min(width, height) * 0.4;
        
        // Group nodes by type
        const nodesByType = new Map();
        nodes.forEach(node => {
            if (!nodesByType.has(node.type)) {
                nodesByType.set(node.type, []);
            }
            nodesByType.get(node.type).push(node);
        });
        
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
                node.fx = node.x; // Fix position initially
                node.fy = node.y;
            });
            
            typeIndex++;
        });
        
        // After a short delay, release the fixed positions to allow force layout to take over
        setTimeout(() => {
            nodes.forEach(node => {
                node.fx = null;
                node.fy = null;
            });
        }, 2000);
        
        return nodes;
    }
    
    /**
     * Expand a cluster into its individual nodes
     * @param {Object} cluster - Cluster node to expand
     * @param {Array} originalNodes - Original nodes array
     * @param {Array} originalLinks - Original links array
     * @returns {Object} Additional nodes and links
     */
    expandCluster(cluster, originalNodes, originalLinks) {
        if (!cluster.isCluster) return { nodes: [], links: [] };
        
        // Find all nodes in the cluster
        const expandedNodes = originalNodes.filter(node => 
            cluster.originalNodeIds.includes(node.id)
        );
        
        // Find all links connected to nodes in this cluster
        const expandedLinks = originalLinks.filter(link => {
            const sourceId = link.source.id || link.source;
            const targetId = link.target.id || link.target;
            return cluster.originalNodeIds.includes(sourceId) || 
                   cluster.originalNodeIds.includes(targetId);
        });
        
        // Position the expanded nodes around the cluster's position
        const radius = 50;
        expandedNodes.forEach((node, i) => {
            const angle = (i / expandedNodes.length) * 2 * Math.PI;
            node.x = cluster.x + radius * Math.cos(angle);
            node.y = cluster.y + radius * Math.sin(angle);
        });
        
        return {
            nodes: expandedNodes,
            links: expandedLinks
        };
    }
}

// Create a global instance
const sbomClusterer = new SBOMClusterer();
