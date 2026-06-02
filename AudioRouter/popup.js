let currentTabId = null;
let selectedDeviceId = 'default';
let activeRoutingState = false;

document.addEventListener('DOMContentLoaded', async () => {
  await getActiveTabContext();
  await checkRoutingState();
  await refreshDevices();

  // Bind Listeners
  document.getElementById('btn-refresh').addEventListener('click', refreshDevices);
  document.getElementById('btn-grant-permission').addEventListener('click', requestAudioPermission);
  document.getElementById('btn-toggle-route').addEventListener('click', handleRoutingToggle);
});

// Automatically refresh devices when the user returns focus to the popup tab
window.addEventListener('focus', async () => {
  await refreshDevices();
});

async function getActiveTabContext() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    currentTabId = tab.id;
    document.getElementById('tab-title-text').innerText = tab.title || "Unknown Tab";
    
    if (tab.audible) {
      const badge = document.getElementById('audible-badge');
      badge.classList.remove('badge-hidden');
    }
    
    document.getElementById('btn-toggle-route').disabled = false;
  }
}

async function checkRoutingState() {
  const { currentRoutes } = await chrome.storage.local.get('currentRoutes');
  if (currentRoutes && currentRoutes[currentTabId]) {
    activeRoutingState = true;
    selectedDeviceId = currentRoutes[currentTabId];
    updateRoutingButtonState(true);
    updateStatusFooter("Currently routing tab audio.");
  } else {
    activeRoutingState = false;
    updateRoutingButtonState(false);
    updateStatusFooter("Audio routing inactive.");
  }
}

async function refreshDevices() {
  const refreshBtn = document.getElementById('btn-refresh');
  const deviceListEl = document.getElementById('device-list');
  
  // Start rotation animation
  refreshBtn.classList.add('spinning');
  
  // Clear list structure and show loading state
  deviceListEl.innerHTML = '<div class="loading-state">Scanning system output devices...</div>';

  // Enforce a 600ms visual delay so fast queries don't clip the animation
  const animationDelay = new Promise(resolve => setTimeout(resolve, 600));

  try {
    const [devices] = await Promise.all([
      navigator.mediaDevices.enumerateDevices(),
      animationDelay
    ]);

    const outputDevices = devices.filter(device => device.kind === 'audiooutput');

    // If device labels are blank/hidden, prompt for setup
    const isLabelsMissing = outputDevices.some(d => d.label === '');
    if (isLabelsMissing && outputDevices.length > 0) {
      document.getElementById('permission-banner').classList.remove('banner-hidden');
    } else {
      document.getElementById('permission-banner').classList.add('banner-hidden');
    }

    renderDevices(outputDevices);
  } catch (err) {
    deviceListEl.innerHTML = '<div class="loading-state">Error scanning systems</div>';
  } finally {
    // End rotation animation
    refreshBtn.classList.remove('spinning');
  }
}

function renderDevices(devices) {
  const deviceListEl = document.getElementById('device-list');
  deviceListEl.innerHTML = '';

  if (devices.length === 0) {
    deviceListEl.innerHTML = '<div class="loading-state">No audio output devices found</div>';
    return;
  }

  devices.forEach(device => {
    const label = device.label || `System Speaker (ID: ${device.deviceId.slice(0, 5)}...)`;
    const isSelected = device.deviceId === selectedDeviceId;

    const itemEl = document.createElement('div');
    itemEl.className = `device-item ${isSelected ? 'selected' : ''}`;
    itemEl.dataset.deviceId = device.deviceId;

    itemEl.innerHTML = `
      <div class="device-info">
        <span class="device-name">${label}</span>
        <span class="device-type">Output Device</span>
      </div>
      <div class="device-check">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
      </div>
    `;

    itemEl.addEventListener('click', async () => {
      document.querySelectorAll('.device-item').forEach(el => el.classList.remove('selected'));
      itemEl.classList.add('selected');
      selectedDeviceId = device.deviceId;

      // If already routing, dynamically update the output sink instantly
      if (activeRoutingState && currentTabId) {
        chrome.runtime.sendMessage({
          action: "update_route",
          tabId: currentTabId,
          deviceId: selectedDeviceId
        }, (res) => {
          if (res && res.success) {
            updateStatusFooter("Route updated dynamically.");
          } else {
            updateStatusFooter("Failed to switch dynamic output.");
          }
        });
      }
    });

    deviceListEl.appendChild(itemEl);
  });
}

// Launches permission setup helper in a dedicated browser tab
function requestAudioPermission() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('permission.html'),
    active: true
  });
}

async function handleRoutingToggle() {
  if (!currentTabId) return;

  if (activeRoutingState) {
    chrome.runtime.sendMessage({ 
      action: "stop_routing", 
      tabId: currentTabId 
    }, async (res) => {
      if (res && res.success) {
        activeRoutingState = false;
        updateRoutingButtonState(false);
        updateStatusFooter("Restored to default hardware output.");
      }
    });
  } else {
    chrome.runtime.sendMessage({ 
      action: "start_routing", 
      tabId: currentTabId, 
      deviceId: selectedDeviceId 
    }, async (res) => {
      if (res && res.success) {
        activeRoutingState = true;
        updateRoutingButtonState(true);
        updateStatusFooter("Active tab routing running.");
      } else {
        updateStatusFooter(`Error initiating: ${res.error || 'Unknown error'}`);
      }
    });
  }
}

function updateRoutingButtonState(isActive) {
  const btn = document.getElementById('btn-toggle-route');
  if (isActive) {
    btn.className = "btn btn-filled";
    btn.querySelector('.btn-label').innerText = "Stop Routing";
    btn.style.backgroundColor = "var(--md-sys-color-error)";
  } else {
    btn.className = "btn btn-filled";
    btn.querySelector('.btn-label').innerText = "Route Audio";
    btn.style.backgroundColor = "var(--md-sys-color-primary)";
  }
}

function updateStatusFooter(message) {
  document.getElementById('footer-status').innerText = message;
}