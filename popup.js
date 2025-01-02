document.getElementById('scan-button').addEventListener('click', async () => {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = 'Scanning your inbox...';

    // Example: Make API call to scan Gmail
    try {
        // Retrieve token (use OAuth2 or stored token)
        const accessToken = 'token'; // Replace with actual token

        // Call Gmail API to fetch messages
        const response = await fetch(
            'https://www.googleapis.com/gmail/v1/users/me/messages',
            {
                headers: { Authorization: `Bearer ${accessToken}` }
            }
        );

        const data = await response.json();
        const messages = data.messages || [];
        resultsDiv.innerHTML = `<p>Found ${messages.length} emails.</p>`;
    } catch (error) {
        resultsDiv.innerHTML = `<p>Error: ${error.message}</p>`;
    }
});
