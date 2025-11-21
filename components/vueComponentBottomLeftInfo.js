// vueComponentBottomLeftInfo.js
(function (global) {
  function register(app) {
    app.component('bottom-left-info', {
      props: {
        userInitials: { type: String, default: 'UN' },
      },
      template: `
        <div class="lg:flex items-center gap-2 xl:!gap-4 xl:w-1/3 hidden">
          <DefaultAvatar size="w-16 h-16" />
          <div class="flex-1">
            <div class="lg:flex hidden items-center gap-1">
              <span class="text-white text-sm font-medium truncate" data-call-type-text>
                [[mode_text]] [[userName]]
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
