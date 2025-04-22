/**
 * Configuration settings for the SBOM Visualizer
 */
const Config = {
    // Debug settings
    debug: {
        enabled: true,
        logLevel: 'info', // 'info', 'warning', 'error'
        showUIMessages: true
    },
    
    // Visualization settings
    visualization: {
        // Clustering settings
        clustering: {
            enabled: false,
            threshold: 30, // Number of nodes before clustering is applied
            maxNodeLimit: 500 // Max nodes to display without density reduction
        },
        
        // Force simulation settings
        forceSimulation: {
            defaultDistance: 80,
            defaultCharge: -600,
            defaultCollision: 2.0,
            centerStrength: 0.1,
            decayRate: 0.03
        },
        
        // Node sizing
        nodeSize: {
            system: 25,
            hardware: 20,
            software: 16,
            executable: 14,
            library: 12,
            other: 10
        },
        
        // Color palette for SBOMs
        colorPalette: [
            '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
            '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
        ],
        
        // Common dependency highlighting
        highlighting: {
            color: '#FF5722', // Highlight color for common dependencies
            strokeWidth: 3,
            dashArray: '5,3'
        }
    },
    
    // UI settings
    ui: {
        sidebar: {
            width: 320 // Sidebar width in pixels
        },
        animation: {
            duration: 750 // Default animation duration in ms
        }
    },
    
    // Export settings
    export: {
        formats: ['png', 'svg', 'json', 'csv'],
        imageQuality: 0.9
    }
};

// Freeze the configuration to prevent modifications
Object.freeze(Config);
