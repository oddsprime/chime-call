// vueComponentBottomRightControls.js
(function (global) {
    function register(app) {
      app.component('tip-buttons', {
        template: `
            <div class="w-12 lg:w-17 h-12 lg:h-17 rounded-full bg-white/10 flex items-center justify-center cursor-pointer shadow-[0_0_8px_0_rgba(0,0,0,0.25)]" aria-label="Toggle chat">
              <img src="https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/svgs/token.svg" class="w-[2.2rem] lg:w-8 h-[2.2rem] lg:h-8" alt="Chat">
            </div>
        `
      });
    }
    global.registerTipButtons = register;
  })(window);
  