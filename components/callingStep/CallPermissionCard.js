// CallPermissionCard.js
(function (global) {
  function register(app) {
    if (!app) return;

    app.component('call-permission-card', {
      props: {
        show: { type: Boolean, default: false },
        handleText: { type: String, default: 'Calling @jennyben...' },
        videoIcon: { type: String, default: 'https://i.ibb.co.com/zVx0JM7X/block-video-1.webp' },
        micIcon: { type: String, default: 'https://i.ibb.co.com/zVhRMm4s/microphone-off-01.webp' },
        endCallIcon: { type: String, default: 'https://i.ibb.co.com/nshWZFfD/Communication.webp' },
        camIcon: { type: String, default: 'https://i.ibb.co.com/Kx9RdLBK/camera-01.webp' },
        micPermissionIcon: { type: String, default: 'https://i.ibb.co.com/qF1tJWsZ/microphone-01.webp' }
      },
      emits: ['cancel', 'settings', 'toggle', 'toggle-mic', 'end-call'],
      components: {
        'camera-button': window.VueComponents?.CameraButton,
        'microphone-button': window.VueComponents?.MicrophoneButton,
      },
      computed: {
        callCamStatus() {
          if (!window.settings) return false;
          return window.settings.callCamStatus ?? false;
        },
        callMicStatus() {
          if (!window.settings) return false;
          return window.settings.callMicStatus ?? false;
        }
      },
      watch: {
        // Watch for changes to callCamStatus and dispatch CamMic orchestration
        callCamStatus(newVal, oldVal) {
          if (newVal === oldVal) return;
          console.log('[CallPermissionCard] Camera status changed:', newVal);
          
          if (newVal) {
            // Camera turned ON - dispatch CamMic orchestration for both with preview
            console.log('[CallPermissionCard] 🚀 Dispatching CamMic:Orchestrate:Both to get permissions and start preview');
            window.dispatchEvent(new CustomEvent('CamMic:Orchestrate:Both'));
          } else {
            // Camera turned OFF - stop streams
            console.log('[CallPermissionCard] ⛔ Camera turned off - stopping CamMic streams');
            window.dispatchEvent(new CustomEvent('CamMic:Streams:Stop'));
          }
        },
        // Watch for changes to callMicStatus
        callMicStatus(newVal, oldVal) {
          if (newVal === oldVal) return;
          console.log('[CallPermissionCard] Microphone status changed:', newVal);
          // Mic toggling is handled separately if needed
        }
      },
      template: `
        <div v-if="show" class="w-[32.8rem] h-[32.8rem] flex flex-col bg-black/80 relative rounded-md overflow-hidden">
          
          <!-- calling-info-section -->
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col justify-center items-center gap-4 pointer-events-none">
                <div class="flex flex-col justify-center items-center gap-2">
                <!-- avatar-container -->
                <waiting-avatar :show="true"></waiting-avatar>

                <span class="text-sm text-white text-center">Calling {{ handleText }}...</span>
            </div>
          </div>

          <!-- bottom-controls-section -->
          <div class="w-full h-full flex justify-end items-end flex-grow">
            <div class="w-full flex justify-center items-center p-4">
              <div class="flex items-center gap-3 py-2">
                <!-- video -->
                <button @click="$emit('toggle')" class="flex justify-center items-center w-12 h-12 bg-white/5 rounded-full cursor-pointer">
                  <img :src="videoIcon" alt="video" class="w-[22px] h-[22px] drop-shadow-[0px_0px_4px_0px_#000000]" />
                </button>

                <!-- mic -->
                <button @click="$emit('toggle-mic')" class="flex justify-center items-center w-12 h-12 bg-white/5 rounded-full cursor-pointer">
                  <img :src="micIcon" alt="mic" class="w-[22px] h-[22px] drop-shadow-[0px_0px_4px_0px_#000000]" />
                </button>

                <!-- end-call -->
                <button @click="$emit('end-call')" class="flex justify-center items-center w-12 h-12 bg-[#FF4405] rounded-full cursor-pointer">
                  <img :src="endCallIcon" alt="end" class="w-[22px] h-[22px]" />
                </button>
              </div>
            </div>
          </div>

          <!-- video-preview-section removed: handler now uses the one outside Vue app (index.html) -->
          <div class="absolute right-[0.90625rem] top-3 flex justify-center items-center w-[7.5rem] h-[4.3125rem] bg-black rounded z-[1] border-4" :class="callCamStatus ? 'border-green-500' : 'border-red-500'"></div>

          <!-- allow-permission-section -->
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-screen h-screen flex flex-col justify-center items-center gap-6 z-[1]">
            <div class="flex flex-col gap-4 p-4 w-80 h-[17.3125rem] rounded-[0.625rem] bg-[#0C111D80] backdrop-blur-[50px]">
              <p class="text-lg font-semibold text-white text-center">
                Please allow below permission to start call:
              </p>

              <!-- camera & microphone -->
              <div class="flex gap-6 justify-center items-center">
                <!-- camera -->
                <div class="flex flex-col justify-center items-center gap-4 px-6 py-4">
                  <img :src="camIcon" alt="camera" class="w-12 h-12" />
                  <span class="text-sm font-medium uppercase text-[#07F468]">Camera</span>
                </div>

                <!-- microphone -->
                <div class="flex flex-col justify-center items-center gap-4 px-6 py-4">
                  <img :src="micPermissionIcon" alt="microphone" class="w-12 h-12" />
                  <span class="text-sm font-medium uppercase text-[#07F468]">Microphone</span>
                </div>
              </div>

              <!-- buttons -->
              <div class="flex gap-2">
                <button @click="$emit('cancel')" class="w-full h-10 bg-white/30 px-[0.5625rem] py-2 border-[1.5px] border-[#07F468] cursor-pointer rounded">
                  <span class="text-base font-medium text-[#07F468]">Cancel</span>
                </button>

                <button @click="$emit('settings')" class="w-full h-10 bg-[#07F468] px-[0.5625rem] py-2 border-[1.5px] border-[#07F468] cursor-pointer rounded">
                  <span class="text-base font-medium text-black">Settings</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Hidden device select elements (required by CamMic handler) -->
          <select data-cam-mic-element="video-select" style="display: none;"></select>
          <select data-cam-mic-element="audio-select" style="display: none;"></select>
        </div>
      `,
    });
  }

  // expose globally
  global.registerCallPermissionCard = register;
})(window);
