// IncomingCall.js
(function (global) {
    function register(app) {
      if (!app) return;
      app.component('creator-call-acepted', {
        props: {
          show: { type: Boolean, default: false },
          calleName: { type: String, default: 'SirStrawberry' },
          calleHandle: { type: String, default: '@sammisjelly187' },
          avatarSrc: { type: String, default: 'https://fansocial-user-media.s3-accelerate.amazonaws.com/user-869/images/kf1amBZt0jnKUACX4ir3ICx7EbF3Jg/kf1amBZt0jnKUACX4ir3ICx7EbF3Jg.png' },
          loaderSrc: { type: String, default: 'https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/svgs/green-loader-2.svg' },
          heading: { type: String, default: 'Call Accepted!' },
          endCallIcon: { type: String, default: 'https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/svgs/Communication.svg' },
        },
        emits: ['accept', 'decline', 'options', 'end-call'],
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
                <h3 class="text-base font-medium text-white">{{ calleName }}</h3>
                <span class="text-xs leading-normal text-[#98A2B3]">{{ calleHandle }}</span>
              </div>
            </div>

             <!-- cut-call -->
              <end-call-button
                :icon="endCallIcon"
                btn-size="w-12 h-12"
                img-size="w-[2.2rem] h-[2.2rem]"
                @click="$emit('end-call')"
              ></end-call-button>
          </div>
        `,
      });
    }
  
    // Expose to global scope
    global.registerAcceptedCreatorCard = register;
  })(window);
  