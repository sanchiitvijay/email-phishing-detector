document.addEventListener('DOMContentLoaded', function() {
  const scanButton = document.getElementById('scanEmails');
  const statusDiv = document.getElementById('status');
  const scannedCount = document.getElementById('scannedCount');
  const phishingCount = document.getElementById('phishingCount');

  scanButton.addEventListener('click', async () => {
    statusDiv.textContent = 'Scanning emails...';
    scanButton.disabled = true;

    try {
      chrome.runtime.sendMessage({ type: 'FETCH_EMAILS' }, async (emails) => {
        if (chrome.runtime.lastError) {
          throw new Error(chrome.runtime.lastError.message);
        }

        statusDiv.textContent = 'Processing emails...';
        scannedCount.textContent = emails.length;

        // Create results with subject and from information
        const mockPhishingResults = emails.reduce((acc, email) => {
          const headers = email.payload.headers || [];
          acc[email.id] = {
            isPhishing: Math.random() > 0.8,
            subject: headers.find(h => h.name === 'Subject')?.value || '',
            from: headers.find(h => h.name === 'From')?.value || ''
          };
          return acc;
        }, {});

        const phishingEmails = Object.values(mockPhishingResults)
          .filter(result => result.isPhishing).length;
        phishingCount.textContent = phishingEmails;

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0]?.id, {
              type: 'PHISHING_RESULTS',
              results: mockPhishingResults
            });
          }
        });

        statusDiv.textContent = 'Scan complete!';
        scanButton.disabled = false;
      });
    } catch (error) {
      statusDiv.textContent = 'Error: ' + error.message;
      scanButton.disabled = false;
    }
  });
});