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
                <div class="lg:flex w-[12.0rem] h-[12.0rem] flex-shrink-0 rounded-blob-1 aspect-square relative overflow-hidden w-9 h-9">
                 <img 
                   :src="calleeAvatar" 
                   alt="" 
                   class="w-100 h-100 fit--cover absolute top-0 left-0"
                   :data-initials="calleeInitials"
                   :data-avatar-url="calleeAvatar ? calleeAvatar : 'not-found'"
                 />
                </div>
                <span class="text-white text-sm truncate">Waiting for @{{ calleeUsername }} to join...</span>
            </div>
        `
      });
    }
    global.registerWaitingToJoin = register;
  })(window);
  