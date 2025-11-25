// CallingCard.js
(function (global) {
  function register(app) {
    if (!app) return;

    app.component('calling-card', {
      props: {
        show: { type: Boolean, default: false },
        callWaitingText: { type: String, default: '' },
        callAcceptedText: { type: String, default: '' },
        avatarSrc: { type: String, default: 'https://fansocial-user-media.s3-accelerate.amazonaws.com/user-869/images/kf1amBZt0jnKUACX4ir3ICx7EbF3Jg/kf1amBZt0jnKUACX4ir3ICx7EbF3Jg.png' },
        userInitials: { type: String, default: '' },
        loaderSrc: { type: String, default: 'https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/svgs/green-loader-2.svg' },
        // labels/icons optional
        videoIcon: { type: String, default: 'https://i.ibb.co.com/zVx0JM7X/block-video-1.webp' },
        micIcon: { type: String, default: 'https://i.ibb.co.com/zVhRMm4s/microphone-off-01.webp' },
        endCallIcon: { type: String, default: 'https://i.ibb.co.com/nshWZFfD/Communication.webp' }
      },
      emits: ['end-call','toggle','toggle-mic'],
      components: {
        'camera-button': window.VueComponents?.CameraButton,
        'microphone-button': window.VueComponents?.MicrophoneButton,
      },
      data() {
        return {
          isSyncingVideo: false
        };
      },
      computed: {
        // Use getCameraStatus() which accesses the reactive property directly
        isCameraOn() {
          if (!window.settings) return false;
          return window.settings.callCamStatus === true;
        },
        isCameraOff() {
          if (!window.settings) return true;
          return !window.settings.callCamStatus;
        },
        callCamStatus() {
          if (!window.settings) return false;
          return window.settings.callCamStatus ?? false;
        },
        callMicStatus() {
          if (!window.settings) return false;
          return window.settings.callMicStatus ?? false;
        },


        currentRole() {
          if (!window.settings) return '';
          return window.settings.currentRole || '';
        },

 



        // Computed property to determine which text to show
        displayText() {
          if (this.callWaitingText) return this.callWaitingText;
          if (this.callAcceptedText) return this.callAcceptedText;
          return '@jennyben'; // fallback
        }
      },
      watch: {
        // Watch for changes to isCameraOn and sync preview video with master video
        isCameraOn(newVal, oldVal) {
          if (newVal === oldVal) return;
          console.log('[CallingCard] Camera status changed:', newVal);
          
          if (newVal) {
            // Camera turned ON - show spinner by default
            console.log('[CallingCard] [WATCHER5] [Camera ON] Showing spinner', {
              isSyncingVideoBefore: this.isSyncingVideo,
              timestamp: Date.now()
            });
            this.isSyncingVideo = true;
            console.log('[CallingCard] [WATCHER5] [Camera ON] Spinner shown', {
              isSyncingVideoAfter: this.isSyncingVideo,
              timestamp: Date.now()
            });
          } else {
            // Camera turned OFF - hide spinner and clear video
            console.log('[CallingCard] Camera turned off - hiding spinner and clearing video');
            this.isSyncingVideo = false;
          }
          
          // Use nextTick to ensure DOM is updated
          this.$nextTick(() => {
            const previewVideo = this.$refs.previewVideo;
            if (!previewVideo) return;
            
            if (newVal) {
              // Camera turned ON - setup watcher and wait for stream
              console.log('[CallingCard] [WATCHER5] [Syncing] Starting sync process', {
                hasPreviewVideo: !!previewVideo,
                previewVideoTag: previewVideo?.tagName,
                timestamp: Date.now()
              });
              
              // Setup watcher FIRST - it will catch when _syncMultipleVideoPreviews assigns the stream
              console.log('[CallingCard] [WATCHER5] [Syncing] Setting up watcher (will catch stream when assigned)');
              this._setupSrcObjectWatcher(previewVideo);
              
              // Try to sync immediately if master stream exists
              const masterVideo = this._getMasterVideo();
              console.log('[CallingCard] [WATCHER5] [Syncing] Master video check', {
                hasMasterVideo: !!masterVideo,
                hasMasterStream: !!(masterVideo?.srcObject),
                isSyncingVideo: this.isSyncingVideo
              });
              
              if (masterVideo && masterVideo.srcObject) {
                console.log('[CallingCard] [WATCHER5] [Syncing] Master stream exists - assigning now');
                previewVideo.srcObject = masterVideo.srcObject;
                previewVideo.play().catch((error) => {
                  console.warn('[CallingCard] [WATCHER5] [Syncing] Play failed:', error);
                });
              } else {
                console.log('[CallingCard] [WATCHER5] [Syncing] No master stream yet - watcher will catch it when _syncMultipleVideoPreviews runs');
                // Keep spinner showing - watcher will catch when stream is assigned via _syncMultipleVideoPreviews
              }
            } else {
              // Camera turned OFF - clear preview video and remove event listeners
              previewVideo.srcObject = null;
              
              // Clean up event listeners
              if (previewVideo._videoReadyListeners) {
                previewVideo._videoReadyListeners.forEach(({ event, handler }) => {
                  previewVideo.removeEventListener(event, handler);
                });
                previewVideo._videoReadyListeners = [];
                console.log('[CallingCard] [WATCHER5] [Cleanup] Removed event listeners');
              }
            }
          });
        }
      },
      methods: {
        // Get master video element from footer
        _getMasterVideo() {
          const footer = document.querySelector('footer');
          if (footer) {
            return footer.querySelector('[data-cam-mic-element="video-preview"]');
          }
          // Fallback: try to get from CamMic handler's cached UI
          if (window.CamMicPermissionsHandler && window.CamMicPermissionsHandler._ui) {
            return window.CamMicPermissionsHandler._ui.masterVideo;
          }
          return null;
        },
        // Setup srcObject watcher to detect when video feed is ready (using event listeners, no timers)
        _setupSrcObjectWatcher(videoElement) {
          console.log('[CallingCard] [_setupSrcObjectWatcher] [START]', {
            videoElement: !!videoElement,
            alreadySetup: videoElement?._srcObjectWatcherSetup,
            videoElementTag: videoElement?.tagName
          });
          
          try {
            const desc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'srcObject');
            console.log('[CallingCard] [_setupSrcObjectWatcher] [Descriptor]', {
              hasDescriptor: !!desc,
              hasGetter: !!desc?.get,
              hasSetter: !!desc?.set
            });
            
            // Always setup watcher (even if already setup, re-setup to ensure it works)
            if (desc && desc.set) {
              const self = this;
              console.log('[CallingCard] [_setupSrcObjectWatcher] [Setting up interceptor]');
              
              // Remove any existing event listeners
              if (videoElement._videoReadyListeners) {
                videoElement._videoReadyListeners.forEach(({ event, handler }) => {
                  videoElement.removeEventListener(event, handler);
                });
                videoElement._videoReadyListeners = [];
              }
              
              // Helper function to check if video is truly ready (reasonable dimensions)
              const checkVideoReady = (videoEl) => {
                // Check for valid video dimensions (at least 50px to avoid false positives from tiny dimensions)
                const hasValidDimensions = videoEl.videoWidth > 50 && videoEl.videoHeight > 50;
                const isReady = videoEl.readyState >= 2 && hasValidDimensions;
                console.log('[CallingCard] [WATCHER5] [Video Ready Check]', {
                  readyState: videoEl.readyState,
                  videoWidth: videoEl.videoWidth,
                  videoHeight: videoEl.videoHeight,
                  hasValidDimensions: hasValidDimensions,
                  isReady: isReady,
                  isSyncingVideo: self.isSyncingVideo
                });
                return isReady;
              };
              
              // Helper function to hide spinner when video is ready
              const hideSpinnerIfReady = (videoEl, eventName) => {
                if (checkVideoReady(videoEl) && self.isSyncingVideo) {
                  console.log(`[CallingCard] [WATCHER5] [✅ FEED CONFIRMED via ${eventName}]`, {
                    readyState: videoEl.readyState,
                    videoWidth: videoEl.videoWidth,
                    videoHeight: videoEl.videoHeight,
                    isSyncingVideoBefore: self.isSyncingVideo
                  });
                  self.isSyncingVideo = false;
                  console.log('[CallingCard] [WATCHER5] [✅ Spinner hidden]', {
                    isSyncingVideoAfter: self.isSyncingVideo
                  });
                }
              };
              
              // Create event listeners for video readiness
              const events = ['loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough', 'playing'];
              const listeners = [];
              
              events.forEach(eventName => {
                const handler = function() {
                  console.log(`[CallingCard] [WATCHER5] [Event: ${eventName}]`, {
                    readyState: this.readyState,
                    videoWidth: this.videoWidth,
                    videoHeight: this.videoHeight
                  });
                  hideSpinnerIfReady(this, eventName);
                };
                videoElement.addEventListener(eventName, handler);
                listeners.push({ event: eventName, handler: handler });
              });
              
              videoElement._videoReadyListeners = listeners;
              
              Object.defineProperty(videoElement, 'srcObject', {
                get: desc.get,
                set: function(stream) {
                  console.log('[CallingCard] [WATCHER5] [srcObject SETTER INTERCEPTED]', {
                    hasStream: !!stream,
                    streamType: stream?.constructor?.name,
                    videoTracks: stream ? stream.getVideoTracks().length : 0,
                    currentReadyState: this.readyState,
                    currentVideoWidth: this.videoWidth,
                    currentVideoHeight: this.videoHeight,
                    isSyncingVideo: self.isSyncingVideo,
                    timestamp: Date.now()
                  });
                  
                  // Call original setter
                  desc.set.call(this, stream);
                  console.log('[CallingCard] [WATCHER5] [After original setter]', {
                    readyState: this.readyState,
                    videoWidth: this.videoWidth,
                    videoHeight: this.videoHeight
                  });
                  
                  // Ensure spinner is showing when stream is assigned
                  if (!self.isSyncingVideo) {
                    console.log('[CallingCard] [WATCHER5] [Ensuring spinner is showing]');
                    self.isSyncingVideo = true;
                  }
                  
                  // Try to play the video (triggers events)
                  this.play().catch(err => {
                    console.warn('[CallingCard] [WATCHER5] [Play failed]', err);
                  });
                  
                  // Check immediately in case video is already ready (use setTimeout 0 to let setter complete)
                  setTimeout(() => {
                    if (checkVideoReady(this)) {
                      hideSpinnerIfReady(this, 'immediate');
                    }
                  }, 0);
                },
                configurable: true
              });
              videoElement._srcObjectWatcherSetup = true;
              console.log('[CallingCard] [_setupSrcObjectWatcher] [✅ Watcher setup complete]', {
                eventsRegistered: events.length
              });
            } else {
              console.warn('[CallingCard] [_setupSrcObjectWatcher] [⚠️ Cannot setup]', {
                hasDesc: !!desc,
                hasSetter: !!desc?.set
              });
            }
          } catch (e) {
            console.error('[CallingCard] [_setupSrcObjectWatcher] [❌ ERROR]', e);
          }
        }
      },
      mounted() {
        // Setup watcher on mount - it will catch when stream is assigned
        this.$nextTick(() => {
          const previewVideo = this.$refs.previewVideo;
          if (previewVideo) {
            console.log('[CallingCard] [WATCHER5] [Mounted] Setting up watcher on mount');
            this._setupSrcObjectWatcher(previewVideo);
          }
        });
        
        // Sync preview video if camera is already on when component mounts
        if (this.isCameraOn) {
          this.$nextTick(() => {
            const previewVideo = this.$refs.previewVideo;
            if (previewVideo) {
              this.isSyncingVideo = true;
              const masterVideo = this._getMasterVideo();
              if (masterVideo && masterVideo.srcObject) {
                console.log('[CallingCard] [WATCHER5] [Mounted] Master stream exists - assigning');
                previewVideo.srcObject = masterVideo.srcObject;
                previewVideo.play().catch((error) => {
                  console.warn('[CallingCard] Failed to play preview video on mount:', error);
                });
              } else {
                console.log('[CallingCard] [WATCHER5] [Mounted] No master stream yet - watcher will catch it');
                // Keep spinner showing - watcher will catch when stream is assigned
              }
            }
          });
        }
      },
      template: `
        <div v-if="show" class="w-[32.8rem] h-[32.8rem] flex flex-col bg-black/80 relative rounded-md overflow-hidden">
          <!-- calling-info-section (centered) -->
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col justify-center items-center gap-4 pointer-events-none">
            <div class="flex flex-col justify-center items-center gap-2">
                <!-- avatar-container -->
                <div class="relative w-[14rem] h-[14rem] flex items-center justify-center">
                    <DefaultAvatar
                      :src="avatarSrc"
                      :initial="userInitials"
                      size="w-[9.5rem] h-[9.5rem]"
                    />
                    <img
                    :src="loaderSrc"
                    alt="green-loader"
                    class="absolute top-[-2rem] left-[-2rem] min-w-[18rem] h-[17.8rem] animate-spinFast"
                    />
                </div>

                <span class="text-sm text-white text-center"> {{ displayText }}...</span>
                <!-- Check if user is caller -->

            </div>
        </div>

          <!-- bottom-controls-section -->
          <div class="w-full h-full flex justify-end items-end flex-grow">
            <div class="w-full flex justify-center items-center p-4">
              <div class="flex items-center gap-3 py-2">
                <!-- video-block -->
                <camera-button 
                  :enabled="callCamStatus" 
                  @toggle="$emit('toggle')" 
                  button-size-classes="w-12 h-12"
                  icon-size-classes="w-[2.2rem] h-[2.2rem]"
                />

                <!-- microphone-off -->
                <microphone-button
                  :enabled="callMicStatus"
                  @toggle="$emit('toggle-mic')"
                  button-size-classes="w-12 h-12"
                  icon-size-classes="w-[2.2rem] h-[2.2rem]"
                  
                />

                <!-- cut-call -->
                <end-call-button
                  :icon="endCallIcon"
                  btn-size="w-12 h-12"
                  img-size="w-[2.2rem] h-[2.2rem]"
                  @click="$emit('end-call')"
                ></end-call-button>
              </div>
            </div>
          </div>

          <!-- small preview box (top-right) -->
          <div v-if="isCameraOn" 
           video-on class="absolute right-[0.90625rem] top-3 flex justify-center items-center w-[12.0rem] h-[6.8rem] bg-black rounded z-[1]">
            <video ref="previewVideo" data-cam-preview autoplay playsinline muted class="w-full h-full block rounded object-cover"></video>
            <!-- Loading overlay spinner -->
            <loading-spinner v-if="isSyncingVideo" size="3rem"></loading-spinner>
          </div>
          <div v-if="isCameraOff" video-off class="absolute right-[0.90625rem] top-3 flex justify-center items-center w-[12.0rem] h-[6.8rem] bg-black rounded z-[1]">
            <img :src="videoIcon" alt="preview" class="w-7 h-7" />
          </div>



        </div>
      `
    });
  }

  // expose the register function globally so you can call registerCallingCard(app)
  global.registerCallingCard = register;
})(window);
