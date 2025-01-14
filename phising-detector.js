class PhishingDetector {
  constructor() {
    this.MODEL_API_ENDPOINT = 'YOUR_MODEL_ENDPOINT';
  }

  async preprocessEmail(email) {
    const headers = email.payload.headers;
    const from = headers.find(h => h.name === 'From')?.value || '';
    const subject = headers.find(h => h.name === 'Subject')?.value || '';
    const body = this.getEmailBody(email.payload);

    return {
      from,
      subject,
      body,
      messageId: email?.id
    };
  }

  getEmailBody(payload) {
    if (payload.parts) {
      return payload.parts
        .filter(part => part.mimeType === 'text/plain')
        .map(part => Buffer.from(part.body.data, 'base64').toString())
        .join('\n');
    } else if (payload.body.data) {
      return Buffer.from(payload.body.data, 'base64').toString();
    }
    return '';
  }

  async detectPhishing(emails) {
    const processedEmails = await Promise.all(
      emails.map(email => this.preprocessEmail(email))
    );

    try {
      const response = await fetch(this.MODEL_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ emails: processedEmails })
      });

      const results = await response.json();
      return results.reduce((acc, result, index) => {
        acc[processedEmails[index].messageId] = result.isPhishing;
        return acc;
      }, {});
    } catch (error) {
      console.error('Error calling phishing detection model:', error);
      return {};
    }
  }
}
