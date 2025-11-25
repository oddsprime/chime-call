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
        camIcon: { type: String, default: 'https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/svgs/camera-01.svg' },
        micPermissionIcon: { type: String, default: 'https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/svgs/microphone-01.svg' }
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
      <div v-if="show" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-screen h-screen flex flex-col justify-center items-center gap-6 z-[1]">
      <!-- allow-permission-section -->
            <div class="flex flex-col gap-4 p-6 w-[32.0rem]  rounded-[0.625rem] bg-[#0C111D80] backdrop-blur-[50px]">
              <p class="text-lg font-semibold text-white text-left ">
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
                <button @click="$emit('cancel')" class="w-full h-10 bg-white/30 px-[0.5625rem] py-2 border-[1.5px] border-[#07F468] cursor-pointer">
                  <span class="text-base font-medium text-[#07F468]">Cancel</span>
                </button>

                <button @click="$emit('settings')" class="w-full h-10 bg-[#07F468] px-[0.5625rem] py-2 border-[1.5px] border-[#07F468] cursor-pointer">
                  <span class="text-base font-medium text-black">Settings</span>
                </button>
              </div>
            </div>
          </div>

      `,
    });
  }

  // expose globally
  global.registerCallPermissionCard = register;
})(window);
