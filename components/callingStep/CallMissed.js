// CallAcceptedCard.js
(function (global) {
    function register(app) {
      if (!app) return;
  
      app.component('call-missed', {
        template: `
          <div class="w-[30rem] h-[26.5rem] flex flex-col bg-black/80 relative pt-[3.2rem] gap-6 rounded-4" >
          <!-- header -->
            <div class="flex items-center justify-center gap-2">
              <img
                src="https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/svgs/phone-x.svg"
                alt="phone-incoming"
                class="w-6 h-6"
              />
              <h2 class="text-lg font-bold text-white">Missed Video Call</h2>
            </div>
      <!-- calling-info-section tt-->
      <img src="https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/svgs/x-close-thin.svg" class="absolute h-[24px] w-[24px] top-2 right-2 cursor-pointer"/>
      <div
        class=" w-full flex flex-col justify-center items-center gap-2 pointer-events-none"
      >
        <img
          src="https://i.ibb.co.com/ynbtT1F1/call-rejected.webp"
          alt="call-rejected"
          class="w-[120px] h-[121px]"
        />

        <span class="text-sm text-white text-center"
          >You missed a call from @sammisjelly187</span
        >
      </div>
    </div>
        `,
      });
    }
  
    // Expose global registration method
    global.registerCallMissed = register;
  })(window);
  
