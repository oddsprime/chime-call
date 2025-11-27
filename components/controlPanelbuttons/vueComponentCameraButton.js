// Camera button component (global)
(function initCameraButton() {
    if (!window) return;
    window.VueComponents = window.VueComponents || {};
    const { defineComponent } = Vue;
  
    const CameraButton = defineComponent({
      name: 'CameraButton',
      props: {
        // boolean to control icon/state
        enabled: { type: Boolean, default: false },
        // optional direct callback for backward compatibility
        onToggle: { type: Function, required: false },
        // optional aria label override
        ariaLabel: { type: String, default: 'Toggle camera' },
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
          data-camera-button
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
            src="https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/svgs/camera-icon.svg"
            :class="[iconSizeClasses, 'top-microphone-enabled-icon']" alt="Video camera">
          <img v-show="!enabled"
            src="https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/disableCamera.svg"
            :class="[iconSizeClasses, 'top-microphone-disabled-icon']" alt="Video camera disabled">
        </button>
      `,
      methods: {
        handleClick() {
          // Prefer backwards-compatible callback if provided, otherwise emit event
          if (typeof this.onToggle === 'function') {
            try {
              this.onToggle();
            } catch (e) {
              // keep the app robust if callback throws
              console.warn('[CameraButton] onToggle threw an error:', e);
            }
          } else {
            this.$emit('toggle');
          }
        }
      }
    });
  
    // expose component constructor for manual use / tests
    window.VueComponents.CameraButton = CameraButton;
  
    // function to register into a Vue app instance (same style as your existing code)
    window.registerCameraButton = function registerCameraButton(app) {
      if (!app || typeof app.component !== 'function') {
        console.warn('[CameraButton] registerCameraButton: invalid Vue app instance passed.');
        return;
      }
      app.component('camera-button', CameraButton);
    };
  })();
  