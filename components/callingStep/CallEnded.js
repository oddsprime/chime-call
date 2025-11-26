// CallEnded.js
(function (global) {
    function register(app) {
      if (!app) return;
  
      app.component('call-ended', {
        props: {
          imageSrc: { 
            type: String, 
            default: 'https://i.ibb.co.com/ynbtT1F1/call-rejected.webp' 
          },
          message: { 
            type: String, 
            default: 'Call ended' 
          },
          showRejoinButton: { 
            type: Boolean, 
            default: true 
          },
          substate: {
            type: String,
            default: ''
          },
          state: {
            type: String,
            default: ''
          },
          chimeCallSettings: {
            type: Object,
            default: null
          }
        },
        computed: {
          displayMessage() {
            const isCaller = this.state === 'caller:terminated';
            const isCallee = this.state === 'callee:terminated';
            const substate = this.substate || '';
            
            // Get username - try multiple sources
            let usernameValue = '';
            
            // 1. Try from prop first
            if (this.chimeCallSettings && this.chimeCallSettings.callUserDetails) {
              if (isCaller) {
                usernameValue = this.chimeCallSettings.callUserDetails.callee?.username || '';
              } else if (isCallee) {
                usernameValue = this.chimeCallSettings.callUserDetails.caller?.username || '';
              }
            }
            
            // 2. Fallback to window.settings
            if (!usernameValue && typeof window !== 'undefined' && window.settings && window.settings.callUserDetails) {
              if (isCaller) {
                usernameValue = window.settings.callUserDetails.callee?.username || '';
              } else if (isCallee) {
                usernameValue = window.settings.callUserDetails.caller?.username || '';
              }
            }
            
            // 3. Fallback to window.mockCallData
            if (!usernameValue && typeof window !== 'undefined' && window.mockCallData) {
              if (isCaller) {
                usernameValue = window.mockCallData.targetUser?.username || '';
              } else if (isCallee) {
                usernameValue = window.mockCallData.targetUser?.username || '';
              }
            }
            
            // Format username with @ symbol, or use fallback
            const username = usernameValue ? `@${usernameValue}` : '@Username';
            
            console.log('[CallEnded] USERNAME RESOLUTION:', {
              state: this.state,
              substate,
              isCaller,
              isCallee,
              usernameValue,
              finalUsername: username,
              'prop.callUserDetails': this.chimeCallSettings?.callUserDetails,
              'window.settings.callUserDetails': window.settings?.callUserDetails,
              'window.mockCallData': window.mockCallData
            });
            
            // 1. No Answer (timeout)
            if (substate === 'No Answer') {
              return 'The call was not answered, try later.';
            }
            
            // 2. Insufficient tokens
            if (substate === 'insufficient_tokens') {
              return 'Call has ended due to insufficient tokens';
            }
            
            // 3. In a call (on_another_call) - intentional action
            if (substate === 'on_another_call') {
              if (isCaller || isCallee) {
                return 'You have ended the call';
              } else {
                return `<span>${username}</span> is in a call, try again later`;
              }
            }
            
            // 4. Blocked (Busy) - intentional action
            if (substate === 'Busy') {
              if (isCaller || isCallee) {
                return 'You have ended the call';
              } else {
                return `<span>${username}</span> is busy`;
              }
            }
            
            // 5. Callee declined before accepting OR from callAccepted state
            if (isCallee && substate === 'declined') {
              return 'You have declined the call';
            }
            
            // 6. Caller sees callee declined (caller receives declined from callee)
            if (isCaller && substate === 'declined') {
              return `<span>${username}</span> has declined the call`;
            }
            
            // 7. Caller cancelled before callee answered (caller in callWaiting state)
            if (isCaller && substate === 'caller_cancelled') {
              return 'You have cancelled the call';
            }
            
            // 8. Callee sees caller cancelled (callee receives cancelled from caller before answer)
            if (isCallee && substate === 'cancelled') {
              return `<span>${username}</span> cancelled the call`;
            }
            
            // 9. Other user ended the call (cancelled after answer)
            if (substate === 'cancelled') {
              return `<span>${username}</span> has ended the call`;
            }
            
            // Default fallback
            return this.message || 'Call ended';
          }
        },
        template: `
          <div class="w-[32.8rem] h-[32.8rem] flex flex-col bg-black/80 relative" >
          <!--close icon -->
          <img src="https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/svgs/x-close-thin.svg" class="absolute top-2 right-2  cursor-pointer"/>
      <!-- calling-info-section -->
      <div
        class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-max flex flex-col justify-center items-center gap-4 pointer-events-none z-0"
      >
        <img
          :src="imageSrc"
          alt="call-ended"
          class="w-[12.0rem] h-[12.1rem]"
        />

        <span class="text-sm text-white text-center" v-html="displayMessage"></span>
      </div>

      <!-- bottom-controls-section -->
      <div class="w-full h-full flex justify-end items-end flex-grow">
        <div class="w-full flex justify-center items-center p-4">
          <div class="flex items-center gap-3 py-2">
            <!-- rejoin button - hidden link only -->
            <a
              v-if="showRejoinButton"
              @click.prevent="handleRejoin"
              href="#"
              class="hidden"
              title="Rejoin Call"
            >
              Rejoin
            </a>
          </div>
        </div>
      </div>
    </div>
        `,
        methods: {
          handleRejoin() {
            console.log('[CallEnded] Rejoin button clicked - dispatching chime:rejoin event');
            document.dispatchEvent(new CustomEvent('chime:rejoin', {
              detail: {
                timestamp: Date.now()
              }
            }));
          }
        }
      });
    }
  
    // Expose global registration method
    global.registerCallEnded = register;
  })(window);
  

