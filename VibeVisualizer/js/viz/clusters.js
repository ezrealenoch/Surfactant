/**
 * Clustering functionality for SBOM visualization
 */
const VizClusters = {
    /**
     * Apply clustering to nodes and links
     * @param {Array} nodes - Original nodes
     * @param {Array} links - Original links
     * @param {Object} options - Clustering options
     * @returns {Object} - Clustered nodes and links
     */
    applyClustering(nodes, links, options = {}) {
        const threshold = options.threshold || Config.visualization.clustering.threshold;
        
        // If below threshold, return original
        if (nodes.length <= threshold) {
            Debug.info(`No clustering needed: ${nodes.length} nodes below threshold of ${threshold}`);
            return { nodes, links };
        }
        
        Debug.info(`Applying clustering to ${nodes.length} nodes`);
        
        // Create clusters
        const clusters = this.createClusters(nodes, links);
        
        // Create cluster nodes and links
        const clusterNodes = this.createClusterNodes(clusters);
        const clusterLinks = this.createClusterLinks(clusters, links);
        
        // Add important nodes that shouldn't be clustered
        const importantNodes = this.findImportantNodes(nodes, links);
        const finalNodes = [...clusterNodes, ...importantNodes];
        
        // Create links for important nodes
        const importantLinks = this.createImportantLinks(importantNodes, clusters, links);
        const finalLinks = [...clusterLinks, ...importantLinks];
        
        Debug.info(`Reduced to ${finalNodes.length} nodes after clustering`);
        
        return { 
            nodes: finalNodes, 
            links: finalLinks,
            clusters: clusters 
        };
    },
    
    /**
     * Create clusters based on node types and SBOM
     * @param {Array} nodes - Original nodes
     * @param {Array} links - Original links
     * @returns {Map} - Map of clusters
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
                    commonNodes: 0
                });
            }
            
            const cluster = clusters.get(clusterId);
            cluster.nodes.push(node);
            
            if (node.isCommon) {
                cluster.commonNodes++;
            }
        });
        
        return clusters;
    },
    
    /**
     * Create cluster nodes from clusters
     * @param {Map} clusters - Map of clusters
     * @returns {Array} - Cluster nodes
     */
    createClusterNodes(clusters) {
        const clusterNodes = [];
        
        clusters.forEach(cluster => {
            // Only create cluster if it has multiple nodes
            if (cluster.nodes.length > 1) {
                // Find a representative node for name
                const representativeNode = cluster.nodes.find(n => n.isCommon) || cluster.nodes[0];
                const sbom = SBOMStore.getSBOMById(cluster.sbomId);
                
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
    },
    
    /**
     * Create links between clusters
     * @param {Map} clusters - Map of clusters
     * @param {Array} originalLinks - Original links
     * @returns {Array} - Links between clusters
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
    },
    
    /**
     * Find important individual nodes that shouldn't be clustered
     * @param {Array} nodes - Original nodes
     * @param {Array} links - Original links
     * @returns {Array} - Important nodes
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
    },
    
    /**
     * Create links for important nodes that weren't clustered
     * @param {Array} importantNodes - Nodes kept individually
     * @param {Map} clusters - Map of clusters
     * @param {Array} originalLinks - Original links
     * @returns {Array} - Links for important nodes
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
    },
    
    /**
     * Expand a cluster into its individual nodes
     * @param {Object} cluster - Cluster to expand
     * @param {Array} originalNodes - Original nodes
     * @param {Array} originalLinks - Original links
     * @returns {Object} - Expanded nodes and links
     */
    expandCluster(cluster, originalNodes, originalLinks) {
        if (!cluster.isCluster) {
            Debug.warn('Cannot expand a non-cluster node');
            return { nodes: [], links: [] };
        }
        
        Debug.info(`Expanding cluster: ${cluster.name}`);
        
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
};

// Export the VizClusters object
window.VizClusters = VizClusters;
