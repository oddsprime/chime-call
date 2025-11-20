(function (global) {
  function register(app) {
    app.component('end-call-button', {
      props: {
        btnSize: { type: String, default: 'h-[68px] w-[68px]' },   // NEW
        imgSize: { type: String, default: 'w-8 h-8' },            // NEW
        icon: { type: String, default: '' }
      },
      emits: ['click'],   // ← IMPORTANT

      template: `
        <button
          @click="$emit('click')"
          :class="btnSize + ' rounded-full bg-[#FF4405] flex items-center justify-center cursor-pointer'"
          aria-label="End Call"
        >
          <img
            src="https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/svgs/Communication.svg"
            :class="imgSize"
            alt="end-call"
          />
        </button>
      `
    });
  }

  global.registerEndCallButton = register;
})(window);
