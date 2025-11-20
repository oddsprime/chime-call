# Console Test Code for Spinner Hide Logic

Copy and paste these snippets into the browser console to test when the spinner should hide.

## Step 1: Get Video Element
First, get the preview video element:
```javascript
const video = document.querySelector('[data-cam-preview]');
console.log('Video element found:', !!video);
```

## Step 2: Test Event Listeners
Run this BEFORE toggling camera ON, then toggle camera ON and watch console:
```javascript
const video = document.querySelector('[data-cam-preview]');
const events = ['loadstart', 'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough', 'playing'];
events.forEach(eventName => {
  video.addEventListener(eventName, () => {
    console.log(`🎥 [VIDEO EVENT] ${eventName}`, {
      readyState: video.readyState,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      timestamp: Date.now()
    });
  }, { once: true });
});
console.log('✅ Event listeners attached. Now toggle camera ON.');
```

## Step 3: Monitor Video Properties
Run this to see properties change in real-time:
```javascript
const video = document.querySelector('[data-cam-preview]');
let count = 0;
const interval = setInterval(() => {
  console.log(`📊 [${count * 100}ms]`, {
    readyState: video.readyState,
    videoWidth: video.videoWidth,
    videoHeight: video.videoHeight,
    srcObject: !!video.srcObject,
    paused: video.paused
  });
  count++;
  if (count >= 50) { // Run for 5 seconds
    clearInterval(interval);
    console.log('⏹️ Monitoring stopped');
  }
}, 100);
console.log('▶️ Monitoring started for 5 seconds...');
```

## Step 4: Test Hide Spinner Manually
Once you know which event fires when video shows, test the hide logic:
```javascript
const video = document.querySelector('[data-cam-preview]');

// Method 1: Event-based (use the event that works from Step 2)
video.addEventListener('loadeddata', () => {
  console.log('✅ loadeddata fired - HIDE SPINNER NOW');
  // In your component: this.isSyncingVideo = false;
}, { once: true });

// Method 2: Check-based
function checkAndHide() {
  if (video.readyState >= 2 && video.videoWidth > 0) {
    console.log('✅ Video ready detected - HIDE SPINNER NOW', {
      readyState: video.readyState,
      videoWidth: video.videoWidth
    });
    return true;
  }
  return false;
}

// Run check every 100ms
const checkInterval = setInterval(() => {
  if (checkAndHide()) {
    clearInterval(checkInterval);
  }
}, 100);
```

## Step 5: Test with CallingCard Component
Access the component and manually hide spinner:
```javascript
// Get the Vue component instance
const callingCardEl = document.querySelector('[video-on]')?.parentElement;
if (callingCardEl && callingCardEl.__vueParentComponent) {
  const component = callingCardEl.__vueParentComponent.ctx;
  console.log('Component isSyncingVideo:', component.isSyncingVideo);
  
  // Manually hide spinner to test
  component.isSyncingVideo = false;
  console.log('✅ Spinner hidden manually');
}
```

## Expected Results
- **loadeddata** event should fire when video feed starts showing
- **canplay** event should fire shortly after
- **readyState** should be >= 2 when video is ready
- **videoWidth** should be > 0 when video dimensions are known

Use the event that fires FIRST and most reliably to hide the spinner.

