// vueComponentTemplateChimeCalleeConnected.js
(function initTemplateChimeCalleeConnected() {
  if (!window) return;
  window.VueComponents = window.VueComponents || {};

  const { defineComponent } = Vue;

  const TemplateChimeCalleeConnected = defineComponent({
    name: "TemplateChimeCalleeConnected",
    props: {
      substate: { type: String, default: "" },
      toggleCamera: { type: Function, required: false },
      toggleMicrophone: { type: Function, required: false },
      chimeCallSettings: { type: Object, required: false },
    },
    emits: ['end-call'],
     computed: {
      callerInitials() {
        return this.chimeCallSettings?.callUserDetails?.caller?.initials || 'UN';
      },
      callerAvatar() {
        return this.chimeCallSettings?.callUserDetails?.caller?.avatar || '';
      },
      callerUsername() {
        return this.chimeCallSettings?.callUserDetails?.caller?.username 
          ? `@${this.chimeCallSettings.callUserDetails.caller.username}` 
          : '';
      },
      callModeText() {
        const mediaType = this.chimeCallSettings?.callSettings?.mediaType;
        if (mediaType === 'video') {
          return 'Video Call';
        } else if (mediaType === 'audio') {
          return 'Audio Call';
        }
        return 'Call';
      },
    },
    components: (function () {
      const comps = {};
      const vc = window.VueComponents || {};
      if (vc.ConnectingSection) {
        comps.ConnectingSection = vc.ConnectingSection;
      }
      if (vc.PrejoinMobileHeader) {
        comps.PrejoinMobileHeader = vc.PrejoinMobileHeader;
      }
      if (vc.BackButton) {
        comps.BackButton = vc.BackButton;
      }
      if (vc.CameraMicControls) {
        comps.CameraMicControls = vc.CameraMicControls;
      }
      if (vc.MobileJoinButton) {
        comps.MobileJoinButton = vc.MobileJoinButton;
      }
      if (vc.SettingsPanel) {
        comps.SettingsPanel = vc.SettingsPanel;
      }
      if (vc.JoinCallButton) {
        comps.JoinCallButton = vc.JoinCallButton;
      }
      if (vc.StatusIcons) {
        comps.StatusIcons = vc.StatusIcons;
      }
      return comps;
    })(),
    mounted() {
      // When component mounts, trigger video preview sync if master video has stream
      // This ensures video elements that mount after initial sync get the stream
      this.$nextTick(() => {
        if (window.CamMicPermissionsHandler && typeof window.CamMicPermissionsHandler._syncMultipleVideoPreviews === 'function') {
          // Small delay to ensure DOM is fully ready
          setTimeout(() => {
            console.log('[TemplateChimeCalleeConnected] [mounted] Triggering video preview sync');
            window.CamMicPermissionsHandler._syncMultipleVideoPreviews();
          }, 150);
        }
      });
    },
    methods: {
      handleJoinClick() {
        let dispatchedUiState = false;
        if (window.CallHandler && typeof window.CallHandler.dipatchUI === "function") {
          try {
            window.CallHandler.dipatchUI("callee:connected", "connecting");
            dispatchedUiState = true;
          } catch (err) {
            console.error("[TemplateChimeCalleeConnected] CallHandler.dipatchUI error", err);
          }
        }

        if (!dispatchedUiState) {
          try {
            document.dispatchEvent(
              new CustomEvent("chime-ui::state", {
                detail: {
                  state: "callee:connected",
                  substate: "connecting",
                  ts: Date.now(),
                },
              })
            );
          } catch (err) {
            console.error("[TemplateChimeCalleeConnected] Fallback UI dispatch error", err);
          }
        }

        const detail = {
          source: "template-chime-callee-connected",
          ts: Date.now(),
          substate: this.substate,
          pendingCalleeJoin: (window.CallHandler && window.CallHandler._pendingCalleeJoin) || null,
        };

        try {
          document.dispatchEvent(new CustomEvent("chime:join:meeting", { detail }));
        } catch (err) {
          console.error("[TemplateChimeCalleeConnected] Error dispatching chime:join:meeting", err);
        }

        if (window.CallHandler && typeof window.CallHandler.handleManualCalleeJoin === "function") {
          try {
            window.CallHandler.handleManualCalleeJoin();
          } catch (err) {
            console.error("[TemplateChimeCalleeConnected] handleManualCalleeJoin error", err);
          }
        }
      },
    },
    template: `
      <div template-chime-callee-connected>
        <div class="w-full h-dvh max-h-dvh xl:h-screen relative bg-cover bg-center bg-no-repeat backdrop-blur-sm">
          <div class="w-full h-dvh lg:h-full max-h-dvh xl:max-h-full inset-0 bg-black/50 backdrop-blur-lg lg:p-2 flex items-center gap-2 mx-auto">
            <section class="flex-1 flex flex-col gap-2 relative h-dvh lg:h-full max-h-dvh lg:max-h-full">
              <div class="flex-1 relative rounded-card-xs bg-cover bg-center overflow-hidden">
                <div class="lg:h-full w-full h-screen">
                  <div class="person" data-local-video-sidebar="" hidden="">
                    <p><span class="handle">@local</span> — <span class="name">Local User</span></p>
                    <div class="aspect-[16/9] bg-black absolute w-full h-full object-cover rounded-md">
                      <video autoplay="" playsinline="" data-local="" style="width: 100%; background: rgb(0, 0, 0);"></video>
                      <div class="text-[0.75rem] opacity-90 max-w-[32.5rem]" data-status-self=""></div>
                    </div>
                  </div> 
                 
                  <!--<video data-cm-video-preview="" class="w-full h-full max-w-full object-cover rounded-[0.25rem] py-2 lg:py-0" autoplay="" playsinline=""></video>-->
                   <video data-cam-mic-element="video-preview" class="absolute w-full h-full max-w-full object-cover rounded-[0.25rem] " autoplay="" playsinline=""></video>

                  <!-- Status Icons - Simple HTML using Vue reactive data -->
                  <div style="position: absolute; top: 5px; right: 5px; z-index: 999; display: flex; gap: 8px; font-size: 11px; font-weight: bold; font-family: monospace; pointer-events: none;">
                    <span :style="{
                      color: chimeCallSettings && chimeCallSettings.callCamStatus ? '#0f0' : '#f00',
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      padding: '2px 6px',
                      borderRadius: '3px'
                    }">
                      {{ chimeCallSettings && chimeCallSettings.callCamStatus ? 'VID ON' : 'VID OFF' }}
                    </span>
                    <span :style="{
                      color: chimeCallSettings && chimeCallSettings.callMicStatus ? '#0f0' : '#f00',
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      padding: '2px 6px',
                      borderRadius: '3px'
                    }">
                      {{ chimeCallSettings && chimeCallSettings.callMicStatus ? 'MIC ON' : 'MIC OFF' }}
                    </span>
                  </div>

                  <connecting-section :show="substate === 'connecting'"></connecting-section>
                </div>
              </div>
              <prejoin-mobile-header 
                :mode-text="callModeText"
                :user-name="callerUsername"
              ></prejoin-mobile-header>
              <back-button :show="substate !== 'connecting'"></back-button>
              <div class="flex flex-col lg:flex-row z-10 gap-2 justify-between left-0 right-0 lg:rounded-none rounded-full items-center lg:relative absolute bottom-4 lg:bottom-0 lg:w-full w-full lg:mx-0 px-4 py-0">
                <bottom-left-info 
                  :user-initials="callerInitials" 
                  :avatar-src="callerAvatar"
                  :user-name="callerUsername"
                  :mode-text="callModeText"
                />
                <div class="flex items-center justify-center sm:gap-4 gap-[1.2rem] flex-1 sm:justify-center lg:relative relative pb-[4.8rem] lg:pb-[0rem] left-0 right-0 lg:mx-0 mx-auto lg:w-1/3 w-full md:w-[calc(100%-424px)] sm:w-full">
                  
                <div v-if="chimeCallSettings && !chimeCallSettings.callCamStatus" class="tooltip-wrapper bg-white/70 flex justify-center absolute top-[-70px] w-[34.0rem] rounded-xl px-3 py-2
                    after:content-[''] after:absolute after:bottom-[-1.6rem] after:left-1/2 after:-translate-x-1/2
                    after:border-8 after:border-transparent after:border-t-white/70"
                >
                    <div class="always-visible-tooltip text-[#101828] text-center font-poppins text-[1.2rem] font-medium leading-[1.8rem]" >
                        It looks like your camera or mic are off. Turn them on for a smoother, more engaging experience!
                    </div>
                </div>
                  <camera-mic-controls :toggle-camera="toggleCamera" :toggle-microphone="toggleMicrophone" :chime-call-settings="chimeCallSettings"/>
                </div>
                <div class="w-1/3"></div>
                <mobile-join-button :substate="substate" @join="handleJoinClick"></mobile-join-button>
              </div>
            </section>
            <settings-panel 
              :substate="substate" 
              :chime-call-settings="chimeCallSettings"
              @join="handleJoinClick"
            ></settings-panel>
          </div>
        </div>
      </div>
    `,
  });

  window.VueComponents.TemplateChimeCalleeConnected = TemplateChimeCalleeConnected;
})();