(function (global) {
  function register(app) {
    app.component('camera-mic-controls', {
      props: {
        toggleCamera: { type: Function, required: false },
        toggleMicrophone: { type: Function, required: false },
        chimeCallSettings: { type: Object, required: false },
      },
      template: `
      <camera-button 
        :enabled="chimeCallSettings.callCamStatus" 
        @toggle="toggleCamera" 
        button-size-classes="w-17 h-17"
        icon-size-classes="w-8 h-8"
      />
      <settings-trigger @toggle="onToggleSettings"></settings-trigger>
      <microphone-button
        :enabled="chimeCallSettings.callMicStatus"
        @toggle="toggleMicrophone"
        button-size-classes="w-17 h-17"
        icon-size-classes="w-8 h-8"
      />
  `
    });
  }
  global.registerCameraMicControls = register;
})(window);
