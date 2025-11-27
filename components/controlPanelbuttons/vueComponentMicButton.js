// Microphone button component (global)
(function initMicrophoneButton() {
    if (!window) return;
    window.VueComponents = window.VueComponents || {};
    const { defineComponent } = Vue;
  
    const MicrophoneButton = defineComponent({
      name: 'MicrophoneButton',
      props: {
        // Boolean to control icon/state
        enabled: { type: Boolean, default: false },
        // Optional direct callback for backward compatibility
        onToggle: { type: Function, required: false },
        // Optional aria label override
        ariaLabel: { type: String, default: 'Toggle microphone' },
        // optional button classes for customization
        buttonClasses: { type: String, default: '' },
        // Button size class
        buttonSizeClasses: { type: String, default: 'h-[68px] w-[68px]' },
        // Icon size class
        iconSizeClasses: { type: String, default: 'w-8 h-8' },
      },
      emits: ['toggle'],
      template: `
        <button
          data-microphone-button
          type="button"
          :aria-pressed="enabled"
          :aria-label="ariaLabel"
          :class="[
            buttonClasses || (buttonSizeClasses + ' rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 shadow-[0_0_8px_0_rgba(0,0,0,0.25)]'),
            enabled ? 'bg-white/75' : 'bg-white/5'
          ]"
          @click="handleClick"
        >
          <img v-show="enabled"
            src="https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/svgs/mic.svg"
            :class="[iconSizeClasses, 'top-microphone-enabled-icon']" alt="Microphone">
          <img v-show="!enabled"
            src="https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/mute-microphone.svg"
            :class="[iconSizeClasses, 'top-microphone-disabled-icon']" alt="Microphone disabled">
        </button>
      `,
      methods: {
        handleClick() {
          // Prefer backward-compatible callback if provided, otherwise emit
          if (typeof this.onToggle === 'function') {
            try {
              this.onToggle();
            } catch (e) {
              console.warn('[MicrophoneButton] onToggle threw an error:', e);
            }
          } else {
            this.$emit('toggle');
          }
        }
      }
    });
  
    // Expose for global access
    window.VueComponents.MicrophoneButton = MicrophoneButton;
  
    // Registration helper
    window.registerMicrophoneButton = function registerMicrophoneButton(app) {
      if (!app || typeof app.component !== 'function') {
        console.warn('[MicrophoneButton] registerMicrophoneButton: invalid Vue app instance passed.');
        return;
      }
      app.component('microphone-button', MicrophoneButton);
    };
  })();
  