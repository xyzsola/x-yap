// Function to show reply selection modal
function showReplySelectionModal(replies, dialog) {
  // Remove existing modal if any
  const existingModal = document.getElementById('ai-reply-selection-modal');
  if (existingModal) {
    existingModal.remove();
  }

  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'ai-reply-selection-modal';
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 10000;
    display: flex;
    justify-content: center;
    align-items: center;
  `;

  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background-color: white;
    border-radius: 12px;
    padding: 20px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  `;

  // Create modal header
  const modalHeader = document.createElement('div');
  modalHeader.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    border-bottom: 1px solid #e1e8ed;
    padding-bottom: 12px;
  `;

  const modalTitle = document.createElement('h3');
  modalTitle.textContent = 'Choose a reply:';
  modalTitle.style.cssText = `
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #1c1e21;
  `;

  const closeButton = document.createElement('button');
  closeButton.textContent = '×';
  closeButton.style.cssText = `
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #657786;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  closeButton.addEventListener('click', () => {
    modalOverlay.remove();
  });

  modalHeader.appendChild(modalTitle);
  modalHeader.appendChild(closeButton);

  // Create reply options
  const repliesContainer = document.createElement('div');
  
  replies.forEach((reply, index) => {
    const replyOption = document.createElement('div');
    replyOption.style.cssText = `
      margin-bottom: 12px;
      border: 1px solid #e1e8ed;
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      transition: border-color 0.3s ease;
    `;

    const replyHeader = document.createElement('div');
    replyHeader.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background-color: #f7f9fa;
      border-bottom: 1px solid #e1e8ed;
    `;

    const replyLabel = document.createElement('span');
    replyLabel.textContent = reply.name;
    replyLabel.style.cssText = `
      font-weight: 500;
      font-size: 14px;
      color: #1c1e21;
    `;

    const selectButton = document.createElement('button');
    selectButton.textContent = 'Use This';
    selectButton.style.cssText = `
      background-color: #1da1f2;
      color: white;
      border: none;
      padding: 4px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
    `;

    const replyContent = document.createElement('div');
    replyContent.textContent = reply.content;
    replyContent.style.cssText = `
      padding: 12px;
      font-size: 14px;
      line-height: 1.4;
      color: #1c1e21;
    `;

    // Add click handlers
    const useReply = () => {
      insertReplyIntoTextarea(reply.content, dialog);
      modalOverlay.remove();
    };

    selectButton.addEventListener('click', (e) => {
      e.stopPropagation();
      useReply();
    });

    replyOption.addEventListener('click', useReply);

    replyOption.addEventListener('mouseenter', () => {
      replyOption.style.borderColor = '#1da1f2';
    });

    replyOption.addEventListener('mouseleave', () => {
      replyOption.style.borderColor = '#e1e8ed';
    });

    replyHeader.appendChild(replyLabel);
    replyHeader.appendChild(selectButton);
    replyOption.appendChild(replyHeader);
    replyOption.appendChild(replyContent);
    repliesContainer.appendChild(replyOption);
  });

  modalContent.appendChild(modalHeader);
  modalContent.appendChild(repliesContainer);
  modalOverlay.appendChild(modalContent);

  // Close modal when clicking overlay
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      modalOverlay.remove();
    }
  });

  document.body.appendChild(modalOverlay);
}

// Function to insert reply into textarea
function insertReplyIntoTextarea(replyText, dialog) {
  const replyBox = dialog.querySelector('div[data-testid="tweetTextarea_0"]');
  let targetReply = replyBox.querySelector('div[data-offset-key] span[data-text="true"]');
  
  if (!targetReply) {
    const container = replyBox.querySelector('div[data-offset-key]');
    targetReply = container?.querySelector('span[data-text="true"]') || container;
  }

  if (replyBox && targetReply) {
    targetReply.textContent = "";
    targetReply.appendChild(document.createTextNode(replyText));

    replyBox.dispatchEvent(new Event("input", { bubbles: true }));
    replyBox.dispatchEvent(new Event("change", { bubbles: true }));
    replyBox.focus();
  }
}

function addReplyButton(replyTextarea, replyContainer) {
  if (!replyContainer || replyContainer.querySelector(".generate-reply-button")) return;

  // Buat wrapper jika dibutuhkan
  const wrapper = document.createElement("div");
  wrapper.className = "ai-reply-button-wrapper";
  wrapper.style.cssText = `
    margin-top: 12px;
    text-align: left;
  `;

  const generateReplyButton = document.createElement("button");
  generateReplyButton.textContent = "Reply with AI";
  generateReplyButton.className = "generate-reply-button";

  generateReplyButton.style.cssText = `
    background-color: #1DA1F2;
    color: white;
    border: none;
    padding: 6px 16px;
    border-radius: 20px;
    cursor: pointer;
    font-size: 14px;
    font-family: 'Inter', sans-serif;
    transition: background-color 0.3s ease;
  `;

  generateReplyButton.addEventListener("mouseenter", () => {
    generateReplyButton.style.backgroundColor = "#137ebd";
  });

  generateReplyButton.addEventListener("mouseleave", () => {
    generateReplyButton.style.backgroundColor = "#1DA1F2";
  });

  const customPromptDropdown = document.createElement("select");
  customPromptDropdown.className = "custom-prompt-dropdown";
  customPromptDropdown.style.cssText = `
    background-color: #1DA1F2;
    color: white;
    border: none;
    padding: 9px 12px;
    border-radius: 20px;
    cursor: pointer;
    font-size: 14px;
    font-family: 'Inter', sans-serif;
    margin-left: 8px;
    transition: background-color 0.3s ease;
  `;

  function populateCustomPromptDropdown(customPrompts) {
    customPromptDropdown.innerHTML = '<option value="">None</option>'; // Default option
    if (customPrompts && customPrompts.length > 0) {
      customPrompts.forEach(prompt => {
        const option = document.createElement('option');
        option.value = prompt.content; // Store content in value
        option.textContent = prompt.title;
        customPromptDropdown.appendChild(option);
      });
    }
  }

  chrome.storage.sync.get(['customPrompts', 'defaultCustomPromptTitle'], (result) => {
    if (result.customPrompts) {
      populateCustomPromptDropdown(result.customPrompts);
      if (result.defaultCustomPromptTitle) {
        const defaultOption = Array.from(customPromptDropdown.options).find(
          option => option.textContent === result.defaultCustomPromptTitle
        );
        if (defaultOption) {
          customPromptDropdown.value = defaultOption.value;
        }
      }
    }
  });

  generateReplyButton.addEventListener("click", async () => {
    const article = replyContainer.closest("article");
    const dialog = replyContainer.closest('div[role="dialog"]');
    let postContent = "";

    // Ambil konten dari tweet
    if (article) {
      const contentDiv = article.querySelector("div[lang]");
      if (contentDiv) postContent = contentDiv.innerText;
    } else if (dialog) {
      const contentDiv = dialog.querySelector("div[lang]");
      if (contentDiv) postContent = contentDiv.innerText;
    }

    if (!postContent) postContent = "No content found";

    const selectedPrompt = customPromptDropdown.value;

    // Kirim ke background script
    chrome.runtime.sendMessage(
      { action: "generateReply", content: postContent, customPrompt: selectedPrompt },
      (response) => {
        console.log(`reply from ai`, response)
        if (response?.replies) {
          // Create reply selection modal
          showReplySelectionModal(response.replies, dialog);
        } else if (response?.error) {
          alert('Error generating reply: ' + response.error);
        }
      }
    );
  });

  wrapper.appendChild(generateReplyButton);
  wrapper.appendChild(customPromptDropdown);
  return wrapper; 
}

// Listen for messages (this part is fine)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPostContent") {
    let postContent = "";
    let postOrigin = "Unknown Origin"; // Initialize postOrigin
    const article = document.querySelector("article");
    const dialog = document.querySelector('div[role="dialog"]');

    if (article) {
      postContent = article.querySelector('[data-testid="tweetText"]')?.innerText || '';
      const authorHandleElement = article.querySelector('div[data-testid="User-Names"] a[role="link"] span'); // More robust selector for author handle
      if (authorHandleElement) {
        postOrigin = authorHandleElement.innerText;
      }
    } else if (dialog) {
      postContent = dialog.querySelector('[data-testid="tweetText"]')?.innerText || '';
      const authorHandleElement = dialog.querySelector('div[data-testid="User-Names"] a[role="link"] span'); // More robust selector for author handle in dialog
      if (authorHandleElement) {
        postOrigin = authorHandleElement.innerText;
      }
    }
    sendResponse({ content: postContent || "No content found", origin: postOrigin });
  } else if (request.action === "insertReply") {
    // This action is now handled by the modal selection
    // Keep for backward compatibility if needed
    const textarea = document.querySelector('textarea[placeholder*="Post your reply"]');
    if (textarea) {
      textarea.value = request.reply;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    }
    sendResponse({ status: "Reply inserted" });
  }
});

 function observeReplyTextareas() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            // Look for the reply textarea
            const replyTextarea = node.querySelector('textarea[placeholder*="Post your reply"]') || node.querySelector('div[data-testid="tweetTextarea_0"]');
            if (replyTextarea) {
              // Check if the replyTextarea is within a modal dialog
              const isModalReply = replyTextarea.closest('div[role="dialog"]');
              if (isModalReply) {
                // Ensure the button is not already added to this specific reply box
                if (!replyTextarea.dataset.yapButtonInitialized) {
                  replyTextarea.dataset.yapButtonInitialized = 'true'; // Mark as initialized
                  
                  const toolbar = isModalReply.querySelector('div[data-testid="toolBar"]');

                  if (toolbar && toolbar.parentElement) {
                    const buttonWrapper = addReplyButton(replyTextarea, replyTextarea.closest('[data-testid="tweetTextarea_0"]') || replyTextarea.parentElement);
                    if (buttonWrapper instanceof Node) {
                      toolbar.parentElement.insertBefore(buttonWrapper, toolbar);
                    }
                  }
                }
              }
            }
          }
        });
      }
    });
  });

  // Start observing the entire document body for changes
  observer.observe(document.body, { childList: true, subtree: true });
}

// Call this function when content.js loads
observeReplyTextareas();
