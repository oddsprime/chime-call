// vueComponentBottomLeftInfo.js
(function (global) {
  function register(app) {
    app.component('bottom-left-info', {
      props: {
        userInitials: { type: String, default: 'UN' },
        avatarSrc: { type: String, default: '' },
        userName: { type: String, default: '' },
        modeText: { type: String, default: '' },
      },
      template: `
        <div class="lg:flex items-center gap-2 xl:!gap-4 xl:w-1/3 hidden">
          <div class="lg:flex hidden w-16 h-16 flex-shrink-0 rounded-blob-1 aspect-square relative overflow-hidden w-9 h-9">
            <img 
              v-if="avatarSrc" 
              :src="avatarSrc" 
              alt="" 
              class="w-100 h-100 fit--cover absolute top-0 left-0"
              :data-initials="userInitials"
              :data-avatar-url="avatarSrc ? avatarSrc : 'not-found'"
            >
            <img 
              v-else
              src="" 
              alt="" 
              class="w-100 h-100 fit--cover absolute top-0 left-0"
              :data-initials="userInitials"
              data-avatar-url="not-found"
            >
          </div>
          <div class="flex-1">
            <div class="lg:flex hidden items-center gap-1">
              <span class="text-white text-sm font-medium truncate" data-call-type-text>
                {{ modeText }} {{ userName }}
              </span>
              <img src="https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/svgs/info-icon.svg"
                   class="w-4 h-4" />
            </div>
            <div class="flex xl:flex-row items-center gap-2 h-[30px]">
              <span class="lg:flex hidden text-white text-base font-medium whitespace-nowrap" data-meeting-time>November 5, 2025</span>
              <div class="lg:flex hidden items-center gap-1 px-2 justify-center rounded-pill bg-[#5549FF] h-[18px]"
                   data-status-indicator>
                <div class="lg:flex hidden w-2 h-2 rounded-full bg-white" data-status-dot></div>
                <span class="text-white text-xs font-medium whitespace-nowrap" data-status-text>in 5 min</span>
              </div>
            </div>
          </div>
        </div>
      `
    });
  }
  global.registerBottomLeftInfo = register;
})(window);
