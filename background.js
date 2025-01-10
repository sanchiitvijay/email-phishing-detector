let accessToken = null;


chrome.runtime.onInstalled.addListener(() => {
  initializeAuth();
});

function initializeAuth() {
  chrome.identity.getAuthToken({ interactive: true }, function(token) {
    if (chrome.runtime.lastError) {
      console.error('Auth Error:', chrome.runtime.lastError.message);
      return;
    }
    accessToken = token;
    console.log('Authentication successful');
  });
}

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



async function fetchEmails() {
    try {
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (response.status === 401) {
        await refreshAuthToken();
        return fetchEmails();
      }
  
      if (!response.ok) {
        throw new Error(`Gmail API error: ${response.status}`);
      }
  
      const data = await response.json();
      console.log('Raw messages data:', data);
  
      if (!data.messages) return [];
      
      const emails = await Promise.all(data.messages.map(message => fetchEmailDetails(message.id)));
      console.log('Processed emails:', emails.map(email => ({
        id: email.id,
        subject: email.payload.headers.find(h => h.name === 'Subject')?.value,
        from: email.payload.headers.find(h => h.name === 'From')?.value,
        snippet: email.snippet
      })));
      
      return emails;
    } catch (error) {
      console.error('Error fetching emails:', error);
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