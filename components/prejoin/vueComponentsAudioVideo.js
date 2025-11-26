// Vue component: SettingsAudioVideo (Audio & Video Section)
(function initSettingsAudioVideo() {
  // guard: require window and global Vue
  if (typeof window === 'undefined' || typeof Vue === 'undefined') return;
  window.VueComponents = window.VueComponents || {};

  const { defineComponent, ref, nextTick, onMounted, onBeforeUnmount } = Vue;

  const SettingsAudioVideo = defineComponent({
    name: 'SettingsAudioVideo',
    template: `
      <div class="flex flex-col gap-2 md:!gap-0">
        <!-- Audio Video Accordion Header -->
        <header
          data-audio-video-accordion-header
          @click="toggle"
          class="flex justify-between items-center p-2 md:!p-4 cursor-pointer hover:bg-white/5 transition-colors duration-200"
          :aria-expanded="isOpen.toString()"
        >
          <div class="flex items-center gap-2">
            <img src="assets/settings-02.svg" alt="icon" />
            <h2 class="text-white lg:text-base text-sm font-medium">Audio &amp; Video Setting</h2>
          </div>
          <img
            src="assets/chevron-down-white.svg"
            alt="icon"
            class="transition-transform duration-200"
            :class="{ 'rotate-180': isOpen }"
          />
        </header>

        <!-- Audio Video Accordion Content -->
        <div
          data-audio-video-accordion-content
          :data-open="isOpen ? 'true' : 'false'"
          :class="isOpen ? 'flex flex-col gap-4' : 'hidden'"
          class="transition-all duration-300 ease-in-out overflow-hidden px-2 md:!px-4 pb-2 md:!pb-4"
          ref="content"
        >
        <div class="status-section" data-cam-mic-element="device-select" style="margin-top: 20px;">
          <label>Camera:</label>
          <select data-cam-mic-element="video-select" data-camera-select></select>
          <span data-cam-mic-element="selected-camera-label" style="font-size: 0.85em; color: #6c757d;"></span>
          <label style="margin-left: 10px;">Mic:</label>
          <select data-cam-mic-element="audio-select" data-microphone-select></select>
          <span data-cam-mic-element="selected-microphone-label" style="font-size: 0.85em; color: #6c757d;"></span>
        </div>
        </div>
      </div>
    `,
    setup() {
      const accordionId = 'settings-audio-video';
      // open by default
      const isOpen = ref(true);
      const content = ref(null);

      // listen for other accordions opening
      function onAccordionOpen(e) {
        const incomingId = e?.detail;
        if (incomingId && incomingId !== accordionId) {
          isOpen.value = false;
        }
      }

      async function toggle() {
        const willOpen = !isOpen.value;
        isOpen.value = willOpen;
        // if opening, broadcast to others
        if (willOpen && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('accordion-open', { detail: accordionId }));
        }
        await nextTick();
      }

      onMounted(() => {
        // notify others on mount so only this stays open
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('accordion-open', { detail: accordionId }));
        }
        window.addEventListener('accordion-open', onAccordionOpen);
      });

      onBeforeUnmount(() => {
        window.removeEventListener('accordion-open', onAccordionOpen);
      });

      return {
        isOpen,
        content,
        toggle,
      };
    },
  });

  // expose to window for your existing registration flow
  window.VueComponents.SettingsAudioVideo = SettingsAudioVideo;
})();
