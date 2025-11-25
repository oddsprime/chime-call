// GlobalTerminateButton.js - Single global terminate button component
(function (global) {
  function register(app) {
    app.component('global-terminate-button', {
      emits: ['terminate'],
      template: `
        <button 
          type="button" 
          class="h-[68px] w-[68px] rounded-full bg-[#FF4405] flex items-center justify-center cursor-pointer" 
          aria-label="End call"
          @click="$emit('terminate')"
        >
          <img 
            src="https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/svgs/Communication.svg" 
            class="w-8 h-8" 
            alt="End call"
          >
        </button>
      `
    });
  }
  global.registerGlobalTerminateButton = register;
})(window);

