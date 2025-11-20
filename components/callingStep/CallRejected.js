// CallAcceptedCard.js
(function (global) {
    function register(app) {
      if (!app) return;
  
      app.component('call-rejected', {
        props:{
          handleText: { type: String, default: '@jennyben did not answer your call...' },
        },
        template: `
          <div class="w-[32.8rem] h-[32.8rem] flex flex-col bg-black/80 relative" >
      <!-- calling-info-section -->
      <div
        class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-max flex flex-col justify-center items-center gap-4 pointer-events-none z-0"
      >
        <img
          src="https://i.ibb.co.com/ynbtT1F1/call-rejected.webp"
          alt="call-rejected"
          class="w-[7.5rem] h-[7.5625rem]"
        />

        <span class="text-sm text-white text-center"
          >{{ handleText }}</span
        >
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
    </div>
        `,
      });
    }
  
    // Expose global registration method
    global.registerCallRejected = register;
  })(window);
  
