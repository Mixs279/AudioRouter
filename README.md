# Tab Audio Output Router

Tab Audio Output Router is a Chrome Extension designed to redirect the audio output of your active browser tab to any system-connected speaker or audio device. Built using Chrome Manifest V3, it features a clean and modern user interface styled in accordance with Material Design 3 (Material You) guidelines.

---

## Features

* **Real-Time Output Switching:** Change audio destinations dynamically while a stream is playing. No need to stop and restart the routing manually.
* **Audible Tab Detection:** Displays a pulsing visual badge when active audio playback is detected in the current tab.
* **Material Design 3 UI/UX:** A minimalist design with custom Montserrat typography, responsive lists, active states, and a smooth refresh animation.
* **Efficient Architecture:** Leverages Chrome's offscreen document standard for reliable audio processing with minimal impact on system resources.

---

## How It Works

Due to security and background constraints in Chrome Manifest V3, background service workers cannot process media streams directly. The extension utilizes the following process to route audio:

1. **Detection:** When you open the popup, the extension queries the browser to identify if the current tab is active and audible.
2. **Device Discovery:** The popup queries the system for active audio output devices.
3. **Capture & Forwarding:** When you click **Route Audio**, the popup sends a message to the background service worker, which requests a secure media stream ID for the current tab using `chrome.tabCapture`.
4. **Playback & Redirection:** The background service worker spins up a lightweight, hidden offscreen document (`offscreen.html`). The offscreen document initializes the captured audio stream and uses the standard Web Audio API (`setSinkId`) to route it to your selected speaker.

---

## Permissions and Device Access

To function correctly, this extension requests access to your **Microphone**:

### Why is this required?
Chrome security standards restrict extensions from viewing the actual names (labels) of your speakers or headphones by default. Without this permission, the extension can only retrieve generic placeholders (e.g., "System Speaker"). 

### Privacy Commitment
The extension opens a temporary tab (`permission.html`) to request authorization. Once allowed, the extension retrieves the device names and immediately closes the helper page. **The extension does not record, store, or transmit any audio data.** The permission is used solely to populate the output list with readable names.

---

## Installation

To run this extension locally in developer mode:

1. Clone or download this repository to your local machine.
2. Ensure your directory matches the following structure:
   ```text
   AudioRouter/
   ├── manifest.json
   ├── popup.html
   ├── popup.css
   ├── popup.js
   ├── permission.html
   ├── permission.js
   ├── background.js
   ├── offscreen.html
   ├── offscreen.js
   └── font/
       └── montserrat.ttf
   ```
3. Open Google Chrome and navigate to `chrome://extensions/`.
4. Enable **Developer mode** using the toggle switch in the top-right corner.
5. Click **Load unpacked** in the top-left corner.
6. Select the `AudioRouter` directory.

---

## Usage

1. Open a tab playing audio (such as YouTube or Spotify).
2. Click the extension icon in your toolbar to open the popup.
3. Click the **Allow** button in the notification banner to grant access to your output device names.
4. Select your preferred output device from the list.
5. Click **Route Audio** to begin redirection.
6. To switch devices mid-stream, click any other speaker in the list.
7. Click **Stop Routing** to restore default system audio behavior.

---

## Credits

Made with 💖 by Mycho Famadico
