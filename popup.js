document.addEventListener('DOMContentLoaded', function() {
  const toggleSwitch = document.getElementById('extensionToggle');

  // Load the saved state
  chrome.storage.local.get(['enabled'], function(result) {
    toggleSwitch.checked = result.enabled !== false; // Default to true if not set
  });

  // Save state when changed
  toggleSwitch.addEventListener('change', function() {
    const isEnabled = toggleSwitch.checked;
    chrome.storage.local.set({ enabled: isEnabled });
    
    // Notify content script of the change
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'toggleExtension',
        enabled: isEnabled
      });
    });
  });
}); 