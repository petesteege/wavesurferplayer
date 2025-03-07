// multi-share-metadata.js - Adds metadata extraction for multi-share view
(function() {
    'use strict';

    // Only run in multi-share view
    const isMultiShareView = window.location.href.includes('/s/') && 
                           document.querySelector('.files-fileList');
    if (!isMultiShareView) return;

    // Function to extract metadata from audio URL
    function extractMetadataForPanel(audioUrl, fileName) {
        if (!audioUrl || !window.audioPanel) return;
        
        // Show basic info immediately
        let basicInfo = `
        <table class="ws-meta-table">
            <thead>
                <tr>
                    <th>Property</th>
                    <th>Value</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>File Name</td>
                    <td>${fileName || decodeURIComponent(audioUrl.split('/').pop()).split('?')[0]}</td>
                </tr>
                <tr>
                    <td>Status</td>
                    <td>Loading metadata...</td>
                </tr>
            </tbody>
        </table>`;
        
        window.audioPanel.updateContent(basicInfo);
        window.audioPanel.show();
        
        // Create temporary audio element to get metadata
        const tempAudio = new Audio();
        tempAudio.crossOrigin = "anonymous";
        tempAudio.src = audioUrl;
        
        // When audio metadata is loaded, update duration
        tempAudio.onloadedmetadata = function() {
            const fileToRead = decodeURIComponent(audioUrl.split('/').pop()).split('?')[0];
            
            // Create basic metadata object with duration
            let metadata = {
                'File Name': fileToRead,
                'Duration': formatTime(tempAudio.duration)
            };
            
            // Display basic metadata immediately
            displayMetadataInPanel(metadata);
            
            // Then load extended metadata
            loadJsMediaTags(function() {
                try {
                    window.jsmediatags.read(audioUrl, {
                        onSuccess: function(tag) {
                            // Create full metadata object from tags
                            const fullMetadata = createMetadataObject(tempAudio, tag, fileToRead);
                            
                            // Update panel with full metadata
                            displayMetadataInPanel(fullMetadata);
                        },
                        onError: function(error) {
                            console.warn('Error reading audio tags:', error.type, error.info);
                            // Still display basic metadata we have
                            displayMetadataInPanel(metadata);
                        }
                    });
                } catch (e) {
                    console.error('Error attempting to read audio tags:', e);
                    // Still display basic metadata we have
                    displayMetadataInPanel(metadata);
                }
            });
        };
        
        // Handle errors
        tempAudio.onerror = function() {
            const errorInfo = {
                'Error': 'Could not load audio metadata',
                'File Name': fileName || decodeURIComponent(audioUrl.split('/').pop()).split('?')[0]
            };
            displayMetadataInPanel(errorInfo);
        };
    }
    
    // Helper function to create metadata object from tags
    function createMetadataObject(audioElement, tag, fileName) {
        const tags = tag.tags;
        
        // Basic metadata
        const metadata = {
            'File Name': fileName || decodeURIComponent(audioElement.src.split('/').pop()).split('?')[0],
            'Duration': formatTime(audioElement.duration)
        };
        
        // Add ID3 tags if available
        if (tags.title && tags.title.trim() !== '') metadata['Title'] = tags.title;
        if (tags.artist && tags.artist.trim() !== '') metadata['Artist'] = tags.artist;
        if (tags.album && tags.album.trim() !== '') metadata['Album'] = tags.album;
        if (tags.year && tags.year.toString().trim() !== '') metadata['Year'] = tags.year;
        if (tags.genre && tags.genre.trim() !== '') metadata['Genre'] = tags.genre;
        if (tags.comment && tags.comment.text && tags.comment.text.trim() !== '') 
            metadata['Comment'] = tags.comment.text;
        if (tags.track && tags.track.toString().trim() !== '') metadata['Track'] = tags.track;
        
        // Some files might have these additional tags
        if (tags.composer && tags.composer.trim() !== '') metadata['Composer'] = tags.composer;
        if (tags.publisher && tags.publisher.trim() !== '') metadata['Publisher'] = tags.publisher;
        if (tags.encodedBy && tags.encodedBy.trim() !== '') metadata['Encoded By'] = tags.encodedBy;
        if (tags.copyright && tags.copyright.trim() !== '') metadata['Copyright'] = tags.copyright;
        
        // Album artwork (small thumbnail)
        if (tags.picture) {
            const picture = tags.picture;
            const format = picture.format;
            const base64Data = btoa(
                new Uint8Array(picture.data)
                    .reduce((data, byte) => data + String.fromCharCode(byte), '')
            );
            
            metadata['Artwork'] = `<img src="data:${format};base64,${base64Data}" 
                                  style="max-width: 80px; max-height: 80px;" />`;
        }
        
        return metadata;
    }
    
    // Display metadata in the panel
    function displayMetadataInPanel(metadata) {
        if (!window.audioPanel) return;
        
        let tableHTML = `
        <table class="ws-meta-table">
            <thead>
                <tr>
                    <th>Property</th>
                    <th>Value</th>
                </tr>
            </thead>
            <tbody>`;
            
        // Add each metadata entry
        for (const [property, value] of Object.entries(metadata)) {
            tableHTML += `
                <tr>
                    <td>${property}</td>
                    <td>${value}</td>
                </tr>`;
        }
        
        tableHTML += `
            </tbody>
        </table>`;
        
        window.audioPanel.updateContent(tableHTML);
    }
    
    // Format time helper
    function formatTime(sec) {
        if (!sec || isNaN(sec) || sec < 0) return '0:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }
    
    // Load jsmediatags library
    function loadJsMediaTags(callback) {
        if (window.jsmediatags) {
            callback();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsmediatags/3.9.5/jsmediatags.min.js';
        script.onload = callback;
        script.onerror = () => {
            console.error('Failed to load jsmediatags library');
            callback(); // Still call callback to show basic info
        };
        document.head.appendChild(script);
    }
    
    // Hook into the wavesurfer multi player initialization
    function hookIntoMultiPlayer() {
        // Wait for the wavesurfer multi player to be ready
        const checkInterval = setInterval(function() {
            if (typeof window.WavesurferMulti !== 'undefined') {
                clearInterval(checkInterval);
                
                // Original initWaveSurfer function from multi-share-handler.js
                const originalInitWS = window.initWaveSurfer;
                
                if (typeof originalInitWS === 'function') {
                    window.initWaveSurfer = function(audioUrl, fileName) {
                        // Call original function
                        const result = originalInitWS(audioUrl, fileName);
                        
                        // Extract metadata for our panel
                        extractMetadataForPanel(audioUrl, fileName);
                        
                        return result;
                    };
                }
            }
        }, 500);
    }
    
    // Initialize
    hookIntoMultiPlayer();
})();