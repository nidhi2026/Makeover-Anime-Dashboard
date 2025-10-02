chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchProxy") {
    fetch(request.url)
      .then(res => res.json())
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.toString() }));

    return true; // keep channel open
  }
});
