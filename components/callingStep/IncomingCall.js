// IncomingCall.js
(function (global) {
    function register(app) {
      if (!app) return;
      app.component('incoming-call', {
        props: {
          show: { type: Boolean, default: false },
          callerName: { type: String, default: 'SirStrawberry' },
          callerHandle: { type: String, default: '@sammisjelly187' },
          avatarSrc: { type: String, default: 'https://fansocial-user-media.s3-accelerate.amazonaws.com/user-869/images/kf1amBZt0jnKUACX4ir3ICx7EbF3Jg/kf1amBZt0jnKUACX4ir3ICx7EbF3Jg.png' },
          loaderSrc: { type: String, default: 'https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/svgs/green-loader-2.svg' },
          acceptIcon: { type: String, default: 'https://i.ibb.co.com/tp6wnC7q/phone-1.webp' },
          declineIcon: { type: String, default: 'https://i.ibb.co.com/20sMWhjg/phone-x-1-1.webp' },
          optionsIcon: { type: String, default: 'https://i.ibb.co.com/67sJstbJ/dots-horizontal-gray.webp' },
          heading: { type: String, default: 'Incoming Video Call' },
        },
        emits: ['accept', 'decline', 'options'],
        template: `
          <div
            
            class="w-[30rem] flex flex-col justify-center items-center gap-6 p-4 rounded-[0.9375rem] bg-[#0C111DE5] relative"
          >
            <!-- header -->
            <div class="flex items-center gap-2">
              <img
                src="https://i.ibb.co.com/9khyD9Md/phone-incoming-02.webp"
                alt="phone-incoming"
                class="w-6 h-6"
              />
              <h2 class="text-lg font-bold text-white">{{ heading }}</h2>
            </div>
  
            <!-- user info section -->
            <div class="flex flex-col justify-center items-center gap-2">
              <!-- avatar-container -->
              <div class="relative w-[14rem] h-[14rem] flex items-center justify-center">
                    <div class="flex justify-center items-center w-[9.5rem] h-[9.5rem] relative rounded-blob-1 aspect-square relative overflow-hidden">
                        <img :src="avatarSrc" alt="user" class="w-100 h-100 fit--cover absolute top-0 left-0" />
                    </div>
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
              <!-- button-container -->
              <div class="flex gap-2 w-full">
                <button
                  @click="$emit('accept')"
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
  
              <!-- Other Options -->
              <div class="flex justify-center items-center w-full">
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
  