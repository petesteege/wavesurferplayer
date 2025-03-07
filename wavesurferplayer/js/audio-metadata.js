/**
 * Creates a metadata table for audio files
 * @param {HTMLAudioElement} audioElement - Optional audio element to extract metadata from
 * @param {string} pageType - Type of page ("single-share" or "multi-share")
 */
function createMetadataTable(audioElement, pageType) {
    // First check if we're in a multi-share view by checking the URL
    const url = window.location.href;
    const isMultiShareView = url.includes('/s/') && document.querySelector('.files-fileList');
    
    // For multi-share, use the panel instead of inline display
// For multi-share, use the panel instead of inline display
// For multi-share, use the panel instead of inline display
// For multi-share, use the panel instead of inline display
// For multi-share, use the panel instead of inline display
if (pageType === "multi-share") {
    console.log('Panel content element:', document.querySelector('#right-panel .panel-content'));
    console.log('Right panel element:', document.getElementById('right-panel'));
    console.log('Audio panel object:', window.audioPanel);
    console.log('Audio element provided:', audioElement);

    // Try to get the audio element if not provided
    if (!audioElement) {
        console.log('Audio element not provided, trying to find it');
        // Try to get the audio element from WaveSurfer instance
        if (window.WavesurferMulti && window.WavesurferMulti.state && window.WavesurferMulti.state.wsInstance) {
            audioElement = window.WavesurferMulti.state.wsInstance.media;
            console.log('Found audio element from WavesurferMulti:', audioElement);
        } else if (window.state && window.state.wsInstance) {
            audioElement = window.state.wsInstance.media;
            console.log('Found audio element from window.state:', audioElement);
        } else {
            // Try to find any audio element on the page
            const anyAudio = document.querySelector('audio');
            if (anyAudio) {
                audioElement = anyAudio;
                console.log('Found audio element from document:', audioElement);
            }
        }
    }

    if (audioElement && typeof extractMetadataWithCallback === 'function') {
        console.log('Starting metadata extraction with callback');
        
        // Make sure to show the panel first
       // if (window.audioPanel) {
       //     window.audioPanel.show();
       //     console.log('Panel shown');
       // }
        
        // Then extract metadata
        extractMetadataWithCallback(audioElement, function(metadata) {
            console.log('Metadata extraction complete:', metadata);
            
            // Build HTML table for panel
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
            
            console.log('Table HTML built');
            
            // Use the audioPanel object's updateContent method
            if (window.audioPanel) {
                window.audioPanel.updateContent(tableHTML);
                console.log('Updated panel content with metadata table');
            } else {
                console.error('Audio panel object not available');
            }
        }, true); // True indicates this is for the panel
        
        console.log('Metadata extraction initiated');
    } else {
        console.error('Audio element or extractMetadataWithCallback not available:', 
                      { audioElement: !!audioElement, 
                        extractMetadataWithCallback: typeof extractMetadataWithCallback });
    }
    return; // Exit early for multi-share view
}

    
    // If this is a multi-share view and not explicitly requested for panel, disable metadata
    if (isMultiShareView && pageType !== "multi-share") {
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
                            extractMetadataWithCallback(audioElement, updateMetadataTable);
                        } else {
                            // Find the audio element on the page
                            const pageAudio = document.querySelector('audio');
                            if (pageAudio) {
                                extractMetadataWithCallback(pageAudio, updateMetadataTable);
                            } else {
                                // Try to find using Wavesurfer instance if available
                                if (window.WavesurferInstance && window.WavesurferInstance.media) {
                                    extractMetadataWithCallback(window.WavesurferInstance.media, updateMetadataTable);
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
                        
                        // Check if cover art background is enabled
                        if (window.WSConfig && window.WSConfig.use_coverart_background === true) {
                            // Extract just the cover art if needed (even when metadata table is disabled)
                            if (audioElement) {
                                extractCoverArtOnly(audioElement);
                            } else {
                                const pageAudio = document.querySelector('audio');
                                if (pageAudio) {
                                    extractCoverArtOnly(pageAudio);
                                } else if (window.WavesurferInstance && window.WavesurferInstance.media) {
                                    extractCoverArtOnly(window.WavesurferInstance.media);
                                }
                            }
                        }
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
 * Extracts only the cover art from an audio element
 * @param {HTMLAudioElement} audioElement - The audio element to extract cover art from
 */
function extractCoverArtOnly(audioElement) {
    if (!audioElement || !window.WSConfig || window.WSConfig.use_coverart_background !== true) {
        return;
    }

    console.log('Extracting cover art only (no metadata table)');
    
    // Load jsmediatags library if it's not already loaded
// Modify the loadJsMediaTags function in displayMetadataForPanel
loadJsMediaTags(() => {
    console.log('jsmediatags loaded, reading tags');
    
    // Fetch the file as a blob first
    fetch(audioUrl)
        .then(response => response.blob())
        .then(blob => {
            try {
                window.jsmediatags.read(blob, {
                    onSuccess: function(tag) {
                        console.log('Tags successfully read');
                        // Rest of the success handling...
                    },
                    onError: function(error) {
                        // Error handling...
                    }
                });
            } catch (e) {
                console.error('Tag reading error:', e);
                updatePanelWithMetadata(metadata);
            }
        })
        .catch(error => {
            console.error('Error fetching audio file:', error);
            updatePanelWithMetadata(metadata);
        });
});
    
    // Extract tags using jsmediatags
    loadJsMediaTags(() => {
        try {
            window.jsmediatags.read(audioElement.src, {
                onSuccess: function(tag) {
                    // Album artwork
                    if (tag.tags && tag.tags.picture) {
                        // Set the background image
                        setCoverArtBackground(tag.tags.picture);
                    }
                },
                onError: function(error) {
                    console.warn('Error reading audio tags for cover art:', error.type, error.info);
                }
            });
        } catch (e) {
            console.error('Error attempting to read audio tags for cover art:', e);
        }
    });
}



/**
 * Extracts metadata from an audio element with a callback to handle the metadata
 * @param {HTMLAudioElement} audioElement - The audio element to extract metadata from
 * @param {Function} callback - The callback function to handle the extracted metadata
 * @param {boolean} isForPanel - Whether this is for the panel (true) or regular metadata div (false)
 */
function extractMetadataWithCallback(audioElement, callback, isForPanel) {
    if (!audioElement) {
        console.error('No audio element provided to extractMetadata function');
        return;
    }

    // Skip metadata div requirement if it's for the panel
    if (!isForPanel) {
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
    }
    
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
            callback(metadata);
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

                        // Set the background image if enabled
                        if (window.WSConfig && window.WSConfig.use_coverart_background === true) {
                            setCoverArtBackground(picture);
                        }
                    }
                    
                    // Update the table with the extracted metadata
                    callback(metadata);
                },
                onError: function(error) {
                    console.warn('Error reading audio tags:', error.type, error.info);
                    
                    // Still update the table with the basic metadata we have
                    callback(metadata);
                }
            });
        } catch (e) {
            console.error('Error attempting to read audio tags:', e);
            callback(metadata);
        }
    });
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

/**
 * Helper function to format time (reused from wavesurfer-player.js)
 * @param {number} sec - Seconds to format
 * @returns {string} Formatted time string
 */
function formatTime(sec) {
    if (!sec || isNaN(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// Run height adjustment on load
window.addEventListener('load', adjustMetadataHeight);

// Run height adjustment on resize
window.addEventListener('resize', adjustMetadataHeight);

// Also run periodically to catch dynamic page changes
setInterval(adjustMetadataHeight, 1000);

// Make sure functions are globally accessible
window.createMetadataTable = createMetadataTable;
window.extractCoverArtOnly = extractCoverArtOnly;






































/**
 * Extract and display metadata directly from a URL for the panel
 * @param {string} audioUrl - URL of the audio file
 * @param {string} fileName - Name of the file for display
 */
function displayMetadataForPanel(audioUrl, fileName) {
    console.log('Displaying metadata for panel from URL:', audioUrl);
    
    // Make sure the panel is visible
   // if (window.audioPanel) {
    //    window.audioPanel.show();
   // }
    
    // Initial loading message
    if (window.audioPanel) {
        window.audioPanel.updateContent(`
        <div class="ws-panel-content">
            <div class="ws-cover-art-container"></div>
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
                        <td>${fileName}</td>
                    </tr>
                    <tr>
                        <td>Status</td>
                        <td>Loading metadata...</td>
                    </tr>
                </tbody>
            </table>
        </div>
        `);
    }
    
    // Create a temporary audio element to get duration and other metadata
    const tempAudio = new Audio();
    tempAudio.crossOrigin = 'anonymous';
    tempAudio.src = audioUrl;
    
    // When metadata is loaded from the audio element
    tempAudio.onloadedmetadata = function() {
        console.log('Basic audio metadata loaded');
        
        // Basic metadata
        const metadata = {
            'File Name': fileName,
            'Duration': formatTime(tempAudio.duration),
            'File Type': fileName.split('.').pop().toUpperCase() || 'Audio'
        };
        
        // Load jsmediatags for ID3 info
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
                // Still update with basic metadata
                updatePanelWithMetadata(metadata);
            };
            document.head.appendChild(script);
        }
        
        // Update the panel with the metadata object
        function updatePanelWithMetadata(metadata) {
            if (!window.audioPanel) return;
            
            // Get artwork if it exists
            let artworkHtml = '';
            if (metadata['Artwork']) {
                // Extract the image data from the Artwork field
                const imgTag = metadata['Artwork'];
                const srcMatch = imgTag.match(/src="([^"]+)"/);
                if (srcMatch && srcMatch[1]) {
                    // Create full-width artwork display
                    artworkHtml = `<div class="ws-cover-art-container">
                        <img src="${srcMatch[1]}" class="ws-full-cover-art" alt="Album artwork">
                    </div>`;
                }
                // Remove artwork from table data as we'll display it separately
                delete metadata['Artwork'];
            }
            
            let tableHTML = `
            <div class="ws-panel-content">
                ${artworkHtml}
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
                // Skip empty values
                if (value === undefined || value === null || value === '') continue;
                
                tableHTML += `
                    <tr>
                        <td>${property}</td>
                        <td>${value}</td>
                    </tr>`;
            }
            
            tableHTML += `
                    </tbody>
                </table>
            </div>`;
            
            window.audioPanel.updateContent(tableHTML);
            console.log('Panel updated with metadata and cover art');
        }
        
        // Get ID3 tags using fetch first
        loadJsMediaTags(() => {
            console.log('jsmediatags loaded, reading tags');
            
            // Fetch the file as a blob first
            fetch(audioUrl)
                .then(response => response.blob())
                .then(blob => {
                    try {
                        window.jsmediatags.read(blob, {
                            onSuccess: function(tag) {
                                console.log('Tags successfully read');
                                const tags = tag.tags;
                                
                                // Add ALL ID3 tags to metadata - only those with values will be shown
                                if (tags.title) metadata['Title'] = tags.title;
                                if (tags.artist) metadata['Artist'] = tags.artist;
                                if (tags.album) metadata['Album'] = tags.album;
                                if (tags.year) metadata['Year'] = tags.year;
                                if (tags.genre) metadata['Genre'] = tags.genre;
                                if (tags.comment && tags.comment.text) metadata['Comment'] = tags.comment.text;
                                if (tags.track) metadata['Track'] = tags.track;
                                if (tags.composer) metadata['Composer'] = tags.composer;
                                if (tags.publisher) metadata['Publisher'] = tags.publisher;
                                if (tags.encodedBy) metadata['Encoded By'] = tags.encodedBy;
                                if (tags.copyright) metadata['Copyright'] = tags.copyright;
                                
                                // Try to extract other possible metadata fields
                                if (tags.bpm) metadata['BPM'] = tags.bpm;
                                if (tags.compilation) metadata['Compilation'] = tags.compilation;
                                if (tags.lyrics) metadata['Lyrics'] = tags.lyrics;
                                if (tags.artistUrl) metadata['Artist URL'] = tags.artistUrl;
                                if (tags.audioSourceUrl) metadata['Audio Source URL'] = tags.audioSourceUrl;
                                if (tags.catalognumber) metadata['Catalog Number'] = tags.catalognumber;
                                if (tags.discnumber) metadata['Disc Number'] = tags.discnumber;
                                if (tags.encodedOn) metadata['Encoded On'] = tags.encodedOn;
                                if (tags.encodingTool) metadata['Encoding Tool'] = tags.encodingTool;
                                if (tags.isrc) metadata['ISRC'] = tags.isrc;
                                if (tags.language) metadata['Language'] = tags.language;
                                if (tags.mediaType) metadata['Media Type'] = tags.mediaType;
                                if (tags.mood) metadata['Mood'] = tags.mood;
                                if (tags.originalArtist) metadata['Original Artist'] = tags.originalArtist;
                                if (tags.originalTitle) metadata['Original Title'] = tags.originalTitle;
                                if (tags.recordLabel) metadata['Record Label'] = tags.recordLabel;
                                if (tags.remixer) metadata['Remixer'] = tags.remixer;
                                if (tags.subtitle) metadata['Subtitle'] = tags.subtitle;
                                
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
                                    
                                    // Store artwork to be displayed above the table
                                    metadata['Artwork'] = `<img src="data:${format};base64,${base64Data}" />`;
                                }
                                
                                // Update panel with complete metadata
                                updatePanelWithMetadata(metadata);
                            },
                            onError: function(error) {
                                console.warn('Error reading tags:', error);
                                // Update with the basic metadata we have
                                updatePanelWithMetadata(metadata);
                            }
                        });
                    } catch (e) {
                        console.error('Tag reading error:', e);
                        // Update with the basic metadata we have
                        updatePanelWithMetadata(metadata);
                    }
                })
                .catch(error => {
                    console.error('Error fetching audio file:', error);
                    updatePanelWithMetadata(metadata);
                });
        });
    };
    
    // Handle errors loading the audio file
    tempAudio.onerror = function() {
        console.error('Error loading audio file metadata');
        
        if (window.audioPanel) {
            window.audioPanel.updateContent(`
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
                        <td>${fileName}</td>
                    </tr>
                    <tr>
                        <td>Error</td>
                        <td>Could not load audio metadata</td>
                    </tr>
                </tbody>
            </table>
            `);
        }
    };
}

