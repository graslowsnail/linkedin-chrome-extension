chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'stopScraping') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'stopScraping' });
    });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('LinkedIn Scraper Extension Installed');
});

