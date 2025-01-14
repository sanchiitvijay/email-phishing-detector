// chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
//   if (tab.url && tab.url.includes("https://mail.google.com")) {
//     console.log("in the loading tab---------------");
//     importScripts('content.js')
//   }
// })


let accessToken = null;


// Initialize authentication on extension load
chrome.runtime.onInstalled.addListener(() => {
  initializeAuth();
});

function initializeAuth() {
  console.log('Starting auth...'); // Add this
  chrome.identity.getAuthToken({ interactive: true }, function(token) {
    if (chrome.runtime.lastError) {
      console.error('Auth Error:', chrome.runtime.lastError.message);
      return;
    }
    accessToken = token;
    console.log('Token received:', token.substring(0, 5) + '...'); // Add this - only show first 5 chars for security
  });
}


// Refresh token if expired
function refreshAuthToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, function(token) {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError.message);
        return;
      }
      accessToken = token;
      resolve(token);
    });
  });
}



async function validateLinks(text) {
  console.log("validateLinks function: ",text)

  let result = true;

  // Process URLs sequentially
      try {
          // update it later
          const response = await fetch("http://13.61.146.108/check_url", {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({ body: text })
          });

          result = await response.json().result;

          
      } catch (error) {
          // Handle API call errors
          console.log("error: ", error);
      }

  return result;
}

// Add this at the top of background.js
let contentScriptReady = false;

// Listen for content script ready message
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CONTENT_SCRIPT_READY') {
    contentScriptReady = true;
    console.log('Content script is ready in tab:', sender.tab.id);
    sendResponse({ received: true });
  }
  return true;
});

// Modified sendMessageToTab function with retry logic
function sendMessageToTab(tab, subject, from, retryCount = 0) {
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second

  console.log(`Attempting to send message to tab ${tab.id}, retry: ${retryCount}`);

  chrome.tabs.sendMessage(
    tab.id,
    {
      type: 'HIGHLIGHT_EMAIL',
      data: { subject, from }
    },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error sending message:", chrome.runtime.lastError);
        
        // Retry logic
        if (retryCount < maxRetries) {
          console.log(`Retrying in ${retryDelay}ms...`);
          setTimeout(() => {
            sendMessageToTab(tab, subject, from, retryCount + 1);
          }, retryDelay);
        } else {
          console.error("Max retries reached for tab:", tab.id);
        }
        return;
      }
      console.log("Message sent successfully to tab:", tab.id);
    }
  );
}

function manipulatingEmails(emails) {
  console.log("Starting email manipulation with emails:", emails?.length);
  
  if (!emails || emails.length === 0) {
    console.log("No emails to process");
    return;
  }

  let phishingResults = {
    type: 'PHISHING_RESULTS',
    results: {}
  };

  emails.forEach(email => {
    try {
      let subject = null;
      let from = null;

      if (email?.payload?.headers) {
        for (let i of email.payload.headers) {
          if (i?.name === 'Subject') subject = i.value;
          if (i?.name === 'From') from = i.value;
        }
      }

      // Extract email address from the "from" field
      const fromEmail = from?.match(/<(.+?)>/)?.[1] || from;

      // extract the body 
      arr = []
      for(i in email?.payload?.parts){
        arr.push(i?.body?.data);
      }
      // Check if email is phishing
      const isPhishing = validateLinks(arr);

      console.log("Processing email:", {
        id: email.id,
        subject,
        from: fromEmail,
        isPhishing
      });

      if (subject && fromEmail) {
        phishingResults.results[email.id] = {
          isPhishing,
          subject: subject.trim(),
          from: fromEmail.trim(),
          id: email.id
        };
      }
    } catch (error) {
      console.error("Error processing email:", error);
    }
  });

  // Log the final results
  console.log("Final phishing results:", JSON.stringify(phishingResults, null, 2));

  // Send results to content script
  chrome.tabs.query({ url: "https://mail.google.com/*" }, function(tabs) {
    if (tabs.length === 0) {
      chrome.tabs.query({ active: true, currentWindow: true }, function(activeTabs) {
        if (activeTabs && activeTabs.length > 0) {
          sendResultsToTab(activeTabs[0], phishingResults);
        }
      });
    } else {
      tabs.forEach(tab => {
        console.log("Sending results to Gmail tab:", tab.id);
        sendResultsToTab(tab, phishingResults);
      });
    }
  });
}

function checkPhishing(subject, from) {
  // Keywords that might indicate phishing
  const suspiciousKeywords = [
    'hiring',
    'remote work',
    'work from home',
    'job',
    'opportunity',
    'apply now',
    'freelancer',
    'multiple roles',
    'entry level'
  ];

  // Suspicious sender domains
  const suspiciousDomains = [
    'noreply',
    'newsletters-noreply',
    'notifications-noreply',
    'groups-noreply'
  ];

  // Check if subject contains suspicious keywords
  const hasKeyword = suspiciousKeywords.some(keyword => 
    subject.toLowerCase().includes(keyword.toLowerCase())
  );

  // Check if sender contains suspicious patterns
  const hasSuspiciousSender = suspiciousDomains.some(domain => 
    from.toLowerCase().includes(domain.toLowerCase())
  );

  // Mark as phishing if both conditions are met
  return hasKeyword && hasSuspiciousSender;
}

function sendResultsToTab(tab, results) {
  console.log("Sending to tab:", tab.id, "Results:", JSON.stringify(results, null, 2));
  
  chrome.tabs.sendMessage(tab.id, results, response => {
    if (chrome.runtime.lastError) {
      console.error("Error sending results:", chrome.runtime.lastError);
    } else {
      console.log("Results sent successfully to tab:", tab.id);
    }
  });
}




async function fetchEmailDetails(messageId) {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  console.log(response);
  return await response.json();
}



async function fetchEmails() {
  try {
    console.log('Fetching with token:', accessToken); // Add this

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'  // Add this
      }
    });
    
    console.log('Response status:', response.status); // Add this
    
    if (response.status === 401) {
      console.log('Token expired, refreshing...'); // Add this
      await refreshAuthToken();
      return fetchEmails();
    }

    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Raw messages data:', data);

    if (!data.messages) {
      console.log('No messages found'); // Add this
      return [];
    }
    
    const emails = await Promise.all(data.messages.map(async message => {
      console.log('Fetching details for message:', message?.id); // Add this
      const details = await fetchEmailDetails(message?.id);
      return details;
    }));

    console.log('Final processed emails:', emails); // Add this
    // Calling function here
    manipulatingEmails(emails);
    
    return emails;
  } catch (error) {
    console.error('Detailed error:', error.message, error.stack); // Add this
    throw error;
  }
}



async function handleEmailFetch() {
  if (!accessToken) {
    try {
      await refreshAuthToken();
    } catch (error) {
      throw new Error('Authentication failed');
    }
  }
  return fetchEmails();
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'FETCH_EMAILS') {
    handleEmailFetch().then(sendResponse);
    return true;
  }
});