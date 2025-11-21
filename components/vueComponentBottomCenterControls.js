// vueComponentBottomCenterControls.js
(function (global) {
  function register(app) {
    app.component('bottom-center-controls', {
      props: {
        toggleCamera: { type: Function, required: false },
        toggleMicrophone: { type: Function, required: false },
        chimeCallSettings: { type: Object, required: false },
      },
      template: `
      <camera-button 
        :enabled="chimeCallSettings.callCamStatus" 
        @toggle="toggleCamera"
        button-size-classes="w-12 lg:w-17 h-12 lg:h-17"
        icon-size-classes="w-[2.2rem] lg:w-8 h-[2.2rem] lg:h-8"
      />
      <microphone-button
        :enabled="chimeCallSettings.callMicStatus"
        @toggle="toggleMicrophone"
        button-size-classes="w-12 lg:w-17 h-12 lg:h-17"
        icon-size-classes="w-[2.2rem] lg:w-8 h-[2.2rem] lg:h-8"
      />
      <toggle-screensize @toggle="handleToggleFullscreen"></toggle-screensize>
      
      <end-call-button
        :icon="endCallIcon"
        btn-size="w-12 lg:w-17 h-12 lg:h-17"
        img-size="w-[2.2rem] lg:w-8 h-[2.2rem] lg:h-8"
        @click="$emit('end-call')"
      ></end-call-button>


      `
    });
  }
  global.registerBottomCenterControls = register;
})(window);
