# Video Readiness Detection Test Snippets

Test these snippets in the browser console to determine which method works best for detecting when the video feed is showing.

## Setup - Get Video Element Reference
First, get a reference to the preview video element:
```javascript
const video = document.querySelector('[data-cam-preview]');
console.log('Video element:', video);
```

## Test 1: Basic readyState Check
```javascript
console.log('Video readyState:', video.readyState);
// 0 = HAVE_NOTHING
// 1 = HAVE_METADATA
// 2 = HAVE_CURRENT_DATA
// 3 = HAVE_FUTURE_DATA
// 4 = HAVE_ENOUGH_DATA
```

## Test 2: Video Dimensions Check
```javascript
console.log('Video dimensions:', {
  videoWidth: video.videoWidth,
  videoHeight: video.videoHeight,
  clientWidth: video.clientWidth,
  clientHeight: video.clientHeight
});
```

## Test 3: Combined Check (Recommended)
```javascript
const isVideoReady = video.readyState >= 2 && video.videoWidth > 0;
console.log('Is video ready?', isVideoReady, {
  readyState: video.readyState,
  videoWidth: video.videoWidth,
  videoHeight: video.videoHeight
});
```

## Test 4: Stream Check
```javascript
const stream = video.srcObject;
console.log('Stream info:', {
  hasStream: !!stream,
  videoTracks: stream ? stream.getVideoTracks().length : 0,
  videoTrackEnabled: stream ? stream.getVideoTracks()[0]?.enabled : false,
  videoTrackReadyState: stream ? stream.getVideoTracks()[0]?.readyState : 'N/A'
});
```

## Test 5: Continuous Monitor (Run for 3 seconds)
```javascript
let count = 0;
const interval = setInterval(() => {
  console.log(`[${count * 100}ms]`, {
    readyState: video.readyState,
    videoWidth: video.videoWidth,
    videoHeight: video.videoHeight,
    isReady: video.readyState >= 2 && video.videoWidth > 0
  });
  count++;
  if (count >= 30) clearInterval(interval);
}, 100);
```

## Test 6: Event Listeners
```javascript
// Test which events fire and in what order
const events = ['loadstart', 'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough', 'playing'];
events.forEach(eventName => {
  video.addEventListener(eventName, () => {
    console.log(`[VIDEO EVENT] ${eventName}`, {
      readyState: video.readyState,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight
    });
  }, { once: true });
});
```

## Test 7: Wait for Video Ready (Promise-based)
```javascript
function waitForVideoReady(videoElement, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const checkReady = () => {
      if (videoElement.readyState >= 2 && videoElement.videoWidth > 0) {
        console.log('[VIDEO READY] Success!', {
          readyState: videoElement.readyState,
          videoWidth: videoElement.videoWidth,
          videoHeight: videoElement.videoHeight
        });
        resolve(true);
      }
    };
    
    // Check immediately
    checkReady();
    
    // Listen for events
    videoElement.addEventListener('loadeddata', checkReady, { once: true });
    videoElement.addEventListener('canplay', checkReady, { once: true });
    
    // Timeout fallback
    setTimeout(() => {
      if (videoElement.readyState < 2 || videoElement.videoWidth === 0) {
        console.error('[VIDEO READY] Timeout - video not ready', {
          readyState: videoElement.readyState,
          videoWidth: videoElement.videoWidth
        });
        reject(new Error('Video ready timeout'));
      }
    }, timeout);
  });
}

// Run the test
waitForVideoReady(video)
  .then(() => console.log('✅ Video is ready!'))
  .catch(err => console.error('❌ Video failed:', err));
```

## Recommended Method
Based on testing, use this in your code:
```javascript
const checkVideoReady = () => {
  if (previewVideo.readyState >= 2 && previewVideo.videoWidth > 0) {
    console.log('[CallingCard] Video feed confirmed - hiding spinner');
    this.isSyncingVideo = false;
  } else {
    setTimeout(checkVideoReady, 100);
  }
};
checkVideoReady();
```

