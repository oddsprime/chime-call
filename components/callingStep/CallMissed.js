// CallAcceptedCard.js
(function (global) {
    function register(app) {
      if (!app) return;
  
      app.component('call-missed', {
        template: `
          <div class="w-[32.8rem] h-[32.8rem] flex flex-col bg-black/80 relative pt-[2.5rem] gap-[1.5rem]" >
          <!-- header -->
            <div class="flex items-center justify-center gap-2">
              <img
                src="https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/svgs/phone-x.svg"
                alt="phone-incoming"
                class="w-6 h-6"
              />
              <h2 class="text-lg font-bold text-white">Missed Video Call</h2>
            </div>
      <!-- calling-info-section -->
      <img src="https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/svgs/x-close-thin.svg" class="absolute h-[24px] w-[24px] top-1 right-1 cursor-pointer"/>
      <div
        class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-max flex flex-col justify-center items-center gap-4 pointer-events-none z-0"
      >
        <img
          src="https://i.ibb.co.com/ynbtT1F1/call-rejected.webp"
          alt="call-rejected"
          class="w-[120px] h-[121px]"
        />

        <span class="text-sm text-white text-center"
          >@jennyben did not answer your call...</span
        >
      </div>
    </div>
        `,
      });
    }
  
    // Expose global registration method
    global.registerCallMissed = register;
  })(window);
  
