// waiting-avatar.js
(function (global) {

    // ---- CONSTANTS ----
    const AVATAR_SRC =
      "https://fansocial-user-media.s3-accelerate.amazonaws.com/user-869/images/kf1amBZt0jnKUACX4ir3ICx7EbF3Jg/kf1amBZt0jnKUACX4ir3ICx7EbF3Jg.png";
  
    const LOADER_SRC =
      "https://new-stage.fansocial.app/wp-content/plugins/fansocial/dev/chimenew/assets/svgs/green-loader-2.svg";
  
    function register(app) {
      if (!app || typeof app.component !== "function") return;
  
      app.component("waiting-avatar", {
        props: {
          show: { type: Boolean, default: true }   // only show/hide
        },
  
        template:
          '<div v-if="show" class="relative w-[14rem] h-[14rem] flex items-center justify-center">' +
  
            // Avatar wrapper
            '<DefaultAvatar size="w-[9.5rem] h-[9.5rem]" />' +
  
            // Loader
            '<img src="' + LOADER_SRC + '" alt="loader" class="absolute top-[-2rem] left-[-2rem] min-w-[18rem] h-[17.8rem] animate-spinFast" />' +
  
          '</div>'
      });
    }
  
    global.registerWaitingAvatar = register;
  
  })(window);
  