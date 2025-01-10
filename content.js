// Add observer to handle Gmail's dynamic loading
let observer = null;

function initializeGmailObserver() {
  if (observer) {
    observer.disconnect();
  }

  const container = document.querySelector('.AO');
  if (!container) {
    setTimeout(initializeGmailObserver, 1000);
    return;
  }

  observer = new MutationObserver(() => {
    const results = document.querySelector('.phishing-warning');
    if (results) {
      processPhishingResults(window.lastPhishingResults);
    }
  });

  observer.observe(container, {
    childList: true,
    subtree: true
  });
}

function findEmailByHeaders(subject, from) {
  const emailRows = document.querySelectorAll('tr.zA');
  return Array.from(emailRows).find(row => {
    // Updated selectors to match Gmail's current structure
    const subjectEl = row.querySelector('.y6');
    const fromEl = row.querySelector('.yX, .zF');
    if (!subjectEl || !fromEl) return false;
    
    return subjectEl.textContent.includes(subject) && 
           fromEl.textContent.includes(from);
  });
}

function processPhishingResults(phishingResults) {
  if (!phishingResults) return;
  
  Object.entries(phishingResults).forEach(([id, result]) => {
    if (result.isPhishing) {
      const emailRow = findEmailByHeaders(result.subject, result.from);
      if (emailRow && !emailRow.classList.contains('phishing-warning')) {
        emailRow.classList.add('phishing-warning');
      }
    }
  });
}

// Store results for reprocessing if needed
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'PHISHING_RESULTS') {
    window.lastPhishingResults = request.results;
    processPhishingResults(request.results);
  }
});

// Initialize observer when script loads
initializeGmailObserver();

// Reinitialize when Gmail changes views
window.addEventListener('popstate', initializeGmailObserver);
window.addEventListener('pushstate', initializeGmailObserver);