(function() {
    'use strict';

    console.log('wavesurfer-player.js loaded');

    // 1. Load external config and CSS
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = '/apps/wavesurferplayer/css/wavesurfer.css';
    document.head.appendChild(css);

    const configScript = document.createElement('script');
    configScript.src = '/apps/wavesurferplayer/js/wavesurfer-config.js';
    document.head.appendChild(configScript);

    // 2. Load audio-metadata.js immediately so it's available when needed
    const metadataScript = document.createElement('script');
    metadataScript.src = '/apps/wavesurferplayer/js/audio-metadata.js';
    document.head.appendChild(metadataScript);

    // 3. Load Wavesurfer.js
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

    // 4. Initialize Wavesurfer with external config
    function initWaveSurferOnAudio(audioEl) {
        console.log('Initializing Wavesurfer on:', audioEl);

        updateWaveSurferLoadingBar(0); // Initialize progress bar

        const allAudioElements = document.querySelectorAll('audio');
        allAudioElements.forEach((el) => {
            if (el !== audioEl) {
                el.pause();
                el.muted = true;
                el.remove();
                console.log('Removed lingering audio element:', el);
            }
        });

        const oldPlayer = audioEl.closest('.plyr--audio');
        if (oldPlayer) {
            const controls = oldPlayer.querySelector('.plyr__controls');
            if (controls) {
                controls.remove();
                console.log('Removed old Nextcloud audio controls.');
            }
        }

        const parent = audioEl.parentNode;

        if (parent) {
            const playerWrapper = document.createElement('div');
            playerWrapper.className = 'ws-player-wrapper';
            parent.appendChild(playerWrapper);

            const playBtn = document.createElement('button');
            playBtn.className = 'ws-play-btn';
            const btnImg = document.createElement('img');
            btnImg.src = 'data:image/svg+xml;utf8,<svg fill="white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><polygon points="8,5 19,12 8,19"/></svg>';
            btnImg.className = 'ws-btn-icon';
            playBtn.appendChild(btnImg);
            playerWrapper.appendChild(playBtn);

            const waveformContainer = document.createElement('div');
            waveformContainer.className = 'ws-waveform';
            playerWrapper.appendChild(waveformContainer);

            const controlsRight = document.createElement('div');
            controlsRight.className = 'ws-right-controls';
            playerWrapper.appendChild(controlsRight);

            const volumeSlider = document.createElement('input');
            volumeSlider.type = 'range';
            volumeSlider.min = '0';
            volumeSlider.max = '1';
            volumeSlider.step = '0.01';
            volumeSlider.value = '1';
            volumeSlider.className = 'ws-volume-slider';
            controlsRight.appendChild(volumeSlider);

            const timeDisplay = document.createElement('div');
            timeDisplay.className = 'ws-time-display';
            timeDisplay.innerText = '0:00 / 0:00';
            controlsRight.appendChild(timeDisplay);

            // Create metadata div only if metadata table is enabled
            if (window.WSConfig?.show_metadata_table_single) {
                const metadataDiv = document.createElement('div');
                metadataDiv.className = 'ws-metadata';
                metadataDiv.setAttribute('data-ready', 'false');
                
                const publicContent = document.querySelector('#files-public-content');
                if (publicContent) {
                    publicContent.appendChild(metadataDiv); 
                } else {
                    document.body.appendChild(metadataDiv); 
                }
            }

            const ws = WaveSurfer.create({
                container: waveformContainer,
                ...window.WSConfig
            });

            // Store the WaveSurfer instance globally for reference
            window.WavesurferInstance = ws;

            // Use the fetch with progress:
            fetchAudioWithProgress(audioEl.src).then(url => {
                if (url) {
                    ws.load(url);
                    
                    // The rest of your event handlers stay the same
                    ws.on('loading', (progress) => {
                        // This is the 50-100% part (processing)
                        updateWaveSurferLoadingBar(50 + (progress / 2));
                    });
                }
            });

            ws.on('error', () => {
                updateWaveSurferLoadingBar(-1); // Error state
            });

            playBtn.addEventListener('click', () => {
                ws.playPause();
            });

            ws.on('play', () => {
                btnImg.src = 'data:image/svg+xml;utf8,<svg fill="white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>';
            });

            ws.on('pause', () => {
                btnImg.src = 'data:image/svg+xml;utf8,<svg fill="white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><polygon points="8,5 19,12 8,19"/></svg>';
            });

            volumeSlider.addEventListener('input', () => {
                ws.setVolume(volumeSlider.value);
            });

            ws.on('audioprocess', () => {
                const current = ws.getCurrentTime();
                const total = ws.getDuration();
                timeDisplay.innerText = `${formatTime(current)} / ${formatTime(total)}`;
            });

            ws.on('ready', () => {
                const total = ws.getDuration();
                timeDisplay.innerText = `0:00 / ${formatTime(total)}`;
                
                try {
                    // Handle metadata table and cover art background based on config
                    if (window.WSConfig?.show_metadata_table_single === true) {
                        // Create metadata table with cover art
                        console.log("Creating metadata table with potential cover art");
                        if (typeof createMetadataTable === 'function') {
                            createMetadataTable(audioEl, "single-share");
                        }
                    } else if (window.WSConfig?.use_coverart_background === true) {
                        // Only extract cover art for background
                        console.log("Extracting cover art only (no metadata table)");
                        if (typeof extractCoverArtOnly === 'function') {
                            extractCoverArtOnly(audioEl);
                        }
                    }
                } catch (err) { 
                    console.error("Error handling metadata/coverart:", err);                
                }
                
                updateWaveSurferLoadingBar(100);
            });
        }

        function formatTime(sec) {
            if (!sec || sec < 0) sec = 0;
            const m = Math.floor(sec / 60);
            const s = Math.floor(sec % 60).toString().padStart(2, '0');
            return `${m}:${s}`;
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        console.log('Wavesurfer script initialized.');
    
        loadWaveSurfer(function() {
            function tryInit() {
                const audioEl = document.querySelector('audio');
                if (audioEl && audioEl.getAttribute('src')) {
                    initWaveSurferOnAudio(audioEl);
                    return true;
                }
                return false;
            }
    
            if (!tryInit()) {
                const observer = new MutationObserver(() => {
                    if (tryInit()) observer.disconnect();
                });
                observer.observe(document.body, { childList: true, subtree: true });
            }
        });
    });
})();