# Real-Time Video Monitoring Tools

## Tool 1: Detect State Changes (Not Just Current State)
This monitors for CHANGES in video properties and logs ONLY when something changes:

```javascript
const video = document.querySelector('[data-cam-preview]');
let lastState = {
  readyState: video.readyState,
  videoWidth: video.videoWidth,
  videoHeight: video.videoHeight,
  srcObject: !!video.srcObject,
  paused: video.paused
};

console.log('🎬 INITIAL STATE:', lastState);
console.log('⏳ Monitoring for changes... Toggle camera now!');

const interval = setInterval(() => {
  const currentState = {
    readyState: video.readyState,
    videoWidth: video.videoWidth,
    videoHeight: video.videoHeight,
    srcObject: !!video.srcObject,
    paused: video.paused
  };
  
  // Check if anything changed
  const changed = Object.keys(currentState).filter(key => currentState[key] !== lastState[key]);
  
  if (changed.length > 0) {
    console.log(`🔄 STATE CHANGED:`, {
      timestamp: Date.now(),
      changed: changed,
      from: changed.reduce((obj, key) => ({ ...obj, [key]: lastState[key] }), {}),
      to: changed.reduce((obj, key) => ({ ...obj, [key]: currentState[key] }), {}),
      fullState: currentState
    });
    lastState = currentState;
  }
}, 50); // Check every 50ms

// Auto-stop after 10 seconds
setTimeout(() => {
  clearInterval(interval);
  console.log('⏹️ Monitoring stopped');
}, 10000);
```

## Tool 2: Listen to ALL Video Events
Attach listeners to every possible video event:

```javascript
const video = document.querySelector('[data-cam-preview]');
const allEvents = [
  'loadstart', 'progress', 'suspend', 'abort', 'error', 'emptied', 'stalled',
  'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough', 
  'playing', 'waiting', 'seeking', 'seeked', 'ended',
  'durationchange', 'timeupdate', 'play', 'pause', 'ratechange',
  'resize', 'volumechange'
];

console.log('📺 Attaching listeners to ALL video events...');
console.log('🎯 Toggle camera now and watch which events fire!');

allEvents.forEach(eventName => {
  video.addEventListener(eventName, () => {
    console.log(`🎥 EVENT: ${eventName}`, {
      timestamp: Date.now(),
      readyState: video.readyState,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      srcObject: !!video.srcObject,
      paused: video.paused,
      currentTime: video.currentTime
    });
  }, { once: false }); // Keep listening (not just once)
});

// Also monitor srcObject changes directly
let lastSrcObject = video.srcObject;
setInterval(() => {
  if (video.srcObject !== lastSrcObject) {
    console.log('🎬 srcObject CHANGED:', {
      from: !!lastSrcObject,
      to: !!video.srcObject,
      timestamp: Date.now()
    });
    lastSrcObject = video.srcObject;
  }
}, 50);
```

## Tool 3: MutationObserver (Watch DOM Changes)
Monitor if the video element itself or its attributes change:

```javascript
const video = document.querySelector('[data-cam-preview]');

console.log('👀 Watching video element for DOM changes...');

const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    console.log('🔧 DOM MUTATION:', {
      type: mutation.type,
      attributeName: mutation.attributeName,
      oldValue: mutation.oldValue,
      newValue: mutation.type === 'attributes' ? video.getAttribute(mutation.attributeName) : null,
      timestamp: Date.now()
    });
  });
});

observer.observe(video, {
  attributes: true,
  attributeOldValue: true,
  childList: true,
  subtree: true
});

// Stop after 10 seconds
setTimeout(() => {
  observer.disconnect();
  console.log('⏹️ Observer stopped');
}, 10000);
```

## Tool 4: Track From srcObject Assignment
Monitor the exact moment srcObject is assigned:

```javascript
const video = document.querySelector('[data-cam-preview]');

console.log('🎯 Intercepting srcObject assignment...');

// Save original property descriptor
const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'srcObject');

// Override the setter
Object.defineProperty(video, 'srcObject', {
  get: function() {
    return originalDescriptor.get.call(this);
  },
  set: function(stream) {
    console.log('🎬 srcObject SET:', {
      stream: !!stream,
      videoTracks: stream ? stream.getVideoTracks().length : 0,
      timestamp: Date.now(),
      beforeReadyState: this.readyState,
      beforeDimensions: { w: this.videoWidth, h: this.videoHeight }
    });
    
    // Call original setter
    originalDescriptor.set.call(this, stream);
    
    // Monitor what happens AFTER setting
    setTimeout(() => {
      console.log('📊 100ms AFTER srcObject set:', {
        readyState: this.readyState,
        videoWidth: this.videoWidth,
        videoHeight: this.videoHeight,
        paused: this.paused
      });
    }, 100);
    
    setTimeout(() => {
      console.log('📊 500ms AFTER srcObject set:', {
        readyState: this.readyState,
        videoWidth: this.videoWidth,
        videoHeight: this.videoHeight,
        paused: this.paused
      });
    }, 500);
  }
});

console.log('✅ Interceptor installed. Toggle camera now!');
```

## Tool 5: Combo Monitor (All In One)
Combines multiple monitoring approaches:

```javascript
const video = document.querySelector('[data-cam-preview]');

console.log('🚀 COMBO MONITOR STARTED - Toggle camera now!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// 1. Track state changes
let lastState = { readyState: video.readyState, srcObject: !!video.srcObject, videoWidth: video.videoWidth };

const stateChecker = setInterval(() => {
  const current = { readyState: video.readyState, srcObject: !!video.srcObject, videoWidth: video.videoWidth };
  if (JSON.stringify(current) !== JSON.stringify(lastState)) {
    console.log('🔄 [STATE CHANGE]', { from: lastState, to: current, time: Date.now() });
    lastState = current;
  }
}, 50);

// 2. Event listeners (key events only)
['loadedmetadata', 'loadeddata', 'canplay', 'playing'].forEach(evt => {
  video.addEventListener(evt, () => {
    console.log(`🎥 [EVENT: ${evt}]`, {
      readyState: video.readyState,
      dimensions: `${video.videoWidth}x${video.videoHeight}`,
      time: Date.now()
    });
  });
});

// 3. Watch for play() calls
const originalPlay = video.play;
video.play = function() {
  console.log('▶️ [play() CALLED]', { readyState: this.readyState, time: Date.now() });
  return originalPlay.apply(this, arguments);
};

// Auto-stop
setTimeout(() => {
  clearInterval(stateChecker);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⏹️ COMBO MONITOR STOPPED');
}, 10000);
```

## RECOMMENDED: Run Tool 1 + Tool 2 Together

**Step 1: Run Tool 1 (State Changes)**
```javascript
// Paste Tool 1 code here
```

**Step 2: In another console tab, run Tool 2 (All Events)**
```javascript
// Paste Tool 2 code here
```

**Step 3: Toggle camera ON**

**Step 4: Look for the FIRST event that fires when video shows**

Expected results:
- You should see srcObject change from `false` to `true`
- Then see events like `loadedmetadata`, `loadeddata`, `canplay`
- readyState should go from 0 → 1 → 2 → 3 → 4
- videoWidth/videoHeight should change from 0 to 640x480

**The event that fires when videoWidth > 0 is your trigger to hide the spinner!**

