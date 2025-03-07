// ws-progressbar.js

function updateWaveSurferLoadingBar(progress) {
    const pageHeader = document.getElementById('header');
    let loadingBar = document.querySelector('#ws-loading-bar');

    if (!loadingBar && pageHeader) {
        loadingBar = document.createElement('div');
        loadingBar.id = 'ws-loading-bar';
        loadingBar.style.position = 'absolute';
        loadingBar.style.top = `${pageHeader.offsetHeight}px`;
        loadingBar.style.left = '0';
        loadingBar.style.width = '0%';
        loadingBar.style.height = '2px';
        loadingBar.style.background = '#0082c9';
        loadingBar.style.transition = 'width 0.2s ease';
        loadingBar.style.zIndex = '1001';
        document.body.appendChild(loadingBar);
    }

    if (progress === -1) {
        // Error state
        loadingBar.style.background = 'red';
        loadingBar.style.width = '100%';
        setTimeout(() => (loadingBar.style.display = 'none'), 1000);
        return;
    }

    if (progress >= 0 && progress < 100) {
        loadingBar.style.width = `${progress}%`;
        loadingBar.style.display = 'block';
    }

    if (progress === 100) {
        setTimeout(() => {
            loadingBar.style.width = '100%';
            setTimeout(() => {
                loadingBar.style.display = 'none';
            }, 500);
        }, 200);
    }
}

async function fetchAudioWithProgress(url) {
    updateWaveSurferLoadingBar(0); // Start at 0%

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch audio');

        const contentLength = response.headers.get('content-length');
        if (!contentLength) {
            console.log('Warning: Content-Length header missing. Using estimated progress.');
        
            let fakeProgress = 0;
            const interval = setInterval(() => {
                fakeProgress += 2; // Smooth increase in steps
                updateWaveSurferLoadingBar(fakeProgress); // Update the progress bar
                if (fakeProgress >= 25) clearInterval(interval); // Stop at 25%
            }, 100); // Moves smoothly to 25% over ~2.5 seconds
        }

        const totalSize = parseInt(contentLength, 10);
        let loadedSize = 0;

        const reader = response.body.getReader();
        const chunks = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            chunks.push(value);
            loadedSize += value.length;

            // Update actual download progress dynamically (0-50%)
            const progress = Math.round((loadedSize / totalSize) * 50);
            updateWaveSurferLoadingBar(progress);
        }

        return url; // Return the same URL for direct loading
    } catch (error) {
        console.error('Download error:', error);
        updateWaveSurferLoadingBar(-1); // Show error state
        return null;
    }
}

// Make functions available globally
window.updateWaveSurferLoadingBar = updateWaveSurferLoadingBar;
window.fetchAudioWithProgress = fetchAudioWithProgress;