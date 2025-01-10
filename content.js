function findEmailByHeaders(subject, from) {
    const emailRows = document.querySelectorAll('tr.zA');
    return Array.from(emailRows).find(row => {
      const subjectEl = row.querySelector('td.a4W');
      const fromEl = row.querySelector('td.yX');
      return subjectEl?.textContent.includes(subject) && fromEl?.textContent.includes(from);
    });
  }
  
  function markPhishingEmails(phishingResults) {
    // phishingResults should now contain subject and from information
    Object.entries(phishingResults).forEach(([id, result]) => {
      if (result.isPhishing) {
        const emailRow = findEmailByHeaders(result.subject, result.from);
        if (emailRow) {
          emailRow.classList.add('phishing-warning');
        }
      }
    });
  }
  
