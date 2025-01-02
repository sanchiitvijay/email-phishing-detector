async function fetchEmails(accessToken) {
    const response = await fetch(
        'https://www.googleapis.com/gmail/v1/users/me/messages',
        {
            headers: { Authorization: `Bearer ${accessToken}` },
        }
    );

    const data = await response.json();
    return data.messages || [];
}

async function fetchEmailContent(messageId, accessToken) {
    const response = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
        {
            headers: { Authorization: `Bearer ${accessToken}` },
        }
    );

    const data = await response.json();
    const emailBody = atob(data.payload.parts[0].body.data);
    return emailBody;
}


function extractLinksFromText(text) {
    const linkRegex = /https?:\/\/[^\s]+/g;
    return text.match(linkRegex) || [];
}

async function checkLinks(links) {
    return await Promise.all(
        links.map(async (link) => {
            console.log('Checking link:', link);
            // const response = await fetch('https://your-physy-api.com/check', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ url: link }),
            // });
            // const data = await response.json();
            return { link, status: 1 }; // result: 0 or 1
        })
    );
}




function displayStatusOnUI(results) {
    results.forEach(({ link, status }) => {
        const linkElements = document.querySelectorAll(`a[href="${link}"]`);
        linkElements.forEach((linkElement) => {
            const badge = document.createElement('span');
            badge.textContent = status === 1 ? '✅ Physy' : '❌ Not Physy';
            badge.style.color = status === 1 ? 'green' : 'red';
            badge.style.marginLeft = '5px';
            linkElement.after(badge);
        });
    });
}

// Workflow Example
(async function () {
    const accessToken = 'token'; // Get this from OAuth
    const emails = await fetchEmails(accessToken);

    for (let email of emails.slice(0, 5)) {
        const content = await fetchEmailContent(email.id, accessToken);
        const links = extractLinksFromText(content);
        const results = await checkLinks(links);
        displayStatusOnUI(results);
    }
})();
