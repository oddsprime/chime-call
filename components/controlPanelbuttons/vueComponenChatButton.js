// vueComponentBottomRightControls.js
(function (global) {
  function register(app) {
    app.component('chat-button', {
      props: {
        toggleChat: { type: Function, required: false },
        chimeCallSettings: { type: Object, required: false },
      },
      mounted() {
        document.addEventListener('click', this.handleOutsideClick);
      },
      unmounted() {
        document.removeEventListener('click', this.handleOutsideClick);
      },
      methods: {
        handleOutsideClick(event) {
          const chatSection = document.getElementById('chat-siderbar');
          if (chatSection && !chatSection.contains(event.target)) {
            if (this.chimeCallSettings?.callChatStatus) {
              this.toggleChat && this.toggleChat();
            }
          }
        }
      },
      template: `
          <div data-icon-style="toggle" @click.stop="toggleChat"
                :class="['w-12 lg:w-17 h-12 lg:h-17 rounded-full flex items-center justify-center cursor-pointer transition-colors duration-300',
                  chimeCallSettings?.callChatStatus ? 'bg-white/75' : 'bg-white/10'
                ]"
               aria-label="Toggle chat">
               <img v-show="chimeCallSettings.callChatStatus" src="https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/svgs/message-dots-circle-black.svg" class="w-[2.2rem] lg:w-8 h-[2.2rem] lg:h-8 black-chat-icon" alt="Chat">
               <img v-show="!chimeCallSettings.callChatStatus" src="https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/svgs/chat-icon.svg" class="w-[2.2rem] lg:w-8 h-[2.2rem] lg:h-8" alt="Chat">
          </div>
      `
    });
  }
  global.registerChatButton = register;
})(window);
