// At the start of your content.js
let isExtensionEnabled = true;

// Check initial state
chrome.storage.local.get(['enabled'], function(result) {
  isExtensionEnabled = result.enabled !== false;
});

// Listen for toggle messages
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'toggleExtension') {
    isExtensionEnabled = request.enabled;
    toggleButtonVisibility(isExtensionEnabled);
  }
});

// Wrap your main functionality in an enabled check
function yourMainFunction() {
  if (!isExtensionEnabled) return;
  // Your existing code here
}

// Function to get editor value from LeetCode
function getLeetCodeEditorValue() {
  // Try getting the editor from the main window first
  let editor = document.querySelector('.monaco-editor');
  
  if (!editor) {
    // If not found, try looking in iframes
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      try {
        const iframeEditor = iframe.contentDocument?.querySelector('.monaco-editor');
        if (iframeEditor) {
          editor = iframeEditor;
          break;
        }
      } catch (e) {
        console.log('Cannot access iframe content due to same-origin policy');
      }
    }
  }

  if (editor) {
    // Get the text content from the editor
    const codeElement = editor.querySelector('.view-lines');
    if (codeElement) {
      const value = codeElement.textContent;
      return value;
    }
  }

  // Alternative method using Monaco API if available
  if (window.monaco?.editor?.getModels) {
    const models = window.monaco.editor.getModels();
    if (models.length > 0) {
      const value = models[0].getValue();
      return value;
    }
  }

  console.log('No LeetCode Editor found on this page');
  return null;
}

// Function to analyze code complexity
async function analyzeCodeComplexity(code) {
  try {
    const res = await fetch('https://big-o-insights-back.vercel.app/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code_snippet: code
      })
    });

    const data = await res.json();
    
    if (res.status === 429) {
      return {
        secondsLeft: data.seconds_left
      };
    }

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const { response } = data;
    return {
      timeComplexity: response.time_complexity,
      spaceComplexity: response.space_complexity,
      explanation: response.explanation
    };
  } catch (error) {
    console.error('Error analyzing code:', error);
    return null;
  }
}

// Function to create and add the logger button
function addLoggerButton(editor) {
  // Create button container with increased width
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'algometer-button-container';
  buttonContainer.style.cssText = `
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 1000;
    width: 220px;
    display: ${isExtensionEnabled ? 'block' : 'none'};
  `;

  // Create results container with matching width
  const resultsContainer = document.createElement('div');
  resultsContainer.style.cssText = `
    margin-top: 10px;
    padding: 10px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    display: none;
    width: 100%; /* Match container width */
  `;

  // Create loader with smaller size for button
  const buttonLoader = document.createElement('div');
  buttonLoader.style.cssText = `
    width: 16px;
    height: 16px;
    border: 2px solid #ffffff;
    border-top: 2px solid transparent;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    display: none;
    margin: 0 auto;
  `;

  // Add keyframes for loader animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  // Create the button with magical styling
  const analyzeButton = document.createElement('button');
  analyzeButton.innerHTML = '<span>✨ Analyze Complexity</span>';
  analyzeButton.appendChild(buttonLoader);
  analyzeButton.style.cssText = `
    background: linear-gradient(45deg, #4f3cf7, #7b2ff7);
    color: white;
    padding: 10px 20px;
    border: none;
    border-radius: 20px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(123, 47, 247, 0.3);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    position: relative;
    overflow: hidden;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  const buttonText = analyzeButton.querySelector('span');

  // Add magical hover effect
  analyzeButton.onmouseover = () => {
    analyzeButton.style.transform = 'translateY(-2px)';
    analyzeButton.style.boxShadow = '0 6px 20px rgba(123, 47, 247, 0.4)';
    analyzeButton.style.background = 'linear-gradient(45deg, #7b2ff7, #4f3cf7)';
  };
  analyzeButton.onmouseout = () => {
    analyzeButton.style.transform = 'translateY(0)';
    analyzeButton.style.boxShadow = '0 4px 15px rgba(123, 47, 247, 0.3)';
    analyzeButton.style.background = 'linear-gradient(45deg, #4f3cf7, #7b2ff7)';
  };

  // Add click handler
  analyzeButton.onclick = async () => {
    const code = getLeetCodeEditorValue();
    if (code) {
      // Show loader in button and hide text
      buttonText.style.display = 'none';
      buttonLoader.style.display = 'block';
      resultsContainer.style.display = 'none';
      
      const result = await analyzeCodeComplexity(code);
      
      if (result) {
        if (result.secondsLeft) {
          // Handle rate limiting with countdown
          buttonLoader.style.display = 'none';
          let timeLeft = result.secondsLeft;
          
          const updateCounter = () => {
            buttonText.textContent = `Wait ${timeLeft}s`;
            buttonText.style.display = 'block';
            analyzeButton.disabled = true;
            analyzeButton.style.opacity = '0.7';
            analyzeButton.style.cursor = 'not-allowed';
            
            if (timeLeft <= 0) {
              // Reset button to original state
              buttonText.innerHTML = '✨ Analyze Complexity';
              analyzeButton.disabled = false;
              analyzeButton.style.opacity = '1';
              analyzeButton.style.cursor = 'pointer';
              return;
            }
            
            timeLeft--;
            setTimeout(updateCounter, 1000);
          };
          
          updateCounter();
        } else {
          // Show results as normal
          buttonText.style.display = 'block';
          buttonLoader.style.display = 'none';
          // Create base results HTML
          resultsContainer.innerHTML = `
            <div style="font-size: 14px; color: #333;">
              <div style="margin-bottom: 8px;">
                <span style="font-weight: 600;">Time Complexity:</span> 
                <span style="color: #7b2ff7;">${result.timeComplexity}</span>
              </div>
              <div style="margin-bottom: 8px;">
                <span style="font-weight: 600;">Space Complexity:</span> 
                <span style="color: #7b2ff7;">${result.spaceComplexity}</span>
              </div>
              <button id="showExplanation" style="
                background: linear-gradient(45deg, #4f3cf7, #7b2ff7);
                color: white;
                padding: 6px 12px;
                border: none;
                border-radius: 15px;
                cursor: pointer;
                font-size: 12px;
                margin-top: 8px;
                transition: all 0.3s ease;
                width: 100%;
              ">Show Explanation</button>
              <div id="explanationText" style="
                display: none;
                margin-top: 8px;
                padding: 8px;
                background: #f8f9fa;
                border-radius: 8px;
                font-size: 13px;
                color: #666;
                line-height: 1.4;
                max-height: 100px;
                overflow-y: auto;
                overflow-x: hidden;
                scrollbar-width: thin;
                scrollbar-color: #7b2ff7 #f8f9fa;
              ">${result.explanation}</div>
            </div>
          `;

          // Add custom scrollbar styles for webkit browsers
          const style = document.createElement('style');
          style.textContent = `
            #explanationText::-webkit-scrollbar {
              width: 6px;
            }
            #explanationText::-webkit-scrollbar-track {
              background: #f8f9fa;
              border-radius: 3px;
            }
            #explanationText::-webkit-scrollbar-thumb {
              background: #7b2ff7;
              border-radius: 3px;
            }
          `;
          document.head.appendChild(style);

          // Add click handler for explanation button
          const explanationBtn = resultsContainer.querySelector('#showExplanation');
          const explanationText = resultsContainer.querySelector('#explanationText');
          
          explanationBtn.onmouseover = () => {
            explanationBtn.style.transform = 'translateY(-1px)';
            explanationBtn.style.boxShadow = '0 2px 8px rgba(123, 47, 247, 0.3)';
          };
          
          explanationBtn.onmouseout = () => {
            explanationBtn.style.transform = 'translateY(0)';
            explanationBtn.style.boxShadow = 'none';
          };

          explanationBtn.onclick = () => {
            const isHidden = explanationText.style.display === 'none';
            explanationText.style.display = isHidden ? 'block' : 'none';
            explanationBtn.textContent = isHidden ? 'Hide Explanation' : 'Show Explanation';
          };

          resultsContainer.style.display = 'block';
        }
      } else {
        // Reset button state on error
        buttonText.style.display = 'block';
        buttonLoader.style.display = 'none';
      }
    }
  };

  // Add elements to container and container to editor
  buttonContainer.appendChild(analyzeButton);
  buttonContainer.appendChild(resultsContainer);
  editor.parentElement.style.position = 'relative';
  editor.parentElement.appendChild(buttonContainer);
}

// Function to initialize the editor and button
function initializeEditor() {
  if (!isExtensionEnabled) return false;
  
  let editor = document.querySelector('.monaco-editor');
  
  if (!editor) {
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      try {
        const iframeEditor = iframe.contentDocument?.querySelector('.monaco-editor');
        if (iframeEditor) {
          editor = iframeEditor;
          break;
        }
      } catch (e) {
        console.log('Cannot access iframe content due to same-origin policy');
      }
    }
  }

  if (editor && !editor.parentElement.querySelector('button')) {
    addLoggerButton(editor);
    return true;
  }
  return false;
}

// Wait for the editor to be fully loaded
function waitForEditor() {
  const checkInterval = setInterval(() => {
    if (initializeEditor()) {
      console.log('Editor found and button added');
      clearInterval(checkInterval);
    }
  }, 1000);
}

// Start waiting for editor after page load
if (document.readyState === 'complete') {
  waitForEditor();
} else {
  window.addEventListener('load', waitForEditor);
}

// Add a message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getEditorValue') {
    const value = getLeetCodeEditorValue();
    sendResponse({ value });
  }
  return true;
});

// Add function to show/hide button
function toggleButtonVisibility(show) {
  const buttonContainer = document.querySelector('.algometer-button-container');
  if (buttonContainer) {
    buttonContainer.style.display = show ? 'block' : 'none';
  }
}