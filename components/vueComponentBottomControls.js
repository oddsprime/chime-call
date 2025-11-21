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
      computed: {
        containerClass() {
          const base =
            'justify-center lg:justify-between lg:p-4 flex md:gap-0 gap-4 left-0 lg:left-1 md:rounded-none rounded-full items-center absolute bottom-0 md:bottom-0 lg:!bottom-1 lg:!rounded-b-1 sm:pb-[1.0rem]  pb-[0.8rem]';
          const bg =
            'lg:bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.75)_100%)]';
          const widthClass = this.chimeCallSettings?.callChatStatus
            ? 'w-full lg:[width:calc(100%-414px)]'
            : 'w-[calc(100%-10px)]';
          return `${widthClass} ${bg} ${base}`;
        },
      },
      template: `
        <div :class="containerClass">
          <bottom-left-info :user-initials="userInitials" />
          <div data-bottom-panel-center-buttons class="flex justify-center items-center gap-3 lg:gap-4 flex-none lg:flex-1 lg:w-1/3">
            <bottom-center-controls
              :toggle-camera="toggleCamera"
              :toggle-microphone="toggleMicrophone"
              :chime-call-settings="chimeCallSettings"
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
