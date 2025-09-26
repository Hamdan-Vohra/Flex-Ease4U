(() => {
  console.log("Background script loaded");
})();
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getContent") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        sendResponse({
          success: false,
          error: "No active tab found.",
        });
        return;
      }
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id },
          func: () => document.documentElement.outerHTML,
        },
        (results) => {
          if (chrome.runtime.lastError) {
            sendResponse({
              success: false,
              error: chrome.runtime.lastError.message,
            });
            return;
          }
          sendResponse({
            success: true,
            content: results[0].result,
            url: tabs[0].url,
          });
        }
      );
    });
    return true;
  }
});
