// vueComponentBottomRightControls.js
(function (global) {
    function register(app) {
      app.component('settings-button', {
        template: `
            <div data-toggle-call-settings-panel
                 class="h-[68px] w-[48px] rounded-full bg-white/10 lg:flex hidden items-center justify-center cursor-pointer shadow-[0_0_8px_0_rgba(0,0,0,0.25)]"
                 aria-label="Toggle call settings">
              <img src="https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/svgs/three-dots.svg" class="w-8 h-8" alt="Call Settings">
            </div>
        `
      });
    }
    global.registerSettingsButton = register;
  })(window);
  