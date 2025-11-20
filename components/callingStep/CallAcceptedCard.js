// CallAcceptedCard.js
(function (global) {
  function register(app) {
    if (!app) return;

    app.component('call-accepted-card', {
      props: {
        show: { type: Boolean, default: false },
        handleText: { type: String, default: '@jennyben Accepted!' },
        avatarSrc: { type: String, default: 'https://fansocial-user-media.s3-accelerate.amazonaws.com/user-869/images/kf1amBZt0jnKUACX4ir3ICx7EbF3Jg/kf1amBZt0jnKUACX4ir3ICx7EbF3Jg.png' },
        loaderSrc: { type: String, default: 'https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/svgs/green-loader-2.svg' },
        videoIcon: { type: String, default: 'https://i.ibb.co.com/zVx0JM7X/block-video-1.webp' },
        micIcon: { type: String, default: 'https://i.ibb.co.com/zVhRMm4s/microphone-off-01.webp' },
        endCallIcon: { type: String, default: 'https://i.ibb.co.com/nshWZFfD/Communication.webp' },
      },
      emits: ['end-call', 'toggle', 'toggle-mic'],
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
      template: `
        <div
        v-if="show"
          class="w-[32.8rem] h-[32.8rem] flex flex-col bg-black/80 relative rounded-md overflow-hidden"
        >
          <!-- calling-info-section -->
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

                <span class="text-sm text-white text-center"> {{ handleText }}...</span>
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
                <button
                  @click="$emit('end-call')"
                  class="flex justify-center items-center w-12 h-12 bg-[#FF4405] rounded-full cursor-pointer"
                >
                  <img
                    :src="endCallIcon"
                    alt="end-call"
                    class="w-[22px] h-[22px]"
                  />
                </button>
              </div>
            </div>
          </div>

          <!-- video-call-section with green/red borders (video-preview now in index.html outside Vue) -->
          <div v-if="callCamStatus" video-on class="absolute right-[0.90625rem] top-3 flex justify-center items-center w-[7.5rem] h-[4.3125rem] bg-black rounded z-[1] border-4 border-green-500">
          </div>
          <div v-if="!callCamStatus" video-off class="absolute right-[0.90625rem] top-3 flex justify-center items-center w-[7.5rem] h-[4.3125rem] bg-black rounded z-[1] border-4 border-red-500">
            <img :src="videoIcon" alt="preview" class="w-7 h-7" />
          </div>
        </div>
      `,
    });
  }

  // Expose global registration method
  global.registerCallAcceptedCard = register;
})(window);
