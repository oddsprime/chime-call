// chimeSettingsUtility.js
// Global utility for accessing Chime call settings (camera/microphone state)
// Provides clear, readable functions for all templates

(function initChimeSettingsUtility() {
  if (typeof window === 'undefined') return;

  // Initialize settings if not already initialized
  if (!window.settings) {
    console.warn('[ChimeSettingsUtility] window.settings not initialized, creating default');
    window.settings = {
      callCamStatus: false,
      callMicStatus: false,
      callChatStatus: false,
      userAvatarUrl: '',
      userType: '',
      // Store all attendee video/audio states (single source of truth)
      attendees: {}  // { 'attendee-id': { videoEnabled: bool, audioEnabled: bool } }
    };
  }
  
  // Ensure attendees object exists even if settings was pre-initialized
  if (!window.settings.attendees) {
    window.settings.attendees = {};
  }

  // Global utility object
  window.ChimeSettingsUtility = {
    /**
     * Check if camera is currently ON
     * @returns {boolean} true if camera is on, false if off
     */
    isCameraOn() {
      return window.settings?.callCamStatus === true;
    },

    /**
     * Check if camera is currently OFF
     * @returns {boolean} true if camera is off, false if on
     */
    isCameraOff() {
      return !window.settings?.callCamStatus;
    },

    /**
     * Check if microphone is currently ON
     * @returns {boolean} true if microphone is on, false if off
     */
    isMicrophoneOn() {
      return window.settings?.callMicStatus === true;
    },

    /**
     * Check if microphone is currently OFF
     * @returns {boolean} true if microphone is off, false if on
     */
    isMicrophoneOff() {
      return !window.settings?.callMicStatus;
    },

    /**
     * Get camera status (for reactive Vue computed properties)
     * Returns the reactive property directly so Vue can track changes
     * @returns {boolean} current camera status
     */
    getCameraStatus() {
      if (!window.settings) return false;
      // Access the property directly so Vue reactivity works
      return window.settings.callCamStatus ?? false;
    },

    /**
     * Get microphone status (for reactive Vue computed properties)
     * Returns the reactive property directly so Vue can track changes
     * @returns {boolean} current microphone status
     */
    getMicrophoneStatus() {
      if (!window.settings) return false;
      // Access the property directly so Vue reactivity works
      return window.settings.callMicStatus ?? false;
    },

    /**
     * Check if settings are initialized
     * @returns {boolean} true if settings exist
     */
    isInitialized() {
      return typeof window.settings !== 'undefined' && window.settings !== null;
    },

    /**
     * Get attendee video/audio state from settings
     * @param {string} attendeeId - Chime attendee ID
     * @returns {{ videoEnabled: boolean, audioEnabled: boolean }}
     */
    getAttendeeState(attendeeId) {
      if (!window.settings?.attendees) {
        window.settings.attendees = {};
      }
      const state = window.settings.attendees[attendeeId] || { videoEnabled: false, audioEnabled: false };
      
      // DEBUG: Log first time state is read for this attendee
      if (!window.settings.attendees[attendeeId]) {
        console.log(`[ChimeSettingsUtility] ⚠️ No state found for ${attendeeId.substring(0,8)}... - returning default:`, state);
      }
      
      return state;
    },
    
    /**
     * Set attendee video/audio state in settings (single source of truth)
     * @param {string} attendeeId - Chime attendee ID
     * @param {{ videoEnabled?: boolean, audioEnabled?: boolean }} state
     */
    setAttendeeState(attendeeId, state) {
      if (!window.settings?.attendees) {
        window.settings.attendees = {};
      }
      const current = window.settings.attendees[attendeeId] || {};
      window.settings.attendees[attendeeId] = {
        ...current,
        ...state
      };
      
      console.log(`[ChimeSettingsUtility] ✅ Set attendee state for ${attendeeId.substring(0,8)}...`, window.settings.attendees[attendeeId]);
      
      // Trigger Vue reactivity if using Vue
      if (window.vueApp?.$forceUpdate) {
        window.vueApp.$forceUpdate();
      }
    },
    
    /**
     * Remove attendee state (on disconnect)
     * @param {string} attendeeId - Chime attendee ID
     */
    removeAttendeeState(attendeeId) {
      if (window.settings?.attendees?.[attendeeId]) {
        delete window.settings.attendees[attendeeId];
        console.log(`[ChimeSettingsUtility] 🗑️ Removed attendee state for ${attendeeId.substring(0,8)}...`);
      }
    },
    
    /**
     * Get all attendee states
     * @returns {Object} All attendee states
     */
    getAllAttendeeStates() {
      return window.settings?.attendees || {};
    }
  };

  console.log('[ChimeSettingsUtility] ✅ Global utility initialized');
})();

