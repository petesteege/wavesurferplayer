/**
 * Creates a metadata table for audio files
 * @param {HTMLAudioElement} audioElement - Optional audio element to extract metadata from
 */
function createMetadataTable(audioElement) {
    // First check if we're in a multi-share view by checking the URL
    const url = window.location.href;
    const isMultiShareView = url.includes('/s/') && document.querySelector('.files-fileList');
    
    // If this is a multi-share view, always disable metadata
    if (isMultiShareView) {
        console.log('Multi-share view detected, disabling all metadata');
        const metadataDivs = document.querySelectorAll('.ws-metadata');
        metadataDivs.forEach(div => {
            div.innerHTML = '';
            div.style.display = 'none';
        });
        
        // Adjust the player position to the default (no metadata) position
        adjustPlayerPositionEnhanced();
        return; // Exit early, don't even make the API call
    }
    
    // For single-share views, continue with normal behavior
    const shareToken = window.location.pathname.split('/').pop();

    fetch(`/index.php/apps/wavesurferplayer/get-share-type/${shareToken}`)
        .then(response => response.json())
        .then(data => {
            // Find ALL metadata divs on the page
            const metadataDivs = document.querySelectorAll('.ws-metadata');
            
            // Process each div
            metadataDivs.forEach(div => {
                // For FOLDER type (multi-share), NEVER show metadata regardless of settings
                if (data.type === 'FOLDER') {
                    div.innerHTML = '';
                    div.style.display = 'none';
                    console.log('Hiding metadata for folder view');
                    
                    // Adjust the player position to the default (no metadata) position
                    adjustPlayerPositionEnhanced();
                    return;
                }
                
                // For AUDIO type (single-share), check if metadata is enabled
                if (data.type === 'AUDIO') {
                    // Only show metadata if explicitly enabled in settings
                    if (window.WSConfig && window.WSConfig.show_metadata_table_single === true) {
                        div.style.display = 'block'; // Make sure it's visible
                        // If audio element is provided, extract metadata
                        if (audioElement) {
                            extractMetadata(audioElement);
                        } else {
                            // Find the audio element on the page
                            const pageAudio = document.querySelector('audio');
                            if (pageAudio) {
                                extractMetadata(pageAudio);
                            } else {
                                // Try to find using Wavesurfer instance if available
                                if (window.WavesurferInstance && window.WavesurferInstance.media) {
                                    extractMetadata(window.WavesurferInstance.media);
                                } else {
                                    div.innerHTML = `
                                    <table class="ws-meta-table">
                                        <thead>
                                            <tr>
                                                <th>Property</th>
                                                <th>Value</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td colspan="2">Loading metadata...</td>
                                            </tr>
                                        </tbody>
                                    </table>`;
                                    
                                    // Adjust the player position for metadata view
                                    adjustPlayerPositionEnhanced();
                                }
                            }
                        }
                    } else {
                        // Metadata is disabled for single view in settings
                        div.innerHTML = '';
                        div.style.display = 'none';
                        console.log('Metadata disabled for single view in settings');
                        
                        // Adjust the player position to the default (no metadata) position
                        adjustPlayerPositionEnhanced();
                    }
                }
            });
        })
        .catch(error => {
            console.error('Error fetching share type:', error);
            
            // In case of error, adjust to default position
            adjustPlayerPositionEnhanced();
        });
}

/**
 * Extracts metadata from an audio element and displays it in the ws-metadata div
 * @param {HTMLAudioElement} audioElement - The audio element to extract metadata from
 */
function extractMetadata(audioElement) {
    if (!audioElement) {
        console.error('No audio element provided to extractMetadata function');
        return;
    }

    const metadataDiv = document.querySelector('.ws-metadata');
    if (!metadataDiv) {
        console.error('Metadata div not found');
        return;
    }

    // Initialize the metadata table with loading state
    metadataDiv.innerHTML = `
    <table class="ws-meta-table">
        <thead>
            <tr>
                <th>Property</th>
                <th>Value</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td colspan="2">Loading metadata...</td>
            </tr>
        </tbody>
    </table>`;
    metadataDiv.style.display = 'block';
    
    // Apply dynamic height adjustment
    adjustMetadataHeight();
    
    // Basic metadata we can get immediately
    const fileName = decodeURIComponent(audioElement.src.split('/').pop()).split('?')[0];
    const fileExtension = fileName.split('.').pop().toUpperCase();
    
    // Initialize metadata object with only technical information
    const metadata = {
        'File Name': fileName,
        'Duration': formatTime(audioElement.duration),
        'File Type': fileExtension || 'Audio',
    };
    
    // Try to get audio channels and sample rate if available
    if (window.WavesurferInstance && window.WavesurferInstance.backend) {
        try {
            const backend = window.WavesurferInstance.backend;
            
            // Sample rate
            if (backend.buffer && backend.buffer.sampleRate) {
                metadata['Sample Rate'] = backend.buffer.sampleRate + ' Hz';
            }
            
            // Number of channels
            if (backend.buffer && backend.buffer.numberOfChannels) {
                metadata['Channels'] = backend.buffer.numberOfChannels;
            }
        } catch (e) {
            console.warn('Could not extract advanced audio metadata:', e);
        }
    }
    
    // Load jsmediatags library if it's not already loaded
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
            updateMetadataTable(metadata);
        };
        document.head.appendChild(script);
    }
    
    // Extract tags using jsmediatags
    loadJsMediaTags(() => {
        try {
            window.jsmediatags.read(audioElement.src, {
                onSuccess: function(tag) {
                    const tags = tag.tags;
                    
                    // Only add ID3 tags that actually have values (ignore empty ones)
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
                    
                    // Bit rate if available
                    if (tags.bitrate) {
                        metadata['Bit Rate'] = tags.bitrate + ' kbps';
                    }
                    
                    // Album artwork
                    if (tags.picture) {
                        const picture = tags.picture;
                        const format = picture.format;
                        const base64Data = btoa(
                            new Uint8Array(picture.data)
                                .reduce((data, byte) => data + String.fromCharCode(byte), '')
                        );
                        
                        // Create a small thumbnail
                        metadata['Artwork'] = `<img src="data:${format};base64,${base64Data}" 
                                              style="max-width: 80px; max-height: 80px;" />`;

                        // Set the background image
                        setCoverArtBackground(picture);
                    }
                    
                    // Update the table with the extracted metadata
                    updateMetadataTable(metadata);
                },
                onError: function(error) {
                    console.warn('Error reading audio tags:', error.type, error.info);
                    
                    // Still update the table with the basic metadata we have
                    updateMetadataTable(metadata);
                }
            });
        } catch (e) {
            console.error('Error attempting to read audio tags:', e);
            updateMetadataTable(metadata);
        }
    });
    
    // Helper function to format time (reused from wavesurfer-player.js)
    function formatTime(sec) {
        if (!sec || isNaN(sec) || sec < 0) return '0:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }
}

/**
 * Updates the metadata table with the extracted metadata
 * @param {Object} metadata - The metadata object to display
 */
function updateMetadataTable(metadata) {
    const metadataDiv = document.querySelector('.ws-metadata');
    if (!metadataDiv) return;
    
    // Build the metadata table
    let tableHTML = `
    <table class="ws-meta-table">
        <thead>
            <tr>
                <th>Property</th>
                <th>Value</th>
            </tr>
        </thead>
        <tbody>`;

    // Add each metadata row
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

    // Set the HTML in the metadata div
    metadataDiv.innerHTML = tableHTML;
    
    // Apply dynamic height adjustment again after updating content
    adjustMetadataHeight();
    
    // Adjust the player position - using the class-based method for better compatibility
    adjustPlayerPositionEnhanced();
    
    console.log('Metadata table updated, adjusting player position');
}

/**
 * Dynamically adjusts the height of the metadata container
 * to fill the available space to the bottom of the viewport
 */
function adjustMetadataHeight() {
    const metadataContainers = document.querySelectorAll('.ws-metadata');
    if (metadataContainers.length === 0) return;
    
    metadataContainers.forEach(container => {
        // Calculate distance from top of viewport
        const rect = container.getBoundingClientRect();
        const topPosition = rect.top;
        
        // Calculate available height (leave 30px margin at bottom)
        const availableHeight = window.innerHeight - topPosition - 30;
        
        // Set a reasonable minimum height
        const finalHeight = Math.max(availableHeight, 100);
        
        // Apply the height
        container.style.height = finalHeight + 'px';
    });
}

/**
 * Adjusts the position of the player based on whether metadata is shown
 * This function uses classList for more reliable toggling
 */
function adjustPlayerPositionEnhanced() {
    // Get the audio viewer element
    const audioViewer = document.querySelector('#imgframe #viewer[data-handler=audios]');
    if (!audioViewer) {
        console.warn('Audio viewer element not found for position adjustment');
        return;
    }
    
    // Check if metadata is visible
    const metadataDiv = document.querySelector('.ws-metadata');
    const isMetadataVisible = metadataDiv && 
                              metadataDiv.style.display !== 'none' && 
                              metadataDiv.innerHTML.trim() !== '';
    
    // Toggle the class based on metadata visibility
    if (isMetadataVisible) {
        audioViewer.classList.add('with-metadata');
        console.log('Added with-metadata class for top position adjustment');
    } else {
        audioViewer.classList.remove('with-metadata');
        console.log('Removed with-metadata class for default position');
    }
}

// Run height adjustment on load
window.addEventListener('load', adjustMetadataHeight);

// Run height adjustment on resize
window.addEventListener('resize', adjustMetadataHeight);

// Also run periodically to catch dynamic page changes
setInterval(adjustMetadataHeight, 1000);

// Make sure the createMetadataTable function is globally accessible
window.createMetadataTable = createMetadataTable;



