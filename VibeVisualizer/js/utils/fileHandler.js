/**
 * File handling utilities for the SBOM Visualizer
 */
const FileHandler = {
    /**
     * Read a file as JSON
     * @param {File} file - File to read
     * @returns {Promise<Object>} - Parsed JSON data
     */
    readAsJSON(file) {
        return new Promise((resolve, reject) => {
            Debug.info(`Reading file: ${file.name} (${Formatter.fileSize(file.size)})`);
            
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const jsonData = JSON.parse(event.target.result);
                    Debug.info(`Successfully parsed JSON from ${file.name}`);
                    resolve(jsonData);
                } catch (error) {
                    Debug.error(`Failed to parse JSON from ${file.name}`, error);
                    reject(new Error(`Invalid JSON file: ${error.message}`));
                }
            };
            
            reader.onerror = () => {
                Debug.error(`Error reading file: ${file.name}`);
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsText(file);
        });
    },
    
    /**
     * Save data as a file
     * @param {Blob} blob - Blob to save
     * @param {string} filename - Filename
     */
    saveAs(blob, filename) {
        // Use FileSaver.js if available
        if (window.saveAs) {
            window.saveAs(blob, filename);
            return;
        }
        
        // Fallback to manual download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    },
    
    /**
     * Handle file selection from input or drag & drop
     * @param {FileList} files - Selected files
     * @returns {Promise<Array>} - Promise resolving to array of processed results
     */
    handleFiles(files) {
        if (files.length === 0) return Promise.resolve([]);
        
        Debug.info(`Processing ${files.length} files...`);
        
        // Convert FileList to array for easier handling
        const fileArray = Array.from(files);
        
        // Process each file
        const filePromises = fileArray.map(file => {
            // Filter to only JSON files
            if (!file.name.toLowerCase().endsWith('.json')) {
                Debug.warn(`Skipping ${file.name}: Not a JSON file`);
                return null;
            }
            
            return this.readAsJSON(file);
        });
        
        // Filter out null promises and wait for all files to be processed
        return Promise.all(filePromises.filter(p => p !== null));
    }
};

// Export the FileHandler object
window.FileHandler = FileHandler;
