// Initialize extension on install
chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed.");
    chrome.storage.local.set({ tabGroups: [] });
  });
  
  // Listen for tab updates
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") {
      console.log(`Tab loaded: ${tab.url}`);
    }
  });
  
  // Handle messages from popup.js
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getTabInfo") {
      chrome.tabs.query({ currentWindow: true }, (tabs) => {
        sendResponse(tabs);
      });
      return true; // Keeps the message channel open for async response
    }
  });
  
  // Listen for extension icon clicks
  chrome.action.onClicked.addListener(() => {
    chrome.runtime.openPopup();
    console.log("Extension icon clicked.");
  });

  chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ tabGroups: {} }, () => {
        console.log('Tab groups initialized.');
    });
});
  
chrome.action.onClicked.addListener(() => {
    chrome.windows.create({
      url: "popup.html",
      type: "popup",
      width: 800, // Custom width
      height: 600 // Custom height
    });
  });