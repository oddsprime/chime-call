// default-avatar.js
(function (global) {
    function registerDefaultAvatar(app) {
      app.component("DefaultAvatar", {
        name: "DefaultAvatar",
        props: {
          src: { type: String, required: false }, // <-- NEW PROP
          initial: { type: String, required: false },
          size: { type: String, default: "w-9 h-9 lg:w-16 lg:h-16" }
        },
        computed: {
          finalSrc() {
            return (
              this.src ||
              "https://fansocial-user-media.s3-accelerate.amazonaws.com/user-869/images/kf1amBZt0jnKUACX4ir3ICx7EbF3Jg/kf1amBZt0jnKUACX4ir3ICx7EbF3Jg.png"
            );
          }
        },
        template: `
          <div
            :class="size + ' lg:flex flex-shrink-0 rounded-blob-1 aspect-square relative overflow-hidden'"
          >
            <!-- Image from prop OR fallback -->
            <img
              v-if="src!== ''"
               :src="src"
               alt="avatar"
               :data-initials="initial"
               class="w-full h-full object-cover absolute top-0 left-0"
               
            />
  
            <!-- Show initials when no src provided -->
            <template v-else-if="initial">
              <div 
              class="w-full h-full bg-purple-500 rounded-full flex items-center justify-center text-white text-xl font-bold relative"
              :data-initials="initial" 
              :data-avatar-url="not-found">
                {{ initial }}
              </div>
            </template>
          </div>
        `,
      });
    }
  
    global.registerDefaultAvatar = registerDefaultAvatar;
  })(window);
