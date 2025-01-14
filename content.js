//---------------------------------------


// Add this at the start of content.js, right after your variable declarations
console.log('Content script starting...');

// Function to announce content script is ready
function announceContentScriptReady() {
  chrome.runtime.sendMessage({ 
    type: 'CONTENT_SCRIPT_READY' 
  }, response => {
    if (chrome.runtime.lastError) {
      console.error('Error announcing ready state:', chrome.runtime.lastError);
      // Retry after a delay
      setTimeout(announceContentScriptReady, 1000);
    } else {
      console.log('Successfully announced content script ready state');
    }
  });
}

// Call it after DOM is ready
if (document.readyState === 'complete') {
  announceContentScriptReady();
} else {
  document.addEventListener('DOMContentLoaded', announceContentScriptReady);
}

//---------------------------------------



// Global observer to handle Gmail's dynamic loading
let observer = null;

// Function to initialize the Gmail observer
function initializeGmailObserver() {
  // Disconnect existing observer if any
  if (observer) {
    observer.disconnect();
  }

  // Find the Gmail container
  const container = document.querySelector('.AO');
  if (!container) {
    // If container not found, retry after a delay
    console.log('Gmail container not found, retrying...');
    setTimeout(initializeGmailObserver, 1000);
    return;
  }

  // Create new observer
  observer = new MutationObserver((mutations) => {
    const phishingWarnings = document.querySelectorAll('.phishing-warning');
    if (phishingWarnings.length > 0) {
      processPhishingResults(window.lastPhishingResults);
    }
  });

  // Start observing the container
  observer.observe(container, {
    childList: true,
    subtree: true
  });
  
  console.log('Gmail observer initialized');
}

// Function to find email by subject and sender
function findEmailByHeaders(subject, from) {
  console.log('Finding email:', { subject, from });

  // Get all possible email row elements
  const selectors = [
    'tr.zA',
    'tr.zE',
    'tr[role="row"]',
    '.zA[role="row"]',
    'div[role="row"]'
  ];

  let allRows = [];
  selectors.forEach(selector => {
    const rows = document.querySelectorAll(selector);
    console.log(`Found ${rows.length} rows with selector: ${selector}`);
    allRows = [...allRows, ...Array.from(rows)];
  });

  // Remove duplicates
  allRows = [...new Set(allRows)];
  console.log(`Total unique email rows found: ${allRows.length}`);

  // Find the matching email
  for (const row of allRows) {
    try {
      // Try different ways to get subject and sender
      const subjectElement = row.querySelector('[data-thread-id] [email]') || 
                            row.querySelector('[data-thread-id] span') ||
                            row.querySelector('span[data-thread-id]') ||
                            row.querySelector('[data-legacy-thread-id]') ||
                            row.querySelector('[data-tooltip]');

      const fromElement = row.querySelector('[email]') ||
                         row.querySelector('.yP, .zF') ||
                         row.querySelector('[name="from"]') ||
                         row.querySelector('[data-hovercard-id]');

      if (!subjectElement || !fromElement) {
        continue;
      }

      const rowSubject = (subjectElement.getAttribute('data-tooltip') || 
                         subjectElement.textContent || '').trim();
      const rowFrom = (fromElement.getAttribute('email') || 
                      fromElement.getAttribute('name') || 
                      fromElement.textContent || '').trim();

      console.log('Checking row:', { rowSubject, rowFrom });

      // Check if this row matches our email
      if (rowSubject.includes(subject) || subject.includes(rowSubject) ||
          rowFrom.includes(from) || from.includes(rowFrom)) {
        console.log('Found matching email row:', row);
        return row;
      }
    } catch (error) {
      console.error('Error processing row:', error);
    }
  }

  console.log('Could not find matching email row in DOM');
  return null;
}

// Function to highlight suspicious links in an email
function highlightSuspiciousLinks(emailRow, links) {
  if (!links || !links.length) return;

  // Find all links in the email row
  const linkElements = emailRow.querySelectorAll('a[href]');
  
  linkElements.forEach(linkEl => {
    const href = linkEl.href;
    // Find if this link is marked as suspicious
    const suspiciousLink = links.find(link => 
      href.includes(link.url) && link.suspicious
    );

    if (suspiciousLink) {
      console.log('Found suspicious link:', href);
      linkEl.classList.add('suspicious-link');
      linkEl.title = 'This link may be suspicious';
    }
  });
}

// Function to process phishing results
function processPhishingResults(response) {
  console.log('Processing phishing results:', JSON.stringify(response, null, 2));

  if (!response || !response.results) {
    console.log('No valid phishing results to process');
    return;
  }

  const results = response.results;
  const resultCount = Object.keys(results).length;
  console.log(`Processing ${resultCount} results`);

  Object.values(results).forEach((result, index) => {
    console.log(`Processing result ${index + 1}/${resultCount}:`, result);
    
    if (result.isPhishing) {
      console.log('Found phishing email:', result);
      const emailRow = findEmailByHeaders(result.subject, result.from);
      if (emailRow) {
        console.log('Successfully highlighted email');
        emailRow.style.backgroundColor = '#ffebee';
        emailRow.style.borderLeft = '4px solid #f44336';
        
        // Add a warning icon
        const warningIcon = document.createElement('span');
        warningIcon.innerHTML = '⚠️';
        warningIcon.style.marginRight = '8px';
        warningIcon.title = 'Potential phishing email';
        
        // Insert the warning icon at the beginning of the row
        const firstCell = emailRow.querySelector('td');
        if (firstCell) {
          firstCell.insertBefore(warningIcon, firstCell.firstChild);
        }
      } else {
        console.log('Could not find matching email row in DOM');
      }
    }
  });
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', JSON.stringify(request, null, 2));

  if (request.type === 'PHISHING_RESULTS') {
    processPhishingResults(request);
    sendResponse({ status: 'processed' });
  }

  return true;
});

// Initialize observer when script loads
console.log('Content script loaded, initializing observer');
initializeGmailObserver();

// Reinitialize when Gmail changes views
window.addEventListener('popstate', () => {
  console.log('Navigation detected, reinitializing observer');
  initializeGmailObserver();
});

window.addEventListener('pushstate', () => {
  console.log('Navigation detected, reinitializing observer');
  initializeGmailObserver();
});

// Add styles for phishing warnings
const style = document.createElement('style');
style.textContent = `
  .phishing-warning {
    background-color: #ffebee !important;
    border-left: 4px solid #f44336 !important;
    transition: background-color 0.3s ease !important;
  }
  
  .phishing-warning:hover {
    background-color: #ffcdd2 !important;
  }
  
  .phishing-icon {
    margin-right: 8px;
    cursor: help;
    display: inline-flex;
    align-items: center;
    font-size: 16px;
    color: #f44336;
  }

  .suspicious-link {
    background-color: #fff3cd !important;
    border: 1px solid #ffeeba !important;
    padding: 2px 4px !important;
    border-radius: 3px !important;
    position: relative !important;
  }

  .suspicious-link::after {
    content: '⚠️';
    margin-left: 4px;
    font-size: 12px;
  }

  .suspicious-link:hover::before {
    content: 'Suspicious link detected';
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    white-space: nowrap;
    z-index: 1000;
  }
`;
document.head.appendChild(style);
