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
  await sleep(2000);

  let profileDetails = new Set();
  let previousHeight = 0;

  while (isScraping) {
    const modal = document.querySelector('div.social-details-reactors-modal__content');
    if (!modal) {
      break;
    }

    const profileElements = modal.querySelectorAll("a[href*='/in/']");
    profileElements.forEach(element => {
      const url = element.href;
      const name = element.querySelector('span[aria-hidden="true"]').innerText;
      if (url.startsWith('https://www.linkedin.com/in/')) {
        profileDetails.add(`${name}: ${url}`);
      }
    });

    const loadMoreButton = modal.querySelector('button.artdeco-button--muted');
    if (loadMoreButton) {
      loadMoreButton.scrollIntoView();
      loadMoreButton.click();
      await sleep(500);
    } else {
      modal.scrollBy(0, 200);
      await sleep(500);
      const newHeight = modal.scrollHeight;
      if (newHeight === previousHeight) {
        break;
      }
      previousHeight = newHeight;
    }
  }

  if (profileDetails.size > 0) {
    const profileDetailsArray = Array.from(profileDetails).map(detail => [detail]);
    downloadCSV(profileDetailsArray, 'linkedin_likes.csv');
    alert('Scraping complete! CSV file downloaded.');
  } else {
    alert('No profiles found or scraping stopped.');
  }
}

function injectActionButtons() {
  const postSelectors = "div.feed-shared-update-v2";
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
            actionButton.style.padding = '8px 12px';
            actionButton.style.backgroundColor = 'transparent';
            actionButton.style.color = 'inherit';
            actionButton.style.border = 'none';
            actionButton.style.cursor = 'pointer';
            actionButton.style.width = '100%';
            actionButton.style.textAlign = 'left';
            actionButton.style.fontSize = '14px';
            actionButton.style.fontWeight = '400';

            const img = document.createElement('img');
            img.src = chrome.runtime.getURL('system_tray_icon.png');
            img.alt = 'Extract Likes Icon';
            img.style.width = '20px';
            img.style.height = '20px';
            img.style.marginRight = '12px';

            const span = document.createElement('span');
            span.textContent = 'Extract Likes';

            actionButton.appendChild(img);
            actionButton.appendChild(span);

            actionButton.addEventListener('click', (e) => {
              e.stopPropagation();
              isScraping = true;
              scrapeLikes(post);
            });

            dropdownMenu.prepend(actionButton);
          }
        }, 500); // Adjust the timeout as necessary to wait for the dropdown to render
      });
    }
  });
}

injectActionButtons();
setInterval(injectActionButtons, 5000);

