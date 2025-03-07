// multi-share-handler.js
(function() {
    'use strict';
    
    let originUrl = window.location.origin;


    // Configuration and state
    const config = {
        debug: true,
        containerSelector: '#app-content-files',
        fileListSelector: '.files-fileList',
        playerContainerId: 'wavesurfer-multi-player-container'
    };
    
    let state = {
        currentAudioFile: null,
        wsInstance: null,
        isInitialized: false
    };
    
    // Helper functions
    function log(...args) {
        if (config.debug) console.log('[WS-Multi]', ...args);
    }
    
    // Check if we're on a folder share page
    function isFolderSharePage() {
        // Check if we're on a public share page with a file list
        return (
            window.location.href.includes('/s/') &&
            document.querySelector(config.fileListSelector) !== null
        );
    }
    
    // Get the share token from the URL
    function getShareToken() {
        const matches = window.location.href.match(/\/s\/([A-Za-z0-9]+)/);
        return matches ? matches[1] : null;
    }
    
    // Check if a file is an audio file by its mimetype or extension
    function isAudioFile(fileName, mimeType) {
        const audioMimeTypes = ['audio/', 'application/ogg'];
        const audioExtensions = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac'];
        
        if (mimeType && audioMimeTypes.some(type => mimeType.includes(type))) {
            return true;
        }
        
        return audioExtensions.some(ext => 
            fileName.toLowerCase().endsWith(ext)
        );
    }
    
    // Create player container on the page
    // Update the player container creation function to hide the metadata div in multi-share view

    function createPlayerContainer() {
        log('Creating player container');
        
        // Remove existing container if it exists
        const existingContainer = document.getElementById(config.playerContainerId);
        if (existingContainer) {
            existingContainer.remove();
        }
        
        // Create new container
        const container = document.createElement('div');
        container.id = config.playerContainerId;
        container.classList.add('wavesurfer-multi-player-container');
        container.classList.add('collapsed'); // Start collapsed
        


        // Create HTML with both download and metadata buttons
        container.innerHTML = `
        <div class="ws-multi-header">
            <div class="ws-multi-title">Now Playing: <span class="ws-multi-filename"></span></div>
            <div class="ws-multi-controls">
                <a href="#" class="button borderless ws-download-btn">
                    <span>Download</span>
                </a>
                <a href="#" class="button borderless ws-meta-btn">
                    <span>Metadata</span>
                </a>
                <button class="ws-multi-close-btn">
                    <img src="/apps/wavesurferplayer/img/close.svg" alt="Close" class="ws-close-icon">
                </button>
            </div>
        </div>
        <div id="ws-progress-container"></div>
        <div class="ws-player-wrapper">
            <button class="ws-play-btn">
                <img class="ws-btn-icon" src="data:image/svg+xml;utf8,<svg fill='white' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><polygon points='8,5 19,12 8,19'/></svg>">
            </button>
            <div class="ws-waveform"></div>
            <div class="ws-right-controls">
                <input type="range" min="0" max="1" step="0.01" value="1" class="ws-volume-slider">
                <div class="ws-time-display">0:00 / 0:00</div>
            </div>
        </div>
        `;


        // Add metadata button event
        const metaBtn = container.querySelector('.ws-meta-btn');
        metaBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent the default link behavior
            // Toggle metadata panel
            if (window.audioPanel) {
                window.audioPanel.toggle();
            }
        });

        // Add download button event
        const downloadBtn = container.querySelector('.ws-download-btn');
        downloadBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent the default link behavior
            
            // Get the current audio file URL and trigger download
            if (state.currentAudioFile) {
                // Create a temporary link and trigger download
                const tempLink = document.createElement('a');
                tempLink.href = state.currentAudioFile;
                tempLink.download = container.querySelector('.ws-multi-filename').textContent.trim();
                document.body.appendChild(tempLink);
                tempLink.click();
                document.body.removeChild(tempLink);
            }
        });
        
        
        // Add close button event
        const closeBtn = container.querySelector('.ws-multi-close-btn');
        closeBtn.addEventListener('click', () => {
            // Collapse the player
            container.classList.remove('expanded');
            container.classList.add('collapsed');
            
            // Remove the body class to restore normal layout
            document.body.classList.remove('has-wavesurfer-player');
            
            if (state.wsInstance) {
                state.wsInstance.pause();
            }
            
            // Clean up after animation completes
            setTimeout(() => {
                if (state.wsInstance) {
                    state.wsInstance.destroy();
                    state.wsInstance = null;
                }
            }, 300); // Match the CSS transition duration
        });
        
        // Add to page - always use document.body for fixed position
        document.body.appendChild(container);
        
        return container;
    }
    
    // Load and initialize WaveSurfer
    function loadWaveSurfer(callback) {
        if (typeof WaveSurfer === 'undefined') {
            const script = document.createElement('script');
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/wavesurfer.js/6.6.4/wavesurfer.min.js";
            script.onload = callback;
            document.head.appendChild(script);
        } else {
            callback();
        }
    }
    
    // Get or create the player container
    function getPlayerContainer() {
        // Try to find existing container
        let container = document.getElementById(config.playerContainerId);
        
        // If it doesn't exist, create it
        if (!container) {
            container = createPlayerContainer();
        }
        
        return container;
    }
    
    // Initialize Wavesurfer with a given audio URL

    
    // Format time in seconds to MM:SS
    function formatTime(sec) {
        if (!sec || sec < 0) sec = 0;
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }
    
    
    // Helper to prevent default viewing behavior
    function preventDefaultViewerBehavior() {
        // Find and remove any viewer activating elements
        const viewerActivators = document.querySelectorAll('.viewer-text');
        viewerActivators.forEach(el => el.remove());
        
        // Check if the viewer is already open and close it
        const viewer = document.getElementById('viewer');
        if (viewer) {
            const closeButton = viewer.querySelector('.icon-close');
            if (closeButton) {
                closeButton.click();
            }
        }
    }
    

    async function initWaveSurfer(audioUrl, fileName) {
        log('Initializing Wavesurfer with:', audioUrl);
    
        // Get the player container
        const container = getPlayerContainer();
    
        // Update filename display
        const filenameElement = container.querySelector('.ws-multi-filename');
        if (filenameElement) {
            filenameElement.textContent = fileName;
        }
    
        // Make sure the container is visible
        container.classList.remove('collapsed');
        container.classList.add('expanded');
    
        // Add class to body to adjust app-content position
        document.body.classList.add('has-wavesurfer-player');
    
        // Destroy previous Wavesurfer instance if it exists
        if (state.wsInstance) {
            log('Destroying existing Wavesurfer instance');
            state.wsInstance.destroy();
            state.wsInstance = null;
    
            // Remove any existing <audio> element to prevent duplicates
            const oldAudio = document.querySelector(`#${config.playerContainerId} audio`);
            if (oldAudio) {
                log('Removing previous <audio> element');
                oldAudio.remove();
            }
        }
    
        // Clear previous waveform and show loading overlay
        const waveformContainer = container.querySelector('.ws-waveform');
        waveformContainer.innerHTML = '';
    
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'ws-loading-overlay';
        loadingOverlay.innerHTML = '<div class="ws-loading">Loading audio waveform...</div>';
        waveformContainer.appendChild(loadingOverlay);
    
        // **Create Wavesurfer immediately so UI updates instantly**
        state.wsInstance = WaveSurfer.create({
            container: waveformContainer,
            waveColor: window.WSConfig?.waveColor || '#A8A8A8',
            progressColor: window.WSConfig?.progressColor || '#0082c9',
            height: window.WSConfig?.height || 180,
            barWidth: window.WSConfig?.barWidth || 2,
            barRadius: window.WSConfig?.barRadius || 2,
            barGap: window.WSConfig?.barGap || 3,
            backend: 'WebAudio',
            responsive: true,
            normalize: true,
            sampleRate: window.WSConfig?.samplerate || 44100,
            dragToSeek: false
        });
    
        // **Track real-time download progress**
        updateWaveSurferLoadingBar(0);
        const fileUrl = await fetchAudioWithProgress(audioUrl);
        if (!fileUrl) {
            updateWaveSurferLoadingBar(-1); // Show error state
            return;
        }
    
        // **Now load the file after the instance exists**
        state.wsInstance.load(fileUrl);
        state.currentAudioFile = fileUrl;
    
        // **Track Wavesurfer processing progress**
        state.wsInstance.on('loading', (progress) => {
            updateWaveSurferLoadingBar(50 + (progress / 2)); // 50-100% during processing
        });
    
        // Set up event handlers
        const playBtn = container.querySelector('.ws-play-btn');
        const btnImg = playBtn.querySelector('.ws-btn-icon');
        const volumeSlider = container.querySelector('.ws-volume-slider');
        const timeDisplay = container.querySelector('.ws-time-display');
    
        // Prevent duplicate event listeners
        playBtn.replaceWith(playBtn.cloneNode(true));
        const freshPlayBtn = container.querySelector('.ws-play-btn');
        const freshBtnImg = freshPlayBtn.querySelector('.ws-btn-icon');
    
        freshPlayBtn.addEventListener('click', () => {
            log('Play button clicked, toggling playback');
            state.wsInstance.playPause();
        });
    
        state.wsInstance.on('play', () => {
            log('Wavesurfer play event fired');
            freshBtnImg.src = 'data:image/svg+xml;utf8,<svg fill="white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>';
        });
    
        state.wsInstance.on('pause', () => {
            log('Wavesurfer pause event fired');
            freshBtnImg.src = 'data:image/svg+xml;utf8,<svg fill="white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><polygon points="8,5 19,12 8,19"/></svg>';
        });
    
        // Prevent duplicate volume event listeners
        volumeSlider.replaceWith(volumeSlider.cloneNode(true));
        const freshVolumeSlider = container.querySelector('.ws-volume-slider');
    
        freshVolumeSlider.addEventListener('input', () => {
            state.wsInstance.setVolume(freshVolumeSlider.value);
        });
    
        state.wsInstance.on('audioprocess', () => {
            const current = state.wsInstance.getCurrentTime();
            const total = state.wsInstance.getDuration();
            timeDisplay.innerText = `${formatTime(current)} / ${formatTime(total)}`;
        });
    
        // Handle metadata removal in multi-share view
// Handle metadata removal in multi-share view
state.wsInstance.on('ready', () => {
    const total = state.wsInstance.getDuration();
    timeDisplay.innerText = `0:00 / ${formatTime(total)}`;

    // Remove loading overlay
    const loadingOverlay = waveformContainer.querySelector('.ws-loading-overlay');
    if (loadingOverlay) loadingOverlay.remove();

    // Create a metadata div if it doesn't exist
    if (!document.querySelector('.ws-metadata')) {
        const metadataDiv = document.createElement('div');
        metadataDiv.className = 'ws-metadata';
        metadataDiv.style.display = 'none'; // Keep hidden
        document.body.appendChild(metadataDiv);
    }

    // We no longer need to call createMetadataTable here since we're using displayMetadataForPanel directly
    // in the handleAudioFileClick function
    
    log('Wavesurfer ready, starting playback');
    setTimeout(() => state.wsInstance.play(), 100);

    // Complete progress bar
    updateWaveSurferLoadingBar(100);
});
    
        // Handle errors
        state.wsInstance.on('error', (err) => {
            log('Wavesurfer error:', err);
    
            // Clear waveform container and show error message
            waveformContainer.innerHTML = '';
    
            const errorOverlay = document.createElement('div');
            errorOverlay.className = 'ws-error-overlay';
            errorOverlay.innerHTML = '<div class="ws-error">Error loading audio. Please try again or download the file directly.</div>';
            waveformContainer.appendChild(errorOverlay);
    
            updateWaveSurferLoadingBar(-1); // Show error on progress bar
        });
    }
    
    
    


    
    // Track which URL is currently being loaded
    let currentLoadingUrl = null;
    
    function handleAudioFileClick(event, fileName, filePath) {
        log('Audio file clicked:', fileName, filePath);
    
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
    
        preventDefaultViewerBehavior();
    
        const container = getPlayerContainer();
        container.classList.remove('collapsed');
        container.classList.add('expanded');
    
        document.body.classList.add('has-wavesurfer-player');
    
        const shareToken = getShareToken();
        if (!shareToken) {
            log('Could not determine share token');
            return;
        }
    
        const fileUrl = `/index.php/s/${shareToken}/download?path=${encodeURIComponent(filePath)}`;
        console.log(fileUrl);
    
        if (window._wsLoadTimeout) {
            clearTimeout(window._wsLoadTimeout);
        }
    
// In the handleAudioFileClick function, after setting up WaveSurfer:
window._wsLoadTimeout = setTimeout(() => {
    loadWaveSurfer(() => {
        initWaveSurfer(fileUrl, fileName);
        
        // Also directly call the metadata function with the URL and filename
        if (typeof window.displayMetadataForPanel === 'function') {
            window.displayMetadataForPanel(fileUrl, fileName);
        }
    });
}, 50);
    }
    
    
    // Set up click intercepts for audio files in the file list
    function setupAudioFileIntercepts() {
        log('Setting up audio file click intercepts');
        
        const fileList = document.querySelector(config.fileListSelector);
        if (!fileList) {
            log('File list not found');
            return;
        }
        
        // Keep track of the last clicked audio to prevent double-loading
        let lastClickedAudio = null;
        let lastClickTime = 0;
        
        // Use native event delegation with modern event listeners
        fileList.addEventListener('click', (event) => {
            // Skip if we clicked on the 3-dots menu or inside it
            if (event.target.closest('.fileactions') || 
                event.target.closest('.fileActionsMenu') ||
                event.target.matches('.icon-more')) {
                log('Clicked on file actions, not intercepting');
                return;
            }
            
            // Find the file row that was clicked
            const fileRow = event.target.closest('tr[data-file]');
            if (!fileRow) return;
            
            const fileName = fileRow.getAttribute('data-file');
            const filePath = fileRow.getAttribute('data-path') || '';
            const fullPath = filePath ? `${filePath}/${fileName}` : fileName;
            
            // Check if it's an audio file
            const mimeAttr = fileRow.getAttribute('data-mime');
            const isAudio = isAudioFile(fileName, mimeAttr);
            
            if (isAudio) {
                // Prevent double-clicks or multiple rapid triggers
                const now = Date.now();
                const clickKey = `${fileName}:${filePath}`;
                
                if (lastClickedAudio === clickKey && now - lastClickTime < 2000) {
                    log('Ignoring duplicate click on:', fileName);
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                }
                
                lastClickedAudio = clickKey;
                lastClickTime = now;
                
                // Also immediately run the cleanup to prevent flash of other players
                removeExistingPlayers();
                
                handleAudioFileClick(event, fileName, fullPath);
            }
        }, true); // Use capture phase to intercept before other handlers
    }
    

    // Fix layout issues that might exist
    function fixLayoutIssues() {
        // Calculate player height based on content and padding
        const playerHeight = 250; // Adjusted height of expanded player
        
        // Add styles to adjust the app-content position when the player is visible
        const style = document.createElement('style');
        style.id = 'wavesurfer-layout-fixes';
        style.textContent = `
            /* Fixed player at the top */
            .wavesurfer-multi-player-container {
                z-index: 1000;
            }
            
            /* Push down content when player is expanded */
            body.has-wavesurfer-player #app-content {
                padding-top: ${playerHeight}px !important;
                height: calc(100% - ${playerHeight}px) !important;
                overflow-y: auto !important;
            }
            
            /* This affects the files table */
            body.has-wavesurfer-player .files-filestable {
                height: auto !important;
                min-height: 0 !important;
                margin-bottom: 50px !important;
            }
            
            /* Make sure scroll container is properly sized */
            body.has-wavesurfer-player #app-content-files {
                height: calc(100% - 50px) !important;
                overflow: auto !important;
            }
            
            /* Fix for iOS */
            @supports (-webkit-overflow-scrolling: touch) {
                body.has-wavesurfer-player #app-content {
                    padding-top: ${playerHeight + 20}px !important;
                    -webkit-overflow-scrolling: touch;
                }
            }
        `;
        
        // Add the style to head
        document.head.appendChild(style);
        
        log('Applied layout fixes for player visibility');
    }
    
    // Initialize the multi-share handler
    function init() {
        if (state.isInitialized) {
            log('Already initialized, skipping');
            return;
        }
        
        log('Initializing multi-share handler');
        
        // Check if we're on a folder share page
        if (!isFolderSharePage()) {
            log('Not a folder share page, exiting');
            return;
        }
        
        // Clean up any existing players that might be present from previous loads
        removeExistingPlayers();
        
        // Create the player container immediately but keep it collapsed
        createPlayerContainer();
        
        // Fix any layout issues
        fixLayoutIssues();
        
        // Set up click intercepts
        setupAudioFileIntercepts();
        
        // Prevent multiple initializations
        state.isInitialized = true;
    }
        


        // Load necessary styles
       const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = '/apps/wavesurferplayer/css/multi-share.css';
        document.head.appendChild(css);
        
        // Create player container (hidden by default)
        createPlayerContainer().classList.add('hidden');
        
        // Set up file click intercepts
        setupAudioFileIntercepts();
        
        // Mark as initialized
        state.isInitialized = true;


   
    
    // Remove any existing wavesurfer players on the page
    function removeExistingPlayers() {
        // Skip this on single file shares to avoid removing the main player
        if (!isFolderSharePage()) {
            log('Not a folder share page, skipping player cleanup');
            return;
        }
        
        log('Checking for existing wavesurfer players');
        
        // Remove all existing wavesurfer player containers except our multi-share player
        const existingPlayers = document.querySelectorAll('.ws-player-wrapper');
        existingPlayers.forEach(player => {
            const isOurPlayer = player.closest(`#${config.playerContainerId}`);
            if (!isOurPlayer) {
                log('Removing existing wavesurfer player:', player);
                const parentNode = player.parentNode;
                player.remove();
                
                // If the parent was a directDownload container, we might need to clean it up too
                if (parentNode && parentNode.classList && parentNode.classList.contains('directDownload')) {
                    const audioElements = parentNode.querySelectorAll('audio');
                    if (audioElements.length > 0) {
                        audioElements.forEach(audio => {
                            audio.pause();
                            audio.remove();
                        });
                    }
                }
            }
        });
        
        // Also remove any stray audio elements that might be causing issues
        const audioElements = document.querySelectorAll('audio');
        audioElements.forEach(audio => {
            // Only remove if not in our player
            const isOurAudio = audio.closest(`#${config.playerContainerId}`);
            if (!isOurAudio) {
                log('Removing stray audio element:', audio);
                audio.pause();
                audio.src = '';
                audio.remove();
            }
        });
        
        // Look for any wavesurfer-specific elements
        const wsElements = document.querySelectorAll('.wavesurfer, wave, canvas');
        wsElements.forEach(el => {
            const isOurElement = el.closest(`#${config.playerContainerId}`);
            if (!isOurElement) {
                log('Removing stray wavesurfer element:', el);
                el.remove();
            }
        });
    }
    
    // Initialize on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            init();
            // Remove any other players after a short delay to ensure they've been created
            setTimeout(removeExistingPlayers, 500);
        });
    } else {
        init();
        // Remove any other players after a short delay
        setTimeout(removeExistingPlayers, 500);
    }
    
    // Also periodically check for and remove any extra players
    setInterval(removeExistingPlayers, 2000);
    
    // Function to disable the default Nextcloud audio viewer
    function disableDefaultAudioViewer() {
        // Override Nextcloud's default file actions for audio files
        if (window.OCA && window.OCA.Files && window.OCA.Files.fileActions) {
            log('Overriding Nextcloud file actions for audio files');
            
            // Try to unregister the default action for audio files
            try {
                const mimeTypes = [
                    'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 
                    'audio/flac', 'audio/aac', 'audio/webm', 'audio/x-ms-wma'
                ];
                
                mimeTypes.forEach(mime => {
                    window.OCA.Files.fileActions.unregister(mime, 'default');
                });
            } catch (e) {
                log('Error unregistering default audio actions:', e);
            }
        }
    }
    
    // Also try to initialize when the file list might be dynamically loaded
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.addedNodes && mutation.addedNodes.length) {
                for (const node of mutation.addedNodes) {
                    if (node.matches && (
                        node.matches(config.fileListSelector) || 
                        node.querySelector && node.querySelector(config.fileListSelector)
                    )) {
                        init();
                        return;
                    }
                }
            }
        }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Monitor viewer overlay to prevent it from handling audio files
    // Use proper MutationObserver instead of deprecated DOMNodeInserted
    const viewerObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.addedNodes && mutation.addedNodes.length) {
                for (const node of mutation.addedNodes) {
                    if (node.id === 'viewer' && state.isInitialized) {
                        // Check if this is an audio viewer and we're on a folder share page
                        if (isFolderSharePage()) {
                            const audioElements = node.querySelectorAll('audio');
                            if (audioElements.length > 0) {
                                log('Intercepting viewer overlay for audio');
                                
                                // Pause and remove audio elements
                                audioElements.forEach(audio => {
                                    audio.pause();
                                    audio.src = '';
                                });
                                
                                // Close the viewer
                                setTimeout(() => {
                                    const closeButton = node.querySelector('.icon-close');
                                    if (closeButton) closeButton.click();
                                }, 50);
                            }
                        }
                    }
                    

                }
            }
        }
    });
    
    // Start observing with this observer
    viewerObserver.observe(document.body, { 
        childList: true,
        subtree: true
    });
    
    // Also try to initialize when the file list might be dynamically loaded
    const fileListObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.addedNodes && mutation.addedNodes.length) {
                for (const node of mutation.addedNodes) {
                    if (node.matches && (
                        node.matches(config.fileListSelector) || 
                        node.querySelector && node.querySelector(config.fileListSelector)
                    )) {
                        init();
                        return;
                    }
                }
            }
        }
    });
    
    fileListObserver.observe(document.body, { childList: true, subtree: true });
    // Expose some functions for debugging, but keep them minimal
    window.WavesurferMulti = {
        init,
        removeExistingPlayers
    };



    
    
})();