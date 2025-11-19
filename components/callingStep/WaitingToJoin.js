(function (global) {
    function register(app) {
      app.component('waiting-to-join', {
        template: `
           <div class="absolute h-full w-full flex justify-center items-center gap-4 flex-col bg-black/75">
                <div class="lg:flex w-[12.0rem] h-[12.0rem] flex-shrink-0 rounded-blob-1 aspect-square relative overflow-hidden w-9 h-9">
                 // <div data-user-initial="" class="w-full h-full bg-purple-500 rounded-full flex items-center justify-center text-white text-xl font-bold rounded-blob-1 aspect-square relative overflow-hidden w-9 h-9">
                 // UN 
                 //</div>
                 <img src="https://fansocial-user-media.s3-accelerate.amazonaws.com/user-869/images/kf1amBZt0jnKUACX4ir3ICx7EbF3Jg/kf1amBZt0jnKUACX4ir3ICx7EbF3Jg.png" alt="" class="w-100 h-100 fit--cover absolute top-0 left-0"></div>
                <span class="text-white text-sm truncate">Waiting for @jennyben to join...</span>
            </div>
        `
      });
    }
    global.registerWaitingToJoin = register;
  })(window);
  