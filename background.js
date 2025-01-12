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
  // Extract links using our previous function
  const urlRegex = /(https?:\/\/|www\.)[^\s<>"\(\)]+/gi;
  const matches = text.match(urlRegex) || [];
  
  const urls = matches.map(url => {
      if (url.startsWith('www.')) {
          return 'https://' + url;
      }
      return url;
  });

  let result = true;

  // If no URLs found, return early
  if (urls.length === 0) {
      return result;
  }

  // Process URLs sequentially
  // for (const url of urls) {
  //     try {
  //         // update it later
  //         const response = await fetch("https:?wdegjflb", {
  //             method: 'POST',
  //             headers: {
  //                 'Content-Type': 'application/json',
  //             },
  //             body: JSON.stringify({ url: url })
  //         });

  //         result = result && await response.json().result;

          
  //     } catch (error) {
  //         // Handle API call errors
  //         console.log("error: ", error);
  //     }
  // }

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
  if (!emails || emails.length === 0) {
    console.log("No emails to process");
    return;
  }

  emails.forEach(async (email) => {
    try {
      let bodyArr = email?.payload?.parts;
      let body = "";
      let subject = null;
      let from = null;

      if (bodyArr) {
        for (let i of bodyArr) {
          if (i?.body?.data) {
            body += i.body.data;
          }
        }
      }

      if (email?.payload?.headers) {
        for (let i of email.payload.headers) {
          if (i?.name === 'Subject') subject = i.value;
          if (i?.name === 'From') from = i.value;
        }
      }

      console.log("Processing email:", { subject, from });

      const result = false; // Your phishing detection logic here

      if (!result && subject && from) {
        // First try to find Gmail tabs
        findEmailByHeaders(subject, from);

      //   chrome.tabs.query({
      //     url: "https://mail.google.com/*"
      //   }, function(tabs) {
      //     console.log("Found Gmail tabs:", tabs);

      //     if (!tabs || tabs.length === 0) {
      //       // Fallback to active tab if no Gmail tabs found
      //       chrome.tabs.query({ active: true, currentWindow: true }, function(activeTabs) {
      //         console.log("Active tabs:", activeTabs);
      //         if (activeTabs && activeTabs.length > 0) {
      //           const activeTab = activeTabs[0];
      //           if (activeTab.url && activeTab.url.includes("mail.google.com")) {
      //             sendMessageToTab(activeTab, subject, from);
      //           } else {
      //             console.log("Active tab is not Gmail");
      //           }
      //         } else {
      //           console.log("No active tabs found");
      //         }
      //       });
      //     } else {
      //       // Send to all Gmail tabs
      //       tabs.forEach(tab => {
      //         sendMessageToTab(tab, subject, from);
      //       });
      //     }
      //   });
      }
    } catch (error) {
      console.error("Error processing email:", error);
    }
  });
}

// async function fetchEmails() {
//   try {
//     const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10', {
//       headers: {
//         'Authorization': `Bearer ${accessToken}`
//       }
//     });
    
//     if (response.status === 401) {
//       await refreshAuthToken();
//       return fetchEmails();
//     }

//     if (!response.ok) {
//       throw new Error(`Gmail API error: ${response.status}`);
//     }

//     const data = await response.json();
//     console.log(data);
//     return data.messages ? 
//       await Promise.all(data.messages.map(message => fetchEmailDetails(message.id))) : 
//       [];
//   } catch (error) {
//     console.error('Error fetching emails:', error);
//     throw error;
//   }
// }



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