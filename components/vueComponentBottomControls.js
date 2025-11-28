(function (global) {
  function register(app) {
    app.component('bottom-controls', {
      props: {
        userInitials: { type: String, default: 'UN' },
        toggleCamera: { type: Function, required: false },
        toggleMicrophone: { type: Function, required: false },
        toggleChat: { type: Function, required: false },
        chimeCallSettings: { type: Object, required: false },
      },
      emits: ['end-call'],
      computed: {
        containerClass() {
          const base =
            'justify-center lg:justify-between lg:p-4 flex md:gap-0 gap-4 left-0 md:rounded-none rounded-full items-center absolute bottom-0 md:bottom-0 sm:pb-[1.0rem]  pb-[0.8rem]';
          const bg =
            '';
          const widthClass = this.chimeCallSettings?.callChatStatus
            ? 'w-full lg:[width:calc(100%-405px)]'
            : 'w-full lg:bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.75)_100%)]';
          return `${widthClass} ${bg} ${base}`;
        },
        // Get other user's data (caller sees callee, callee sees caller)
        otherUserInitials() {
          const currentSide = this.chimeCallSettings?.callSettings?.currentUserSide;
          if (currentSide === 'caller') {
            return this.chimeCallSettings?.callUserDetails?.callee?.initials || 'UN';
          } else if (currentSide === 'callee') {
            return this.chimeCallSettings?.callUserDetails?.caller?.initials || 'UN';
          }
          return this.chimeCallSettings?.callUserDetails?.callee?.initials || 
                 this.chimeCallSettings?.callUserDetails?.caller?.initials || 'UN';
        },
        otherUserAvatar() {
          const currentSide = this.chimeCallSettings?.callSettings?.currentUserSide;
          if (currentSide === 'caller') {
            return this.chimeCallSettings?.callUserDetails?.callee?.avatar || '';
          } else if (currentSide === 'callee') {
            return this.chimeCallSettings?.callUserDetails?.caller?.avatar || '';
          }
          return this.chimeCallSettings?.callUserDetails?.callee?.avatar || 
                 this.chimeCallSettings?.callUserDetails?.caller?.avatar || '';
        },
        otherUserUsername() {
          const currentSide = this.chimeCallSettings?.callSettings?.currentUserSide;
          let username = '';
          if (currentSide === 'caller') {
            username = this.chimeCallSettings?.callUserDetails?.callee?.username || '';
          } else if (currentSide === 'callee') {
            username = this.chimeCallSettings?.callUserDetails?.caller?.username || '';
          } else {
            username = this.chimeCallSettings?.callUserDetails?.callee?.username || 
                       this.chimeCallSettings?.callUserDetails?.caller?.username || '';
          }
          return username ? `@${username}` : '';
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
      template: `
        <div :class="containerClass">
           <bottom-left-info 
            :user-initials="otherUserInitials" 
            :avatar-src="otherUserAvatar"
            :user-name="otherUserUsername"
            :mode-text="callModeText"
          />
          <div class="flex justify-center items-center gap-4 flex-none lg:flex-1 lg:w-1/3">
            <bottom-center-controls
              :toggle-camera="toggleCamera"
              :toggle-microphone="toggleMicrophone"
              :chime-call-settings="chimeCallSettings"
              @end-call="$emit('end-call')"
            />
          </div>
          <bottom-right-controls
            :toggle-chat="toggleChat"
            :chime-call-settings="chimeCallSettings"
          />
        </div>
      `
    });
  }

  global.registerBottomControls = register;
})(window);
