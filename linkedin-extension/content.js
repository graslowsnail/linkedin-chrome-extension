let isScraping = true;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'stopScraping') {
    isScraping = false;
  }
});

(async function() {
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

  async function scrapeLikes() {
    const reactionButtonSelector = "li.social-details-social-counts__reactions button";
    const reactionButton = document.querySelector(reactionButtonSelector);

    if (!reactionButton) {
      alert('Reactions button not found');
      return;
    }

    reactionButton.scrollIntoView();
    reactionButton.click();
    await sleep(5000);

    let profileUrls = new Set();
    let previousHeight = 0;

    while (isScraping) {
      // Target only the links within the likes modal
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

      // Click "Load more" button if it exists
      const loadMoreButton = modal.querySelector('button.social-details-reactors-modal__show-more-button');
      if (loadMoreButton) {
        loadMoreButton.scrollIntoView();
        loadMoreButton.click();
        await sleep(2000); // Wait for new profiles to load
      } else {
        // Scroll within the modal to load more profiles
        modal.scrollBy(0, 200);
        await sleep(1000);

        const newHeight = modal.scrollHeight;
        if (newHeight === previousHeight) {
          break;
        }
        previousHeight = newHeight;
      }

      // Check if scraping has been stopped
      if (!isScraping) {
        console.log('Scraping stopped by user');
        break;
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

  scrapeLikes();
})();

