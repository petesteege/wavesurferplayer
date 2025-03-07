/**
 * Sets the cover art as a background image
 * @param {Object} picture - The picture object from jsmediatags (with format and data properties)
 */
function setCoverArtBackground(picture) {
    // Check if we have valid picture data and if background is enabled in config
    if (!picture || !window.WSConfig || window.WSConfig.use_coverart_background !== true) {
        return;
    }
    
    const appContent = document.getElementById('app-content');
    if (!appContent) return;
    
    // Convert binary picture data to base64
    const base64Data = btoa(
        new Uint8Array(picture.data)
            .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    
    // Set background image using the URL
    appContent.style.backgroundImage = `url('data:${picture.format};base64,${base64Data}')`;
    appContent.style.backgroundSize = 'cover';
    appContent.style.backgroundPosition = 'center';
    appContent.style.backgroundRepeat = 'no-repeat';
    
    // Add class to enable CSS effects (opacity, blur, etc.)
    appContent.classList.add('with-coverart-bg');
}

// Make it globally accessible
window.setCoverArtBackground = setCoverArtBackground;