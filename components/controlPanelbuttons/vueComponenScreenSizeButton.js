// Global Vue component: ToggleScreensize (renders button, emits 'toggle' on click)
(function initToggleScreensize() {
  if (!window) return;
  window.VueComponents = window.VueComponents || {};

  const { defineComponent } = Vue;

  const ToggleScreensize = defineComponent({
    name: 'ToggleScreensize',
    emits: ['toggle'],
    template: `
      <div
        data-toggle-screensize
        class="w-12 lg:w-17 h-12 lg:h-17 rounded-full bg-white/10 hidden sm:flex lg:flex items-center justify-center cursor-pointer"
        role="button"
        aria-label="Toggle fullscreen"
        @click="$emit('toggle')"
      >
        <img
          src="https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/svgs/maximize-02.svg"
          class="w-[2.2rem] lg:w-8 h-[2.2rem] lg:h-8"
          alt="Toggle fullscreen"
        />
      </div>
    `,
  });

  // expose for manual access / reuse
  window.VueComponents.ToggleScreensize = ToggleScreensize;

  // registration helper (same style as your other register functions)
  window.registerToggleScreensize = function (app) {
    if (!app || typeof app.component !== 'function') {
      console.warn('[ToggleScreensize] Invalid Vue app instance.');
      return;
    }
    app.component('toggle-screensize', ToggleScreensize);
  };
})();
