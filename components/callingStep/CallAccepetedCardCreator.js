// IncomingCall.js
(function (global) {
    function register(app) {
      if (!app) return;
      app.component('creator-call-acepted', {
        props: {
          show: { type: Boolean, default: false },
          calleName: { type: String, default: 'SirStrawberry' },
          calleHandle: { type: String, default: '@sammisjelly187' },
          heading: { type: String, default: 'Call Accepted!' },
        },
        emits: ['accept', 'decline', 'options'],
        template: `
          <div
          v-if="show"
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
              <waiting-avatar :show="true"></waiting-avatar>

  
              <!-- name & username container -->
              <div class="flex flex-col justify-center items-center gap-1">
                <h3 class="text-base font-medium text-white">{{ calleName }}</h3>
                <span class="text-xs leading-normal text-[#98A2B3]">{{ calleHandle }}</span>
              </div>
            </div>
          </div>
        `,
      });
    }
  
    // Expose to global scope
    global.registerAcceptedCreatorCard = register;
  })(window);
  