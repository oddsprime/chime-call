// IncomingCall.js
(function (global) {
    function register(app) {
      if (!app) return;
      app.component('incoming-call', {
        props: {
          show: { type: Boolean, default: false },
          callerName: { type: String, default: 'SirStrawberry' },
          callerHandle: { type: String, default: '@sammisjelly187' },
          avatarSrc: { type: String, default: '' },
          userInitials: { type: String, default: '' },
          loaderSrc: { type: String, default: 'https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/svgs/green-loader-2.svg' },
          acceptIcon: { type: String, default: 'https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/svgs/phone-1.svg' },
          declineIcon: { type: String, default: 'https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/svgs/phone-x.svg' },
          optionsIcon: { type: String, default: 'https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/svgs/dots-horizontal-gray.svg' },
          endCallIcon: { type: String, default: 'https://i.ibb.co.com/nshWZFfD/Communication.webp' },
          heading: { type: String, default: 'Incoming Video Call' },
          headerIcon: { type: String, default: 'https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/svgs/phone-call-01.svg' },
          callState: { type: String, default: 'incomingVideoCall' }, // 'incomingVideoCall' | 'incomingAudioCall' | 'callAccepted'
        },
        emits: ['accept', 'decline', 'options', 'end-call'],
        computed: {
          isAccepted() {
            return this.callState === 'callAccepted';
          },
          isIncoming() {
            return this.callState === 'incomingVideoCall' || this.callState === 'incomingAudioCall';
          },
          headerIconSrc() {
            return this.heading === 'Call Accepted!' 
              ? 'https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/svgs/phone-incoming-02.svg'
              : this.headerIcon;
          }
        },
        template: `
          <div
          v-if="show"
            class="w-full md:w-[30rem] lg:w-[30rem] flex flex-col justify-center items-center gap-6 px-2 py-4 md:!px-4 rounded-t-[0.9375rem] md:rounded-[0.9375rem] bg-[#0C111DE5] absolute  md:relative lg:relative bottom-0"
          >
            <!-- header -->
            <div class="flex items-center gap-2">
              <img
               :src="headerIconSrc"
                 alt="phone-status"
                 class="w-6 h-6"
               />
               <h2 class="text-lg font-bold text-white">{{ heading }}</h2>
             </div>
  
            <!-- user info section -->
            <div class="flex flex-col justify-center items-center gap-2">
              <!-- avatar-container -->
              <div class="relative w-[14rem] h-[14rem] flex items-center justify-center">
                    <DefaultAvatar
                      :src="avatarSrc"
                      :initial="userInitials"
                      size="w-[9.5rem] h-[9.5rem]"
                    />
                    <img
                    :src="loaderSrc"
                    alt="green-loader"
                    class="absolute top-[-2rem] left-[-2rem] min-w-[18rem] h-[17.8rem] animate-spinFast"
                    />
                </div>
  
              <!-- name & username container -->
              <div class="flex flex-col justify-center items-center gap-1">
                <h3 class="text-base font-medium text-white">{{ callerName }}</h3>
                <span class="text-xs leading-normal text-[#98A2B3]">{{ callerHandle }}</span>
              </div>
            </div>
  
            <!-- bottom-section -->
            <div class="flex flex-col justify-center items-center gap-3 w-full">
              <!-- Accept/Decline buttons - only show for incoming calls -->
              <div v-if="isIncoming" class="flex gap-2 w-full">
                <button
                  @click="() => { console.log('[IncomingCall] Accept button clicked'); $emit('accept'); }"
                  id="btnAccept"
                  class="flex justify-center items-center gap-1 w-full h-10 bg-[#07F468] px-3 py-2 rounded cursor-pointer"
                >
                  <img :src="acceptIcon" alt="accept" class="w-6 h-6" />
                  <span class="text-sm font-semibold text-[#0C111D] uppercase">Accept</span>
                </button>
  
                <button
                  @click="$emit('decline')"
                  class="flex justify-center items-center gap-1 w-full h-10 bg-[#EE3400] px-3 py-2 rounded cursor-pointer"
                >
                  <img :src="declineIcon" alt="decline" class="w-6 h-6" />
                  <span class="text-sm font-semibold text-white uppercase">Decline</span>
                </button>
              </div>
  
              <!-- End Call button - only show for accepted calls -->
              <div v-if="isAccepted" >
                <!-- cut-call -->
                <end-call-button
                  :icon="endCallIcon"
                  btn-size="w-12 h-12"
                  img-size="w-[2.2rem] h-[2.2rem]"
                  @click="$emit('end-call')"
                ></end-call-button>
              </div>
  
              <!-- Other Options - only show for incoming calls -->
              <div v-if="isIncoming" class="flex justify-center items-center w-full">
                <button
                @click="$emit('options')"
                class="flex items-center gap-0.5 text-sm font-medium text-[#98A2B3]"
              >
                <span>Other Options</span>
                <img :src="optionsIcon" alt="options" class="w-5 h-5" />
              </button>
              </div>
            </div>
          </div>
        `,
      });
    }
  
    // Expose to global scope
    global.registerIncomingCall = register;
  })(window);


  // <div class="flex justify-center items-center w-[9.5rem] h-[9.5rem] relative rounded-blob-1 aspect-square relative overflow-hidden">
  //                       <img :src="avatarSrc || ''" :data-initials="userInitials" :data-avatar-url="avatarSrc ? avatarSrc : 'not-found'" alt="user" class="w-100 h-100 fit--cover absolute top-0 left-0" />
  //                   </div>