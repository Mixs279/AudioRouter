document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Explicitly prompt the browser's native permission interface
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Shut down capturing immediately once labels are unlocked
    stream.getTracks().forEach(track => track.stop());
    
    // Automatically close the temporary tab on permission success
    window.close();
  } catch (err) {
    console.warn("Permission dismissed or rejected:", err);
  }
});