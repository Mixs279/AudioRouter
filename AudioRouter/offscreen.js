const activeCaptureSources = new Map();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "play_captured_stream") {
    initiateStreamPlayback(request.streamId, request.deviceId, request.tabId);
  } else if (request.action === "terminate_capture") {
    releaseStreamPlayback(request.tabId);
  } else if (request.action === "change_sink") {
    updateStreamSink(request.tabId, request.deviceId);
  }
});

async function initiateStreamPlayback(streamId, deviceId, tabId) {
  if (activeCaptureSources.has(tabId)) {
    releaseStreamPlayback(tabId);
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      },
      video: false
    });

    const audioPlayer = new Audio();
    audioPlayer.srcObject = stream;
    
    if (typeof audioPlayer.setSinkId === 'function') {
      await audioPlayer.setSinkId(deviceId);
    } else {
      console.warn("setSinkId is not supported in this browser environment.");
    }

    audioPlayer.play();

    activeCaptureSources.set(tabId, {
      stream: stream,
      player: audioPlayer
    });

  } catch (error) {
    console.error("Audio pipeline failed initialization:", error);
  }
}

function releaseStreamPlayback(tabId) {
  const captureContext = activeCaptureSources.get(tabId);
  if (captureContext) {
    captureContext.player.pause();
    captureContext.player.srcObject = null;
    captureContext.stream.getTracks().forEach(track => track.stop());
    activeCaptureSources.delete(tabId);
  }
}

// Change output device destination of the audio stream in real time
async function updateStreamSink(tabId, deviceId) {
  const captureContext = activeCaptureSources.get(tabId);
  if (captureContext && captureContext.player) {
    try {
      if (typeof captureContext.player.setSinkId === 'function') {
        await captureContext.player.setSinkId(deviceId);
      } else {
        console.warn("setSinkId is not supported on this browser profile.");
      }
    } catch (err) {
      console.error("Failed to dynamically update audio sink:", err);
    }
  }
}