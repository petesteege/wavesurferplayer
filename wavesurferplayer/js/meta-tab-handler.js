// collapsible-handler.js - Simple panel with CSS in separate file
(function() {
    'use strict';
    
    // Create panel only once
    function createPanel() {
        // Check if panel already exists
        if (document.getElementById('right-panel')) return;
        
        // Create panel
        const panel = document.createElement('div');
        panel.id = 'right-panel';
        panel.className = 'right-panel';
        panel.innerHTML = `
        <div class="panel">
            <div class="panel-header">
                <span>Metadata</span>
                <button id="panel-close">
                    <img src="/apps/wavesurferplayer/img/close.svg" alt="×" width="16" height="16">
                </button>
            </div>
            <div class="panel-content">
                <p>Metadata information will be displayed here.</p>
            </div>
        </div>
        `;
        
        // Try app-view first (for multi-view), then fall back to app-content (for single view)
        const appView = document.querySelector('#app-view');
        const appContent = document.querySelector('#app-content');
        
        if (appView && appView.parentNode) {
            appView.parentNode.insertBefore(panel, appView.nextSibling);
        } else if (appContent && appContent.parentNode) {
            appContent.parentNode.insertBefore(panel, appContent.nextSibling);
        } else {
            // Last resort fallback
            document.body.appendChild(panel);
        }
        
        // Add close button handler
        document.getElementById('panel-close').onclick = function() {
            document.body.classList.remove('has-panel');
        };
    }
    
// Initialize - create panel and add controls
function init() {
    // Create panel
    createPanel();
    
    // Add global controls
    window.audioPanel = {
        show: function() {
            document.body.classList.add('has-panel');
        },
        hide: function() {
            document.body.classList.remove('has-panel');
        },
        toggle: function() {
            document.body.classList.toggle('has-panel');
        },
        updateContent: function(htmlContent) {
            const contentEl = document.querySelector('#right-panel .panel-content');
            if (contentEl) {
                // First set opacity to 0 for a smooth transition
                contentEl.style.opacity = '0';
                
                // After a short delay, update content and fade back in
                setTimeout(() => {
                    contentEl.innerHTML = htmlContent;
                    contentEl.style.opacity = '1';
                }, 50);
            }
        }
    };
}
    
    // Run on load
    setTimeout(init, 1000);
})();