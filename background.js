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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'FETCH_EMAILS') {
    handleEmailFetch().then(sendResponse);
    return true;
  }
});

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
    
    return emails;
  } catch (error) {
    console.error('Detailed error:', error.message, error.stack); // Add this
    throw error;
  }
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