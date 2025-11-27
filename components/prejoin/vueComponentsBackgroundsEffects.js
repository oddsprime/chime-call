// Vue component: SettingsBackgroundsEffects (Backgrounds & Effects section)
(function initSettingsBackgroundsEffects() {
  // guards
  if (typeof window === 'undefined' || typeof Vue === 'undefined') return;
  window.VueComponents = window.VueComponents || {};

  const { defineComponent, ref, nextTick, onMounted, onBeforeUnmount } = Vue;

  const SettingsBackgroundsEffects = defineComponent({
    name: 'SettingsBackgroundsEffects',
    props: {
      chimeCallSettings: {
        type: Object,
        default: null
      }
    },
    template: `
      <div class="flex flex-col border-t border-[#475467] gap-4 p-4">
        <!-- Accordion Header -->
        <header
          data-background-accordion-header
          @click="toggle"
          class="cursor-pointer flex justify-between py-2 items-center  w-full text-left transition-colors duration-200"
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
          class="transition-all duration-300 ease-in-out overflow-hidden"
          ref="content"
        >
          <!-- Toggle button (replaces checkbox) -->
          <div>
            <!-- Accessible toggle using a hidden checkbox + visual track/knob -->
            <label
              class="flex items-center justify-between gap-3 w-full max-w-[26.0rem] rounded-full px-3 py-2 cursor-pointer"
              title="Toggle background blur"
            >
              <span class="relative inline-block w-12 h-6">
                <!-- visually-hidden checkbox for accessibility -->
                <input
                  type="checkbox"
                  class="sr-only"
                  :checked="blurEnabled"
                  @change="toggleBlur"
                  aria-label="Apply Background Blur"
                />
                <!-- track -->
                <span :class="['absolute inset-0 rounded-full transition-colors', blurEnabled ? 'bg-green-500' : 'bg-gray-400']"></span>
                <span :class="['absolute top-[0.2rem] left-[0.2rem] w-5 h-5 bg-white rounded-full transition-transform', blurEnabled ? 'translate-x-6' : 'translate-x-0']"></span>
              </span>
              <span class="text-white font-medium text-base">Apply Background Blur</span>
            </label>
           </div>
 
           <div>
             <p class="text-white font-medium text-base">Virtual Background</p>
             <div class="mt-[10px] flex flex-wrap gap-2">
               <div
                 v-for="(bg, index) in backgroundImages"
                 :key="index"
                 @click="handleBackgroundImageClick(index, bg.url)"
                 :class="[
                   'h-[72px] w-[86px] rounded-xl overflow-hidden cursor-pointer',
                   chimeCallSettings?.callSettings?.backgroundImageUrl === bg.url ? 'border-[3px] border-green-400' : 'border border-[#FFFFFF80]'
                 ]"
               >
                 <img
                   :src="bg.url"
                   :alt="bg.name"
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
      const blurEnabled = ref(false);
      const selectedBackgroundIndex = ref(null);
      const backgroundImages = ref([
        { name: 'Red', url: 'https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/svgs/red.jpg' },
        { name: 'Blue', url: 'https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/svgs/blue.png' }
      ]);

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

      function toggleBlur() {
        blurEnabled.value = !blurEnabled.value;
        const enabled = blurEnabled.value;
        const blurLevel = enabled ? 'high' : 'off';
        console.log('[SettingsBackgroundsEffects] Blur toggled:', blurLevel);
        document.dispatchEvent(new CustomEvent('app:background:blur', {
          detail: {
            enabled,
            level: blurLevel,
            timestamp: Date.now()
          }
        }));
      }

      function handleBackgroundImageClick(index, imageUrl) {
        selectedBackgroundIndex.value = index;
        console.log('[SettingsBackgroundsEffects] Background clicked:', imageUrl);
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
        toggleBlur,
        backgroundImages,
        selectedBackgroundIndex,
        handleBackgroundImageClick
      };
    },
  });

  // keep the same global exposure pattern
  window.VueComponents.SettingsBackgroundsEffects = SettingsBackgroundsEffects;
})();
