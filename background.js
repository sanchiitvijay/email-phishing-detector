let accessToken = null;
//content.js file data----------------------------------------
// chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
//   if (tab.url && tab.url.includes("https://mail.google.com")) {
    
//     let observer = null;
    
//     function initializeGmailObserver() {
//       if (observer) {
//         observer.disconnect();
//       }
      
//       const container = document.querySelector('.AO');
//       if (!container) {
//         setTimeout(initializeGmailObserver, 1000);
//         return;
//       }
      
//       observer = new MutationObserver(() => {
//     const results = document.querySelector('.phishing-warning');
//     if (results) {
//       processPhishingResults(window.lastPhishingResults);
//     }
//   });

//   observer.observe(container, {
//     childList: true,
//     subtree: true
//   });
// }

// function findEmailByHeaders(subject, from) {
//   const emailRows = document.querySelectorAll('tr.zA');
//   return Array.from(emailRows).find(row => {
//     // Updated selectors to match Gmail's current structure
//     const subjectEl = row.querySelector('.y6');
//     const fromEl = row.querySelector('.yX, .zF');
//     if (!subjectEl || !fromEl) return false;
    
//     console.log("subject and from", subjectEl, fromEl);
    
//     return subjectEl.textContent.includes(subject) && 
//     fromEl.textContent.includes(from);
//   });
// }

// function processPhishingResults(phishingResults) {
//   if (!phishingResults) return;
  
//   Object.entries(phishingResults).forEach(([id, result]) => {
//     if (result.isPhishing) {
//       const emailRow = findEmailByHeaders(result.subject, result.from);
//       if (emailRow && !emailRow.classList.contains('phishing-warning')) {
//         emailRow.classList.add('phishing-warning');
//       }
//     }
//   });
// }

// // Store results for reprocessing if needed
// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   if (request.type === 'PHISHING_RESULTS') {
//     window.lastPhishingResults = request.results;
//     processPhishingResults(request.results);
//   }
// });

// // Initialize observer when script loads
// initializeGmailObserver();

// // Reinitialize when Gmail changes views
// window.addEventListener('popstate', initializeGmailObserver);
// window.addEventListener('pushstate', initializeGmailObserver);


// }
// })

//------------------------------------------------------------



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

function manipulatingEmails(emails) {

  emails.map(email => {
    let bodyArr = email?.payload?.parts;
    let body = "";
    console.log("email data",  email);
    for (let i of bodyArr) {
      if (i?.body?.data) {
        body += i.body.data; 
      }
    }
    console.log("body data: ", body);
    let subject = null; 
    let from = null;
    console.log(email?.payload?.headers)
    for(let i of email?.payload?.headers) {
      if(i?.name == 'Subject') subject = i?.value;
      if(i?.name == 'From') from = i?.value;
    }
    console.log("other data: ", subject, from);


    // Convert base64url to base64
    // let base64Data = body?.replace(/-/g, '+')?.replace(/_/g, '/');
    // // Decode from base64 to original content
    // let decodedContent = atob(base64Data);
    // console.log("decoded data: ", decodedContent);
    // const result = validateLinks(decodedContent);

    const result = false;

    if(!result && subject && from) {
      // Send message to content script to highlight the email
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'HIGHLIGHT_EMAIL',
          data: { subject, from }
        });
      });
    }
  })

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
      console.log('Fetching details for message:', message.id); // Add this
      const details = await fetchEmailDetails(message.id);
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