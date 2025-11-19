(function (global) {
    function register(app) {
      app.component('end-call-button', {
        template: `
            <div class="h-[68px] w-[68px] rounded-full bg-[#FF4405] flex items-center justify-center cursor-pointer" aria-label="Toggle chat">
              <img src="https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/svgs/Communication.svg" class="w-8 h-8" alt="Chat">
            </div>
        `
      });
    }
    global.registerEndCallButton = register;
  })(window);
  