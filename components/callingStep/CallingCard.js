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
            console.log('[CallingCard] Camera turned on - showing spinner');
            console.log('[CallingCard] isSyncingVideo BEFORE:', this.isSyncingVideo);
            this.isSyncingVideo = true;
            console.log('[CallingCard] isSyncingVideo AFTER:', this.isSyncingVideo);
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
              // Camera turned ON - sync with master video
              console.log('[CallingCard] Syncing preview video with master');
              const masterVideo = this._getMasterVideo();
              if (masterVideo && masterVideo.srcObject) {
                previewVideo.srcObject = masterVideo.srcObject;
                previewVideo.play().catch((error) => {
                  console.warn('[CallingCard] Failed to play preview video:', error);
                });
              }
              // NOTE: Spinner stays visible - test manually to find hide trigger
            } else {
              // Camera turned OFF - clear preview video
              previewVideo.srcObject = null;
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
        }
      },
      mounted() {
        // Listen for video sync events from _syncMultipleVideoPreviews
        this.$nextTick(() => {
          const previewContainer = this.$el?.querySelector('[video-on]');
          if (previewContainer) {
            previewContainer.addEventListener('video-sync-start', () => {
              this.isSyncingVideo = true;
            });
            previewContainer.addEventListener('video-sync-complete', () => {
              this.isSyncingVideo = false;
            });
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
                previewVideo.srcObject = masterVideo.srcObject;
                previewVideo.play().catch((error) => {
                  console.warn('[CallingCard] Failed to play preview video on mount:', error);
                });
              }
              // NOTE: Spinner stays visible - test manually to find hide trigger
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
                    <div class="flex justify-center items-center w-[9.5rem] h-[9.5rem] relative rounded-blob-1 aspect-square relative overflow-hidden">
                        <img :src="avatarSrc" alt="user" class="w-100 h-100 fit--cover absolute top-0 left-0" />
                    </div>
                    <img
                    :src="loaderSrc"
                    alt="green-loader"
                    class="absolute top-[-2rem] left-[-2rem] min-w-[18rem] h-[17.8rem] animate-spinFast"
                    />
                </div>

                <span class="text-sm text-white text-center"> {{ displayText }}...</span>
                <!-- Check if user is caller -->
<div v-if="currentRole === 'caller'">
  Caller-specific content
</div>

<!-- Check if user is callee -->
<div v-if="currentRole === 'callee'">
  Callee-specific content
</div>
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
                />

                <!-- microphone-off -->
                <microphone-button
                  :enabled="callMicStatus"
                  @toggle="$emit('toggle-mic')"
                />

                <!-- cut-call -->
                <button @click="$emit('end-call')" class="flex justify-center items-center w-12 h-12 bg-[#FF4405] rounded-full cursor-pointer">
                  <img :src="endCallIcon" alt="end-call" class="w-[22px] h-[22px]" />
                </button>
              </div>
            </div>
          </div>

          <!-- small preview box (top-right) -->
          <div v-if="isCameraOn" 
           video-on class="absolute right-[0.90625rem] top-3 flex justify-center items-center w-[7.5rem] h-[4.3125rem] bg-black rounded z-[1]">
            <video ref="previewVideo" data-cam-preview autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover; display: block; border-radius: 4px;"></video>
            <!-- Loading overlay spinner - inline fallback for now -->
            <div v-if="isSyncingVideo" style="
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(0, 0, 0, 0.7);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 200;
              pointer-events: none;
              border-radius: 4px;
            ">
              <div style="
                width: 3rem;
                height: 3rem;
                border: 3px solid rgba(255, 255, 255, 0.3);
                border-top-color: #fff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
              "></div>
            </div>
          </div>
          <div v-if="isCameraOff" video-off class="absolute right-[0.90625rem] top-3 flex justify-center items-center w-[7.5rem] h-[4.3125rem] bg-black rounded z-[1]">
            <img :src="videoIcon" alt="preview" class="w-7 h-7" />
          </div>



        </div>
      `
    });
  }

  // expose the register function globally so you can call registerCallingCard(app)
  global.registerCallingCard = register;
})(window);
