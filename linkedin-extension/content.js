let isScraping = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startScraping') {
    isScraping = true;
    scrapeLikes();
  } else if (message.action === 'stopScraping') {
    isScraping = false;
  }
});

async function scrapeLikes() {
  if (!isScraping) return;

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function downloadCSV(data, filename = 'data.csv') {
    const csvContent = data.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const reactionButtonSelector = "li.social-details-social-counts__reactions button";
  const reactionButton = document.querySelector(reactionButtonSelector);

  if (!reactionButton) {
    alert('Reactions button not found');
    return;
  }

  reactionButton.scrollIntoView();
  reactionButton.click();
  await sleep(2000); // Reduced initial wait time

  let profileUrls = new Set();
  let previousHeight = 0;

  while (isScraping) {
    const modal = document.querySelector('div.social-details-reactors-modal__content');
    if (!modal) {
      break;
    }

    const profileElements = modal.querySelectorAll("a[href*='/in/']");
    profileElements.forEach(element => {
      const url = element.href;
      if (url.startsWith('https://www.linkedin.com/in/')) {
        profileUrls.add(url);
      }
    });

    const loadMoreButton = modal.querySelector('button.artdeco-button--muted');
    if (loadMoreButton) {
      loadMoreButton.scrollIntoView();
      loadMoreButton.click();
      await sleep(500); // Reduced wait time after clicking the load more button
    } else {
      modal.scrollBy(0, 200);
      await sleep(500); // Reduced wait time after scrolling

      const newHeight = modal.scrollHeight;
      if (newHeight === previousHeight) {
        break;
      }
      previousHeight = newHeight;
    }
  }

  if (profileUrls.size > 0) {
    const profileUrlsArray = Array.from(profileUrls).map(url => [url]);
    downloadCSV(profileUrlsArray, 'linkedin_likes.csv');
    alert('Scraping complete! CSV file downloaded.');
  } else {
    alert('No profiles found or scraping stopped.');
  }
}

