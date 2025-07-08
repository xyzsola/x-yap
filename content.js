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

    // Kirim ke background script
    chrome.runtime.sendMessage(
      { action: "generateReply", content: postContent },
      (response) => {
        console.log(`reply from ai`, response)
        if (response?.reply) {
          const replyBox = dialog.querySelector('div[data-testid="tweetTextarea_0"]');
          let targetReply = replyBox.querySelector('div[data-offset-key] span[data-text="true"]');
          
          if (!targetReply) {
            const container = replyBox.querySelector('div[data-offset-key]');
            targetReply = container?.querySelector('span[data-text="true"]') || container;
          }

          if (replyBox) {
            targetReply.textContent = "";
            targetReply.appendChild(document.createTextNode(response.reply));

            // replyBox.value = response.reply;
            replyBox.dispatchEvent(new Event("input", { bubbles: true }));
            replyBox.dispatchEvent(new Event("change", { bubbles: true }));
            replyBox.focus();
          }
        }
      }
    );
  });

  wrapper.appendChild(generateReplyButton);
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