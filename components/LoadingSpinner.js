// LoadingSpinner.js - Reusable loading spinner component
(function (global) {
  function register(app) {
    if (!app) return;

    app.component('loading-spinner', {
      props: {
        size: { type: String, default: '3rem' }, // Size of the spinner (e.g., '3rem', '50px', '2em')
      },
      template: `
        <div style="
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 200;
          pointer-events: none;
          border-radius: 4px;
        ">
          <div :style="{
            width: size,
            height: size,
            border: '3px solid rgba(255, 255, 255, 0.3)',
            borderTopColor: '#fff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }"></div>
        </div>
      `
    });
  }

  // Expose the register function globally
  global.registerLoadingSpinner = register;
})(window);

