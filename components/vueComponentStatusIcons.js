// Status Icons Component - Camera & Mic Status Indicators
// Vue component for displaying video/audio status on video tiles
(function (global) {
  if (!window.Vue) {
    console.warn('[StatusIcons] Vue not available');
    return;
  }

  const { defineComponent, getCurrentInstance  } = Vue;

  const StatusIcons = defineComponent({
    name: 'StatusIcons',
    props: {
      attendeeId: {
        type: String,
        required: true
      }
    },
    setup(props) {
      const { ref, onMounted, onUnmounted } = Vue;
      
      // Reactive state that syncs from window.settings
      const videoEnabled = ref(false);
      const audioEnabled = ref(false);

      // NEW: dynamic position class
      const positionClass = ref("top-2");
      
      // CRITICAL: Store interval locally, not globally!
      let intervalId = null;
      
      // Sync from settings
      function syncFromSettings() {
        if (window.ChimeSettingsUtility) {
          const state = window.ChimeSettingsUtility.getAttendeeState(props.attendeeId);
          
          // DEBUG: Log state changes
          if (videoEnabled.value !== state.videoEnabled || audioEnabled.value !== state.audioEnabled) {
            console.log(`[StatusIcons] 🔄 State changed for ${props.attendeeId.substring(0, 8)}...`, {
              old: { video: videoEnabled.value, audio: audioEnabled.value },
              new: { video: state.videoEnabled, audio: state.audioEnabled },
              source: 'window.settings.attendees'
            });
          }
          
          videoEnabled.value = state.videoEnabled;
          audioEnabled.value = state.audioEnabled;
        }
      }
      
      // Sync on mount
      onMounted(() => {
        
        // Detect host-container parent
        const el = getCurrentInstance().proxy.$el;
        if (el.closest("#host-container")) {
          positionClass.value = "top-[4.8rem] lg:top-2";
        }

        syncFromSettings();
        
        // Watch for settings changes (poll every 100ms)
        // CRITICAL: Store in LOCAL variable, not global!
        intervalId = setInterval(syncFromSettings, 100);
        
        console.log(`[StatusIcons] ✅ Mounted for ${props.attendeeId.substring(0, 8)}... - syncing from settings every 100ms`);
      });
      
      // Cleanup on unmount
      onUnmounted(() => {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
          console.log(`[StatusIcons] 🧹 Unmounted for ${props.attendeeId.substring(0, 8)}... - cleared interval`);
        }
      });
      
      return { videoEnabled, audioEnabled, positionClass };
    },
    template: `
      <div :class="'status-icons absolute right-2 flex gap-3 z-50 pointer-events-none ' + positionClass" >
        <img v-show="!videoEnabled" src="https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/disableCamera.svg" class="h-[2.2rem] w-[2.2rem]" />
        <img v-show="!audioEnabled" src="https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/mute-microphone.svg" class="h-[2.2rem] w-[2.2rem]" />
      </div>
    `
  });

  // Expose component constructor
  window.VueComponents = window.VueComponents || {};
  window.VueComponents.StatusIcons = StatusIcons;

  // Register function for Vue app
  window.registerStatusIcons = function registerStatusIcons(app) {
    if (!app || typeof app.component !== 'function') {
      console.warn('[StatusIcons] registerStatusIcons: invalid Vue app instance passed.');
      return;
    }
    app.component('status-icons', StatusIcons);
  };

  console.log('[StatusIcons] ✅ Component registered');
})(window);

