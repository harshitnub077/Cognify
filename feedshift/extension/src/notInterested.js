// notInterested.js — automates "Not Interested" clicks on YouTube

let queue = [];
let isProcessing = false;
let signalsSentThisPage = 0;

const MAX_SIGNALS_PER_PAGE = 4;

/**
 * Queues a video card for automated "Not Interested" signal.
 * @param {Element} card The DOM element for the video card
 * @param {import('../../shared/types/profile.js').VideoMetadata} videoMetadata
 * @param {number} currentTrust Current trust score of the channel
 */
function queueNotInterested(card, videoMetadata, currentTrust = 50) {
  // Skip if already blacklisted (15 to 5). If < 5, we do "Don't recommend channel"
  if (currentTrust >= 5 && currentTrust < 15) {
    return;
  }
  
  queue.push({ card, videoMetadata, currentTrust });
  processNIQueue();
}

/**
 * Processes the queue sequentially with human-like delays.
 */
async function processNIQueue() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    while (queue.length > 0) {
      if (signalsSentThisPage >= MAX_SIGNALS_PER_PAGE) {
        console.log('[FeedShift] Max NI signals reached for this page load. Skipping remainder.');
        queue = [];
        break;
      }

      const { card, videoMetadata, currentTrust } = queue.shift();
      
      // Random delay 2000-4500ms
      const delay = Math.floor(Math.random() * 2500) + 2000;
      await sleep(delay);

      const success = await executeNotInterestedFlow(card, currentTrust < 5);
      
      if (success) {
        signalsSentThisPage++;
        await updateProfileAndLog(videoMetadata);
      }
    }
  } catch (err) {
    console.error('[FeedShift] NI Queue processing error:', err);
  } finally {
    isProcessing = false;
  }
}

async function executeNotInterestedFlow(card, useDontRecommend) {
  try {
    // 1. Hover
    card.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true }));
    await sleep(300);

    // 2 & 3. Find 3-dot menu
    let menuBtn = card.querySelector('button[aria-label*="More"], button[aria-label*="Action menu"]');
    
    // 4. Fallback selector
    if (!menuBtn) {
      menuBtn = card.querySelector('button.yt-icon-button');
    }

    if (!menuBtn) return false;

    // Click menu
    menuBtn.click();
    
    // 5. Wait for menu
    await sleep(200);

    // 6. Find menu items (query document.body because menus are attached to body in YT SPA)
    const menuItems = document.querySelectorAll('ytd-menu-service-item-renderer, tp-yt-paper-item');
    if (!menuItems || menuItems.length === 0) {
      document.body.click(); // dismiss
      return false;
    }

    // 7. Search for specific text
    const targetText = useDontRecommend ? "don't recommend channel" : "not interested";
    let targetItem = null;

    for (const item of menuItems) {
      const text = (item.textContent || '').trim().toLowerCase();
      if (text.includes(targetText)) {
        targetItem = item;
        break;
      }
    }

    if (!targetItem) {
      document.body.click(); // dismiss
      return false;
    }

    // 8. Click it
    targetItem.click();
    await sleep(200);

    // 9. Dismiss toast if present
    const toastBtn = document.querySelector('#toast button, ytd-toast-renderer button');
    if (toastBtn) {
      toastBtn.click();
    }

    return true;
  } catch (err) {
    // 11. Abort silently on DOM errors
    return false;
  }
}

async function updateProfileAndLog(videoMetadata) {
  try {
    const { feedshift_profile: profile } = await chrome.storage.local.get('feedshift_profile');
    if (!profile) return;

    // Lower channel trust by 8 points
    const channelLower = videoMetadata.channel.toLowerCase();
    const currentTrust = profile.channelTrust?.[channelLower] ?? 50;
    
    if (!profile.channelTrust) profile.channelTrust = {};
    profile.channelTrust[channelLower] = Math.max(0, currentTrust - 8);

    await chrome.storage.local.set({ feedshift_profile: profile });
  } catch (err) {
    console.warn('[FeedShift] Failed to update profile after NI', err);
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Reset signals counter on URL navigation (YouTube SPA)
window.addEventListener('yt-navigate-start', () => {
  signalsSentThisPage = 0;
});
