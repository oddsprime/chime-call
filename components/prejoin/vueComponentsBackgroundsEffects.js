// Vue component: SettingsBackgroundsEffects (Backgrounds & Effects section)
(function initSettingsBackgroundsEffects() {
  // guards
  if (typeof window === 'undefined' || typeof Vue === 'undefined') return;
  window.VueComponents = window.VueComponents || {};

  const { defineComponent, ref, nextTick, onMounted, onBeforeUnmount } = Vue;

  const SettingsBackgroundsEffects = defineComponent({
    name: 'SettingsBackgroundsEffects',
    template: `
      <div class="flex flex-col border-t border-[#475467] gap-2 md:!gap-0">
        <!-- Accordion Header -->
        <header
          data-background-accordion-header
          @click="toggle"
          class="cursor-pointer hover:bg-white/5 flex justify-between items-center p-2 md:!p-4 w-full text-left transition-colors duration-200"
          :aria-expanded="isOpen.toString()"
        >
          <div class="flex items-center gap-2">
            <img src="assets/background-drop-icon.svg" alt="icon" />
            <span class="text-white text-base font-medium">BACKGROUNDS &amp; EFFECTS</span>
          </div>
          <img
            src="assets/chevron-down-white.svg"
            alt="icon"
            class="transition-transform duration-200"
            :class="{ 'rotate-180': isOpen }"
          />
        </header>

        <!-- Accordion Content -->
        <div
          data-backgrounds-accordion-content
          :data-open="isOpen ? 'true' : 'false'"
          :class="isOpen ? 'flex flex-col gap-4' : 'hidden'"
          class="transition-all duration-300 ease-in-out overflow-hidden px-2 md:!px-4 pb-2 md:!pb-4"
          ref="content"
        >
          <div>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                :checked="blurEnabled"
                @change="handleBlurChange"
                class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <span class="text-white font-medium text-base">Apply Background Blur</span>
            </label>
          </div>

          <div>
            <p class="text-white font-medium text-base">Virtual Background</p>
            <div class="mt-[10px] flex flex-wrap gap-2">
              <div
                v-for="i in 6"
                :key="i"
                @click="handleBackgroundClick(i, 'https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/backgrounds/bg' + i + '.jpg')"
                :class="[
                  'h-[72px] w-[86px] border rounded-xl overflow-hidden cursor-pointer',
                  selectedBackgroundIndex === i ? 'border-[3px] border-pink-500' : 'border border-[#FFFFFF80]'
                ]"
              >
                <img
                  :src="'https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/backgrounds/bg' + i + '.jpg'"
                  class="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    `,
    setup() {
      const accordionId = 'settings-backgrounds-effects';
      const isOpen = ref(false);
      const content = ref(null);
      const blurEnabled = ref(false); // Default OFF
      const selectedBackgroundIndex = ref(null); // Track selected virtual background

      function onAccordionOpen(e) {
        const incomingId = e?.detail;
        if (incomingId && incomingId !== accordionId) {
          isOpen.value = false;
        }
      }

      async function toggle() {
        const willOpen = !isOpen.value;
        isOpen.value = willOpen;
        if (willOpen && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('accordion-open', { detail: accordionId }));
        }
        await nextTick();
      }

      function handleBlurChange(event) {
        const enabled = event.target.checked;
        blurEnabled.value = enabled;
        
        // Dispatch event similar to call accepted flow
        const blurLevel = enabled ? 'high' : 'off';
        console.log('[SettingsBackgroundsEffects] Blur changed:', blurLevel);
        
        document.dispatchEvent(new CustomEvent('app:background:blur', {
          detail: {
            enabled: enabled,
            level: blurLevel,
            timestamp: Date.now()
          }
        }));
      }

      function handleBackgroundClick(index, imageUrl) {
        // Remove border from previously selected
        selectedBackgroundIndex.value = index;
        
        // Add pink border via class binding
        console.log('[SettingsBackgroundsEffects] Background clicked:', imageUrl);
        
        // Dispatch event similar to call controls
        document.dispatchEvent(new CustomEvent('app:background:image', {
          detail: {
            imageUrl: imageUrl,
            type: 'virtual-background',
            timestamp: Date.now()
          }
        }));
      }

      onMounted(() => {
        window.addEventListener('accordion-open', onAccordionOpen);
      });

      onBeforeUnmount(() => {
        window.removeEventListener('accordion-open', onAccordionOpen);
      });

      return { 
        isOpen, 
        content, 
        toggle, 
        blurEnabled, 
        handleBlurChange,
        selectedBackgroundIndex,
        handleBackgroundClick
      };
    },
  });

  // keep the same global exposure pattern
  window.VueComponents.SettingsBackgroundsEffects = SettingsBackgroundsEffects;
})();
