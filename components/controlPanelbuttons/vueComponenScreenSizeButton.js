// Global Vue component: ToggleScreensize (renders button, emits 'toggle' on click)
(function initToggleScreensize() {
  if (!window) return;
  window.VueComponents = window.VueComponents || {};

  const { defineComponent } = Vue;

  const ToggleScreensize = defineComponent({
    name: 'ToggleScreensize',
    emits: ['toggle'],
    data() {
      return {
        isFullscreen: false
      };
    },
    methods: {
      handleToggle() {
        this.isFullscreen = !this.isFullscreen;
        
        // Toggle NEW data-fullscreen attribute on [data-chime-templates]
        const element = document.querySelector('[data-chime-templates]');
        if (element) {
          if (this.isFullscreen) {
            element.setAttribute('data-fullscreen', '');
            console.log('[ToggleScreensize] ✅ Added data-fullscreen attribute');
          } else {
            element.removeAttribute('data-fullscreen');
            console.log('[ToggleScreensize] ✅ Removed data-fullscreen attribute');
          }
        } else {
          console.warn('[ToggleScreensize] ❌ Could not find [data-chime-templates] element');
        }
        
        this.$emit('toggle', this.isFullscreen);
      }
    },
    template: `
      <div
        data-toggle-screensize
        class="w-12 lg:w-17 h-12 lg:h-17 rounded-full bg-white/10 hidden sm:flex lg:flex items-center justify-center cursor-pointer"
        role="button"
        aria-label="Toggle fullscreen"
        @click="handleToggle"
      >
        <img
          :src="isFullscreen 
            ? 'https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/svgs/minimize-02.svg'
            : 'https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/svgs/maximize-02.svg'"
          class="w-[2.2rem] lg:w-8 h-[2.2rem] lg:h-8"
          :alt="isFullscreen ? 'Exit fullscreen' : 'Toggle fullscreen'"
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
