(function (global) {
    function register(app) {
      app.component('waiting-to-join', {
        props: {
          chimeCallSettings: { type: Object, required: false }
        },
        computed: {
          calleeInitials() {
            return this.chimeCallSettings?.callUserDetails?.callee?.initials || 'UN';
          },
          calleeAvatar() {
            return this.chimeCallSettings?.callUserDetails?.callee?.avatar || '';
          },
          calleeUsername() {
            return this.chimeCallSettings?.callUserDetails?.callee?.username || 'User';
          }
        },
        template: `
           <div class="absolute h-full w-full flex justify-center items-center gap-4 flex-col bg-black/75">
                <DefaultAvatar
                      :src="calleeAvatar"
                      :initial="calleeInitials"
                      size="w- w-[12.0rem] h-[12.0rem]"
                    />
                <span class="text-white text-sm truncate">Waiting for @{{ calleeUsername }} to join...</span>
            </div>
        `
      });
    }
    global.registerWaitingToJoin = register;
  })(window);
  