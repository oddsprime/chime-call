// waiting-avatar.js
(function (global) {

  const LOADER_SRC =
    "https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/svgs/green-loader-2.svg";

  function register(app) {
    if (!app || typeof app.component !== "function") return;

    app.component("waiting-avatar", {
      props: {
        show: { type: Boolean, default: true },

        // Outer container size
        wrapperSize: { type: String, default: "w-[14rem] h-[14rem]" },

        // Avatar size
        avatarSize: { type: String, default: "w-[9.5rem] h-[9.5rem]" },

        // NEW: Spinner styles as prop
        spinnerClass: {
          type: String,
          default: "top-[-2rem] left-[-2rem] min-w-[18rem] h-[17.8rem]"
        }
      },

      template:
        '<div v-if="show" :class="wrapperSize + \' relative flex items-center justify-center\'">' +

          // Avatar wrapper
          '<DefaultAvatar :size="avatarSize" />' +

          // Loader Spinner (now fully dynamic)
          '<img src="' + LOADER_SRC + '" alt="loader" :class="spinnerClass + \' absolute animate-spinFast\'" />' +

        '</div>'
    });
  }

  global.registerWaitingAvatar = register;

})(window);
