let offscreenCreated = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "start_routing") {
    handleStartRouting(request.tabId, request.deviceId)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; 
  }
  
  if (request.action === "stop_routing") {
    handleStopRouting(request.tabId)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === "update_route") {
    handleUpdateRoute(request.tabId, request.deviceId)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function handleStartRouting(tabId, deviceId) {
  await setupOffscreenDocument();

  return new Promise((resolve, reject) => {
    chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, async (streamId) => {
      if (!streamId) {
        reject(new Error("Unable to capture target media stream source."));
        return;
      }

      try {
        chrome.runtime.sendMessage({
          action: "play_captured_stream",
          streamId: streamId,
          deviceId: deviceId,
          tabId: tabId
        });

        const { currentRoutes = {} } = await chrome.storage.local.get('currentRoutes');
        currentRoutes[tabId] = deviceId;
        await chrome.storage.local.set({ currentRoutes });

        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
}

async function handleStopRouting(tabId) {
  chrome.runtime.sendMessage({
    action: "terminate_capture",
    tabId: tabId
  });

  const { currentRoutes = {} } = await chrome.storage.local.get('currentRoutes');
  delete currentRoutes[tabId];
  await chrome.storage.local.set({ currentRoutes });

  if (Object.keys(currentRoutes).length === 0) {
    await closeOffscreenDocument();
  }
}

// Seamlessly switch audio output without stopping and restarting the audio stream
async function handleUpdateRoute(tabId, deviceId) {
  // Post target sink modifications straight to our offscreen sandbox environment
  chrome.runtime.sendMessage({
    action: "change_sink",
    tabId: tabId,
    deviceId: deviceId
  });

  const { currentRoutes = {} } = await chrome.storage.local.get('currentRoutes');
  currentRoutes[tabId] = deviceId;
  await chrome.storage.local.set({ currentRoutes });
}

async function setupOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });

  if (existingContexts.length > 0) {
    offscreenCreated = true;
    return;
  }

  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['USER_MEDIA'],
    justification: 'To play active tab captured audio stream and route output through HTML Audio Element sink ID interfaces.'
  });
  offscreenCreated = true;
}

async function closeOffscreenDocument() {
  if (!offscreenCreated) return;
  await chrome.offscreen.closeDocument();
  offscreenCreated = false;
}

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const { currentRoutes = {} } = await chrome.storage.local.get('currentRoutes');
  if (currentRoutes[tabId]) {
    delete currentRoutes[tabId];
    await chrome.storage.local.set({ currentRoutes });
    if (Object.keys(currentRoutes).length === 0) {
      await closeOffscreenDocument();
    }
  }
});