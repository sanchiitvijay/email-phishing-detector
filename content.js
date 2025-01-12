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
  console.log('Searching for email:', { subject, from });

  // Get all email rows
  const emailRows = document.querySelectorAll('tr.zA');
  console.log(`Found ${emailRows.length} email rows`);

  // Search through rows
  const matchingRow = Array.from(emailRows).find(row => {
    // Get subject and sender elements
    const subjectEl = row.querySelector('.y6');
    const fromEl = row.querySelector('.yX, .zF');

    // Log the elements for debugging
    console.log('Checking row elements:', {
      subjectElement: subjectEl?.textContent,
      fromElement: fromEl?.textContent
    });

    if (!subjectEl || !fromEl) {
      console.log('Missing subject or from element');
      return false;
    }

    // Check if subject and sender match
    const subjectMatch = subjectEl.textContent.includes(subject);
    const fromMatch = fromEl.textContent.includes(from);

    console.log('Matching results:', {
      subject: subjectMatch,
      from: fromMatch,
      rowSubject: subjectEl.textContent,
      rowFrom: fromEl.textContent
    });

    return subjectMatch && fromMatch;
  });

  // If email found, add warning class
  if (matchingRow) {
    console.log('Found matching email, adding warning class');
    matchingRow.classList.add('phishing-warning');
    
    // Add warning icon
    const firstCell = matchingRow.querySelector('td');
    if (firstCell && !firstCell.querySelector('.phishing-icon')) {
      const warningIcon = document.createElement('span');
      warningIcon.className = 'phishing-icon';
      warningIcon.innerHTML = '⚠️';
      warningIcon.title = 'Potential phishing attempt detected';
      firstCell.insertBefore(warningIcon, firstCell.firstChild);
    }
    
    return matchingRow;
  } else {
    console.log('No matching email found');
    return null;
  }
}

// Function to process phishing results
function processPhishingResults(phishingResults) {
  if (!phishingResults) {
    console.log('No phishing results to process');
    return;
  }
  
  console.log('Processing phishing results:', phishingResults);

  Object.entries(phishingResults).forEach(([id, result]) => {
    if (result.isPhishing) {
      const emailRow = findEmailByHeaders(result.subject, result.from);
      if (emailRow && !emailRow.classList.contains('phishing-warning')) {
        emailRow.classList.add('phishing-warning');
        console.log('Added phishing warning to email:', result.subject);
      }
    }
  });
}


// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request);

  if (request.type === 'HIGHLIGHT_EMAIL') {
    console.log('Processing highlight email request:', request.data);
    const { subject, from } = request.data;
    findEmailByHeaders(subject, from);
  }

  if (request.type === 'PHISHING_RESULTS') {
    console.log('Processing phishing results');
    window.lastPhishingResults = request.results;
    processPhishingResults(request.results);
  }

  // Return true to indicate async response
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
    background-color: rgba(255, 0, 0, 0.1) !important;
  }
  .phishing-icon {
    margin-right: 8px;
    cursor: help;
  }
`;
document.head.appendChild(style);