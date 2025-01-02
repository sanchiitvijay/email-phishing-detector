function authenticateWithGmail() {
    const CLIENT_ID = 'ID';
    const REDIRECT_URI = 'https://<EXTENSION_ID>.chromiumapp.org/';
    const SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=token&scope=${SCOPE}`;
    window.open(authUrl, '_blank');
}
