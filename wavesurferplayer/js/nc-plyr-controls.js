document.addEventListener('DOMContentLoaded', function() {
    // Keep track of our interval so we can clear it later
    let autoplayPreventer = null;
    
    // Function to continuously check and pause the audio
    function preventAutoplay() {
      const audioElement = document.querySelector('.plyr--audio audio');
      
      if (audioElement) {
        // Force pause and disable autoplay
        audioElement.autoplay = false;
        if (!audioElement.paused) {
          console.log('Forcing pause on audio element');
          audioElement.pause();
        }
      }
    }
    
    // Run immediately
    preventAutoplay();
    
    // Also run every 100ms for the first 5 seconds after page load
    autoplayPreventer = setInterval(preventAutoplay, 100);
    
    // After 5 seconds, stop the constant checking
    setTimeout(function() {
      if (autoplayPreventer) {
        console.log('Stopping autoplay prevention checks');
        clearInterval(autoplayPreventer);
      }
    }, 5000);
  });