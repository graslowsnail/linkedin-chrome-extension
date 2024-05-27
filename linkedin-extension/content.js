let isScraping = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startScraping') {
    isScraping = true;
    scrapeLikes(message.post);
  } else if (message.action === 'stopScraping') {
    isScraping = false;
  } else if (message.action === 'injectButtons') {
    injectActionButtons();
  }
});

async function scrapeLikes(post) {
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
  const reactionButton = post.querySelector(reactionButtonSelector);

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

function injectActionButtons() {
  const postSelectors = "div.feed-shared-update-v2"; // Update this selector based on LinkedIn's current structure
  const posts = document.querySelectorAll(postSelectors);

  posts.forEach(post => {
    const threeDotsButton = post.querySelector('button.feed-shared-control-menu__trigger');
    if (threeDotsButton) {
      threeDotsButton.addEventListener('click', () => {
        setTimeout(() => {
          const dropdownMenu = post.querySelector('div.feed-shared-control-menu__content');
          if (dropdownMenu && !dropdownMenu.querySelector('.scrape-action-button')) {
            const actionButton = document.createElement('button');
            actionButton.className = 'scrape-action-button';
            actionButton.style.display = 'flex';
            actionButton.style.alignItems = 'center';
            actionButton.style.padding = '8px 12px'; // Adjust padding to match other menu items
            actionButton.style.backgroundColor = 'transparent'; // Make background transparent
            actionButton.style.color = 'inherit'; // Inherit text color
            actionButton.style.border = 'none';
            actionButton.style.cursor = 'pointer';
            actionButton.style.width = '100%';
            actionButton.style.textAlign = 'left'; // Align text to the left
            actionButton.style.fontSize = '14px'; // Match text size
            actionButton.style.fontWeight = '400'; // Match font weight

            const img = document.createElement('img');
            img.src = chrome.runtime.getURL('system_tray_icon.png');
            img.alt = 'Extract Likes Icon';
            img.style.width = '20px'; // Increase image size
            img.style.height = '20px'; // Increase image size
            img.style.marginRight = '12px'; // Adjust margin to match other items

            const span = document.createElement('span');
            span.textContent = 'Extract Likes';

            actionButton.appendChild(img);
            actionButton.appendChild(span);

            actionButton.addEventListener('click', (e) => {
              e.stopPropagation();
              isScraping = true;
              scrapeLikes(post);
            });

            dropdownMenu.prepend(actionButton); // Prepend the action button to the dropdown menu
          }
        }, 500); // Adjust the timeout as necessary to wait for the dropdown to render
      });
    }
  });
}

// Inject buttons on initial load
injectActionButtons();

// Optionally, you can set an interval to inject buttons periodically if posts are dynamically loaded
setInterval(injectActionButtons, 5000);

