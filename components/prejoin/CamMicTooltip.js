// CamMicTooltip.js
(function (global) {
    function register(app) {
      if (!app) return;
  
      app.component('cam-mic-tooltip', {
        props:{
          isVisible:{type: Boolean, default: false}
        },
        template: `
            <div v-if="isVisible" class="tooltip-wrapper bg-white/70 flex justify-center absolute top-[-70px] w-[34.0rem] rounded-xl px-3 py-2
                after:content-[''] after:absolute after:bottom-[-1.6rem] after:left-1/2 after:-translate-x-1/2
                after:border-8 after:border-transparent after:border-t-white/70"
            >

                <div class="always-visible-tooltip text-[#101828] text-center font-poppins text-[1.2rem] font-medium leading-[1.8rem]" >
                    It looks like your camera and mic are off. Turn them on for a smoother,
                    more engaging experience!
                </div>
            </div>
        `,
      });
    }
  
    // Expose global registration method
    global.registerCamMicTooltip = register;
  })(window);
  
