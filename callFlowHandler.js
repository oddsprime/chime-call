/* ======================================================================
 * CLASS: CallHandler
 * - Pure dispatch + listeners. NO UI mutations.
 * - Alerts for ALL critical actions.
 * - Console logs EVERYWHERE (direct console.log).
 * - NO fallbacks (no "||" defaults).
 * - Instant one-on-one ONLY.
 * - 2min (120s) timeout ENDS THE FLOW FOR BOTH SIDES (for slow internet).
 * - meeting:ready includes {callerRole, calleeRole}; each side joins with its role.
 * - call:ringing is LOCAL-ONLY (no socket listener).
 * - On incoming, the callee/target IDs/roles come from SOCKET body (not from inputs).
 * - 🚨 NEW: single UI bridge method `dipatchUI()` invoked at EVERY step to trigger Vue.
 * - 🚨 NEW: caller also runs its own 25s ring timer (symmetry with callee).
 * ==================================================================== */

console.log("[CallHandler] [FIX v1.1] ✅ FIXED VERSION LOADED");

class CallHandler {
  /* === GLOBAL CONFIGURATION === */
  static CALLEE_MANUAL_JOIN_ENABLED = true; // set to false to auto join and not wait for connect.
 
  /* === STATE TRACKING === */
  static _currentUIState = null;
  static _currentUISubstate = null;
  static _lastDispatchTime = 0;
  static _duplicateThrottleMs = 50; // Only skip if duplicate within 50ms
  static _isCallTerminated = false; // Persistent flag - survives popup close
  
  /* === CALL ID TRACKING === */
  static _currentCallId = null; // Current active call ID
  static _terminatedCallIds = new Set(); // Set of terminated call IDs
  
  /* === CAMMIC INITIALIZATION === */
  static _camMicInitialized = false; // Track if CamMic has been initialized (first call only)
  
  /* === API ABORT CONTROL === */
  static _apiAbortController = null; // AbortController for canceling in-flight API requests
  
  /* === CAM/MIC PERMISSION FLOW === */
  static _camMicPermissionShownForCallId = null; // Guard: only show once per call
  static _nextStateAfterCamMicPermissions = null; // Store where to go after grant
  static _camMicPermissionTimer = null; // 20s timer for permission delay
  
  /* === BLOCKLIST === */
  static _blockedUserIds = new Set(); // Permanent blocked user IDs
  static _temporaryBlockedUsers = new Map(); // userId -> expiry timestamp
  static BLOCK_DURATION_HOURS = 24; // Temporary block duration
  static BLOCKED_USERS_KEY = 'chime_blocked_users'; // localStorage key for permanent blocks
  static TEMPORARY_BLOCKS_KEY = 'chime_temporary_blocks'; // localStorage key for temporary blocks

  /* === STATE RESET === */
  static resetUIState(clearTerminated = false) {
    console.log('[UI] Resetting UI state tracking (call ended)', { clearTerminated });
    CallHandler._currentUIState = null;
    CallHandler._currentUISubstate = null;
    CallHandler._lastDispatchTime = 0;
    if (clearTerminated) {
      console.log('[UI] Clearing terminated flag - new call starting');
      CallHandler._isCallTerminated = false;
    }
  }

  /* === CAMMIC INITIALIZATION === */
  static _ensureCamMicInitialized() {
    if (!CallHandler._camMicInitialized) {
      console.log('%c[CamMic] 🚀 Initializing CamMic permissions system (first call)', 'background: #17a2b8; color: white; font-weight: bold; padding: 5px;');
      window.dispatchEvent(new CustomEvent('CamMic:Init'));
      CallHandler._camMicInitialized = true;
      console.log('%c[CamMic] ✅ CamMic initialized - will not initialize again for subsequent calls', 'background: #28a745; color: white; font-weight: bold; padding: 5px;');
    } else {
      console.log('%c[CamMic] ⏭️ CamMic already initialized - skipping', 'background: #6c757d; color: white; font-weight: bold; padding: 5px;');
    }
  }

  /* === CLEANUP FOR NEW CALL === */
  static _cleanupForNewCall(newCallId, reason) {
    console.log('%c[CLEANUP] 🧹 Starting cleanup for new call', 'background: #ff6b6b; color: white; font-weight: bold; padding: 5px;', {
      newCallId,
      reason,
      previousCallId: CallHandler._currentCallId
    });
    
    // 1. Abort any pending API requests
    if (CallHandler._apiAbortController) {
      console.log('%c[CLEANUP] ❌ Aborting previous API requests', 'background: #ff6b6b; color: white; padding: 5px;');
      try {
        CallHandler._apiAbortController.abort();
      } catch (err) {
        console.warn('[CLEANUP] Error aborting API requests:', err);
      }
      CallHandler._apiAbortController = null;
    }
    
    // 2. Force leave Chime meeting if call ID changed
    if (CallHandler._currentCallId && CallHandler._currentCallId !== newCallId) {
      console.log('%c[CLEANUP] 🚪 Force leaving Chime meeting (call ID changed)', 'background: #ff6b6b; color: white; padding: 5px;', {
        oldCallId: CallHandler._currentCallId,
        newCallId
      });
      
      if (typeof coreChime !== 'undefined' && typeof coreChime.leave === 'function') {
        try {
          coreChime.leave(reason || 'New call starting');
        } catch (err) {
          console.warn('[CLEANUP] Error leaving Chime:', err);
        }
      }
    }
    
    // 3. Reset invite data
    console.log('%c[CLEANUP] 📋 Resetting invite data', 'background: #ff6b6b; color: white; padding: 5px;');
    CallHandler._invite = {
      callerId: null,
      calleeId: null,
      callerRole: null,
      callType: null,
      callerData: null,
      calleeData: null,
    };
    
    // 4. Clear user data
    console.log('%c[CLEANUP] 👤 Clearing user data', 'background: #ff6b6b; color: white; padding: 5px;');
    CallHandler._currentUserData = null;
    CallHandler._targetUserData = null;
    
    // 5. Clear pending callee join info
    CallHandler._pendingCalleeJoin = null;
    
    // 6. Reset chimeHandler alert flags
    if (typeof chimeHandler !== 'undefined') {
      console.log('%c[CLEANUP] 🔔 Resetting chimeHandler alert flags', 'background: #ff6b6b; color: white; padding: 5px;');
      chimeHandler._hasShownJoinedAlert = false;
      chimeHandler._hasShownConnectedAlert = false;
      chimeHandler._hasShownInCallAlert = false;
    }
    
    // 7. Reset Vue callSettings if available
    if (typeof window !== 'undefined' && window.vueApp && typeof window.vueApp.resetCallSettings === 'function') {
      console.log('%c[CLEANUP] ⚙️ Resetting Vue callSettings', 'background: #ff6b6b; color: white; padding: 5px;');
      try {
        window.vueApp.resetCallSettings();
      } catch (err) {
        console.warn('[CLEANUP] Error resetting Vue callSettings:', err);
      }
    }
    
    // 8. Clear UI state if needed (but keep terminated flag for proper flow)
    CallHandler._currentUIState = null;
    CallHandler._currentUISubstate = null;
    CallHandler._lastDispatchTime = 0;
    
    console.log('%c[CLEANUP] ✅ Cleanup complete', 'background: #28a745; color: white; font-weight: bold; padding: 5px;');
  }

  /* === COMPLETE STATE CLEAR === */
  static clearAllCallState() {
    console.log('%c[STATE CLEAR] 🧹 Clearing all call-related state', 'background: #6c757d; color: white; font-weight: bold; padding: 5px;');
    
    // Clear UI state
    CallHandler.resetUIState(true);
    
    // Clear call ID
    CallHandler._currentCallId = null;
    
    // Clear invite data (database IDs, meeting info, etc.)
    CallHandler._invite = {
      callerId: null,
      calleeId: null,
      callerRole: null,
      callType: null,
      callerData: null,
      calleeData: null,
    };
    
    // Clear pending callee join info
    CallHandler._pendingCalleeJoin = null;
    
    // Clear user data
    CallHandler._currentUserData = null;
    CallHandler._targetUserData = null;
    
    // Clear side tracking
    CallHandler._currentSide = null;
    
    // Clear in-call flag
    CallHandler._inCallOrConnecting = false;
    
    // Clear timers
    if (CallHandler._calleeRingTimerId) {
      clearTimeout(CallHandler._calleeRingTimerId);
      CallHandler._calleeRingTimerId = null;
    }
    if (CallHandler._callerRingTimerId) {
      clearTimeout(CallHandler._callerRingTimerId);
      CallHandler._callerRingTimerId = null;
    }
    if (CallHandler._callerGraceTimerId) {
      clearTimeout(CallHandler._callerGraceTimerId);
      CallHandler._callerGraceTimerId = null;
    }
    
    // Clear mockCallData state if it exists
    if (window.mockCallData) {
      window.mockCallData.isInGrace = false;
      // Note: We don't clear all mockCallData as it may contain persistent user info
    }
    
    console.log('%c[STATE CLEAR] ✅ All call state cleared', 'background: #28a745; color: white; font-weight: bold; padding: 5px;');
  }
  
  /* === CALL ID METHODS === */
  static _generateCallId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `call_${timestamp}_${random}`;
  }
  
  static setCallId(callId) {
    console.log(`%c[CALL ID] Setting call ID: ${callId}`, 'background: #007bff; color: white; padding: 5px;');
    CallHandler._currentCallId = callId;
    // Clear terminated flag when new call ID is set
    CallHandler._isCallTerminated = false;
    return callId;
  }
  
  static getCurrentCallId() {
    return CallHandler._currentCallId;
  }
  
  static isCallTerminated(callId) {
    const isTerminated = CallHandler._terminatedCallIds.has(callId);
    console.log(`%c[CALL ID] Checking if call ${callId} is terminated: ${isTerminated}`, 'background: #6c757d; color: white; padding: 3px;');
    return isTerminated;
  }
  
  static terminateCall(callId) {
    console.log(`%c[CALL ID] Terminating call: ${callId}`, 'background: #dc3545; color: white; font-weight: bold; padding: 5px;');
    CallHandler._terminatedCallIds.add(callId);
    CallHandler._isCallTerminated = true;
  }
  
  /* === BLOCKLIST METHODS === */
  static _loadBlocklistFromStorage() {
    try {
      // Load permanent blocks
      const permanentBlocks = localStorage.getItem(CallHandler.BLOCKED_USERS_KEY);
      if (permanentBlocks) {
        const blockedArray = JSON.parse(permanentBlocks);
        CallHandler._blockedUserIds = new Set(blockedArray);
        console.log(`[BLOCKLIST] Loaded ${blockedArray.length} permanent blocks from localStorage`);
      }
      
      // Load temporary blocks
      const temporaryBlocks = localStorage.getItem(CallHandler.TEMPORARY_BLOCKS_KEY);
      if (temporaryBlocks) {
        const tempBlocksObj = JSON.parse(temporaryBlocks);
        CallHandler._temporaryBlockedUsers = new Map(Object.entries(tempBlocksObj));
        console.log(`[BLOCKLIST] Loaded ${CallHandler._temporaryBlockedUsers.size} temporary blocks from localStorage`);
      }
      
      // Clean expired blocks
      CallHandler._cleanExpiredBlocks();
    } catch (error) {
      console.error('[BLOCKLIST] Error loading blocklist from localStorage:', error);
    }
  }
  
  static _saveBlocklistToStorage() {
    try {
      // Save permanent blocks
      const permanentArray = Array.from(CallHandler._blockedUserIds);
      localStorage.setItem(CallHandler.BLOCKED_USERS_KEY, JSON.stringify(permanentArray));
      
      // Save temporary blocks
      const tempBlocksObj = Object.fromEntries(CallHandler._temporaryBlockedUsers);
      localStorage.setItem(CallHandler.TEMPORARY_BLOCKS_KEY, JSON.stringify(tempBlocksObj));
      
      console.log(`[BLOCKLIST] Saved blocklist to localStorage (${permanentArray.length} permanent, ${CallHandler._temporaryBlockedUsers.size} temporary)`);
    } catch (error) {
      console.error('[BLOCKLIST] Error saving blocklist to localStorage:', error);
    }
  }
  
  static _cleanExpiredBlocks() {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [userId, expiry] of CallHandler._temporaryBlockedUsers.entries()) {
      if (now > expiry) {
        CallHandler._temporaryBlockedUsers.delete(userId);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      console.log(`[BLOCKLIST] Cleaned ${expiredCount} expired temporary blocks`);
      CallHandler._saveBlocklistToStorage();
    }
  }
  
  static isUserBlocked(userId) {
    if (!userId) return false;
    
    // Check permanent blocks
    if (CallHandler._blockedUserIds.has(userId)) {
      console.log(`%c[BLOCKLIST] 🚫 User ${userId} is permanently blocked`, 'background: #dc3545; color: white; font-weight: bold; padding: 5px;');
      return true;
    }
    
    // Check temporary blocks
    const expiry = CallHandler._temporaryBlockedUsers.get(userId);
    if (expiry) {
      const now = Date.now();
      if (now < expiry) {
        const hoursRemaining = Math.ceil((expiry - now) / (1000 * 60 * 60));
        console.log(`%c[BLOCKLIST] 🚫 User ${userId} is temporarily blocked (${hoursRemaining}h remaining)`, 'background: #ffc107; color: black; font-weight: bold; padding: 5px;');
        return true;
      } else {
        // Expired, remove it
        CallHandler._temporaryBlockedUsers.delete(userId);
        CallHandler._saveBlocklistToStorage();
      }
    }
    
    return false;
  }
  
  static blockUserPermanent(userId) {
    if (!userId) {
      console.warn('[BLOCKLIST] Cannot block - no user ID provided');
      return false;
    }
    
    console.log(`%c[BLOCKLIST] 🔨 Permanently blocking user: ${userId}`, 'background: #dc3545; color: white; font-weight: bold; padding: 5px;');
    CallHandler._blockedUserIds.add(userId);
    // Remove from temporary blocks if present
    CallHandler._temporaryBlockedUsers.delete(userId);
    CallHandler._saveBlocklistToStorage();
    
    // #TODOLATER: Sync to database for multi-device support
    CallHandler._syncBlocklistToDatabase(userId, 'permanent');
    
    return true;
  }
  
  static blockUserTemporary(userId, hours = CallHandler.BLOCK_DURATION_HOURS) {
    if (!userId) {
      console.warn('[BLOCKLIST] Cannot block - no user ID provided');
      return false;
    }
    
    const expiry = Date.now() + (hours * 60 * 60 * 1000);
    console.log(`%c[BLOCKLIST] ⏰ Temporarily blocking user: ${userId} for ${hours} hours`, 'background: #ffc107; color: black; font-weight: bold; padding: 5px;');
    CallHandler._temporaryBlockedUsers.set(userId, expiry);
    CallHandler._saveBlocklistToStorage();
    
    // #TODOLATER: Sync to database for multi-device support
    CallHandler._syncBlocklistToDatabase(userId, 'temporary', { hours, expiry });
    
    return true;
  }
  
  static unblockUser(userId) {
    if (!userId) {
      console.warn('[BLOCKLIST] Cannot unblock - no user ID provided');
      return false;
    }
    
    console.log(`%c[BLOCKLIST] ✅ Unblocking user: ${userId}`, 'background: #28a745; color: white; padding: 5px;');
    const wasBlocked = CallHandler._blockedUserIds.delete(userId) || CallHandler._temporaryBlockedUsers.delete(userId);
    
    if (wasBlocked) {
      CallHandler._saveBlocklistToStorage();
      // #TODOLATER: Sync to database for multi-device support
      CallHandler._syncBlocklistToDatabase(userId, 'unblock');
    }
    
    return wasBlocked;
  }
  
  static _syncBlocklistToDatabase(userId, type, metadata = {}) {
    // #TODOLATER: Implement database sync for multi-device support
    console.log(`[BLOCKLIST] #TODOLATER: Sync to database`, { userId, type, metadata });
    // Future implementation:
    // - Call API endpoint to sync blocklist
    // - Handle multi-device scenarios
    // - Sync on login/app start
  }
  
  static getBlockedUsers() {
    const permanent = Array.from(CallHandler._blockedUserIds);
    const temporary = [];
    
    for (const [userId, expiry] of CallHandler._temporaryBlockedUsers.entries()) {
      const hoursRemaining = Math.ceil((expiry - Date.now()) / (1000 * 60 * 60));
      if (hoursRemaining > 0) {
        temporary.push({ userId, hoursRemaining, expiry });
      }
    }
    
    return { permanent, temporary };
  }

  /* === ONLY ADDITION: single UI dispatcher (exact name requested) === */
/* ======================================================================
 * SINGLE UI DISPATCHER (with extra logging and smart duplicate prevention)
 * ====================================================================== */
static dipatchUI(state, substate = "none", payload = {}) {
  console.log(`%c[UI STATE] Dispatch requested: ${state} / ${substate}`, 'background: #00f; color: #fff; font-weight: bold; padding: 5px', {
    gotCallHandler: typeof CallHandler !== "undefined",
    state,
    substate,
    payload,
    stackTrace: new Error().stack
  });

  // GUARD: Block all state transitions after call is terminated (persistent check)
  // BUT: Always allow incoming call states and new call initiation (new calls should be able to start)
  const isIncomingCallState = state === 'callee:incomingVideoCall' || state === 'callee:incomingAudioCall';
  const isNewCallInitiation = state === 'caller:callWaiting'; // Allow new calls to start
  
  const isTerminated = CallHandler._isCallTerminated || (CallHandler._currentUIState && (
    CallHandler._currentUIState.includes('terminated') ||
    CallHandler._currentUIState.includes('rejected') ||
    CallHandler._currentUIState.includes('declined') ||
    CallHandler._currentUIState === 'ended'
  ));
  
  const isNewStateTerminated = state.includes('terminated') || 
                               state.includes('rejected') || 
                               state.includes('declined') || 
                               state === 'ended';
  
  // If already terminated, block any new state transitions (except setting terminated itself, incoming calls, or new call initiation)
  if (isTerminated && !isNewStateTerminated && !isIncomingCallState && !isNewCallInitiation) {
    console.log(`%c[UI STATE] 🚫 BLOCKED state transition - call already terminated`, 'background: #dc3545; color: white; font-weight: bold; padding: 5px;', {
      isCallTerminated: CallHandler._isCallTerminated,
      currentState: CallHandler._currentUIState,
      attemptedState: state,
      substate,
      stackTrace: new Error().stack
    });
    
    if (typeof DebugLogger !== 'undefined') {
      DebugLogger.addLog('terminated', 'CRITICAL', 'dipatchUI', `Blocked state transition to ${state} - call terminated`, {
        isCallTerminated: CallHandler._isCallTerminated,
        currentState: CallHandler._currentUIState,
        attemptedState: state,
        substate
      });
    }
    return; // Block the state transition
  }

  const now = Date.now();
  const timeSinceLastDispatch = now - CallHandler._lastDispatchTime;
  
  // Check if we're already in this exact state AND it was dispatched recently (within throttle window)
  // This prevents rapid-fire duplicates while allowing intentional state refreshes
  if (CallHandler._currentUIState === state && 
      CallHandler._currentUISubstate === substate && 
      timeSinceLastDispatch < CallHandler._duplicateThrottleMs) {
    console.log(`%c[UI STATE] ⏭️ SKIPPED duplicate dispatch: already in ${state} / ${substate} (dispatched ${timeSinceLastDispatch}ms ago)`, 'background: #888; color: #fff');
    return;
  }

  try {
    if (!document || !document.dispatchEvent) {
      console.error("[UI STATE] ❌ document.dispatchEvent not available");
      return;
    }

    // Include callType and mediaType in state dispatch for reactive access
    // callType is always INSTANT_ONE_ON_ONE for instant calls
    // mediaType comes from _invite.callType (which stores 'video' or 'audio')
    const actualCallType = CallHandler.TYPE_INSTANT; // Always INSTANT_ONE_ON_ONE for instant calls
    const mediaType = CallHandler._invite?.callType || (window.mockCallData?.mediaType) || null;
    
    const detail = { 
      state, 
      substate, 
      ts: Date.now(),
      ...payload,
      // Add callType and mediaType to detail for reactive access (payload can override)
      callType: payload.callType || actualCallType,
      mediaType: payload.mediaType || mediaType
    };

    console.log(`%c[UI STATE] ✅ Dispatching: ${state} / ${substate}`, 'background: #0f0; color: #000; font-weight: bold', detail);

    document.dispatchEvent(
      new CustomEvent("chime-ui::state", { detail })
    );

    // Update state tracking
    const previousState = CallHandler._currentUIState;
    const previousSubstate = CallHandler._currentUISubstate;
    CallHandler._currentUIState = state;
    CallHandler._currentUISubstate = substate;
    CallHandler._lastDispatchTime = now;

    console.log(`%c[UI STATE] State transition: ${previousState || '(none)'}/${previousSubstate || '(none)'} → ${state}/${substate}`, 'background: #ff0; color: #000; font-weight: bold');
    
    // Auto-set termination flag if call has ended (persistent - survives popup close)
    if (state.includes('terminated') || state.includes('rejected') || state.includes('declined') || state === 'ended') {
      console.log('%c[UI STATE] 🔄 Call ended - setting persistent termination flag', 'background: #f00; color: #fff');
      CallHandler._isCallTerminated = true;
      // Reset _inCallOrConnecting flag - we're no longer in a call
      CallHandler._inCallOrConnecting = false;
      // Don't auto-reset state - keep it so guard can check it
      // State will be reset when new call explicitly starts
    }
  } catch (e) {
    console.error("[UI STATE] ❌ dispatch failed", e);
  }
}

  /* ================================================================== */

  static TYPE_INSTANT = "INSTANT_ONE_ON_ONE";
  static TYPE_SCHEDULED = "SCHEDULED_ONE_ON_ONE";
  static TYPE_GROUP = "GROUP_ONE_ON_ONE";

  static TERMINATION_REASONS = {
    BUSY: 'Busy',
    ON_ANOTHER_CALL: 'on_another_call',
    NO_ANSWER: 'No Answer',
    INSUFFICIENT_TOKENS: 'insufficient_tokens'
  };

  static FLAGS = {
    CALL_INITIATE: "call:initiate",
    CALL_INCOMING: "call:incoming",
    CALL_RINGING: "call:ringing", // LOCAL-ONLY
    CALL_ACCEPTED: "call:accepted",
    CALL_DECLINED: "call:declined",
    CALL_TIMEOUT: "call:timeout",
    CALL_CANCELLED: "call:cancelled",
    CALL_ENDED: "call:ended",
    SELF_STOP_RING: "call:self:stopRinging",
    MEETING_READY: "meeting:ready",
    MEETING_CONNECT: "meeting:connect",
    MEETING_PROBLEM: "meeting:problem",
  };

  static SCHEMA = {
    initiate: {
      to: { type: "string", required: true },
      callType: { type: "string", required: true },
      callerId: { type: "string", required: true },
      calleeId: { type: "string", required: true },
      role: { type: "string", required: true },
      callId: { type: "string", required: true },
    },
    accept: {
      to: { type: "string", required: true },
      callerId: { type: "string", required: true },
      calleeId: { type: "string", required: true },
      callId: { type: "string", required: true },
    },
    decline: {
      to: { type: "string", required: true },
      callerId: { type: "string", required: true },
      calleeId: { type: "string", required: true },
      reason: { type: "string", required: true },
      callId: { type: "string", required: true },
    },
    cancel: {
      to: { type: "string", required: true },
      callerId: { type: "string", required: true },
      calleeId: { type: "string", required: true },
      callId: { type: "string", required: true },
    },
    timeout: {
      to: { type: "string", required: true },
      callerId: { type: "string", required: true },
      calleeId: { type: "string", required: true },
      callId: { type: "string", required: true },
    },
    selfStop: {
      to: { type: "string", required: true },
      calleeId: { type: "string", required: true },
      callId: { type: "string", required: true },
    },
    meetingReady: {
      to: { type: "string", required: true },
      meetingId: { type: "string", required: true },
      callerId: { type: "string", required: true },
      calleeId: { type: "string", required: true },
      callerRole: { type: "string", required: true },
      calleeRole: { type: "string", required: true },
      callId: { type: "string", required: true },
    },
    meetingProblem: {
      to: { type: "string", required: true },
      meetingId: { type: "string", required: true },
      callerId: { type: "string", required: true },
      calleeId: { type: "string", required: true },
      message: { type: "string", required: true },
      callId: { type: "string", required: true },
    },
  };

  static _els = {
    callType: null,
    role: null,
    currentUserId: null,
    targetUserId: null,
    btnStart: null,
    btnStartAudio: null,
    btnStartVideo: null,
    btnAccept: null,
    btnReject: null,
    btnCancel: null,
    rejectReason: null,
  };

  static _ringTimeoutMs = 120000; // 2 minutes for slow internet connections
  static _gracePeriodMs = 10000; // 10 seconds after timeout for caller to receive accepted
  static _calleeRingTimerId = null; // runs on receiver (incoming)
  static _callerRingTimerId = null; // runs on sender (after initiate)
  static _callerGraceTimerId = null; // Grace period timer for caller
  static _inCallOrConnecting = false; // NEW: true when answered:setup/connecting or connected
  static _pendingCalleeJoin = null; // Store pending callee join info for manual join
  static _currentSide = null; // Track if we're the caller or callee for UI dispatches
  static _isInCamMicWaiting = false; // Guard flag to prevent multiple transitions to waitingForCamMicPermissions state

  // Lambda API endpoints
  static _scyllaDatabaseEndpoint =
    "https://fns5h6php6v5qalzaoxmcq532y0dzrro.lambda-url.ap-northeast-1.on.aws/";
  static _chimeMeetingEndpoint =
    "https://huugn2oais26si45yoqoui6byu0iqhtl.lambda-url.ap-northeast-1.on.aws/";

  // Populated from call:incoming (SOCKET) — the source of truth for callee side
  static _invite = {
    callerId: null,
    calleeId: null,
    callerRole: null,
    callType: null,
    callerData: null, // { userId, username, displayName, avatar }
    calleeData: null, // { userId, username, displayName, avatar }
  };
  
  // Store current user and target user data for call
  static _currentUserData = null;
  static _targetUserData = null;

  /**
   * Set user data for current user and target user before making a call
   * @param {Object} currentUser - { userId, username, displayName, avatar }
   * @param {Object} targetUser - { userId, username, displayName, avatar }
   */
  static setUserData(currentUser, targetUser) {
    console.log("[CallHandler] Setting user data", { currentUser, targetUser });
    CallHandler._currentUserData = currentUser;
    CallHandler._targetUserData = targetUser;
  }

  static init() {
    console.log("[CallHandler] init start");

    CallHandler._els.callType = document.getElementById("callType");
    CallHandler._els.role = document.getElementById("role");
    CallHandler._els.currentUserId = document.getElementById("currentUserId");
    CallHandler._els.targetUserId = document.getElementById("targetUserId");
    CallHandler._els.btnStart = document.getElementById("btnStartInstantCall");
    CallHandler._els.btnStartAudio =
      document.getElementById("btnStartAudioCall");
    CallHandler._els.btnStartVideo =
      document.getElementById("btnStartVideoCall");
    CallHandler._els.btnAccept = document.getElementById("btnAccept");
    CallHandler._els.btnReject = document.getElementById("btnReject");
    CallHandler._els.btnCancel = document.getElementById("btnCancelCall");
    CallHandler._els.rejectReason = document.getElementById("rejectReason");

    if (CallHandler._els.btnStart)
      CallHandler._els.btnStart.addEventListener(
        "click",
        CallHandler.handleStartInstantCallClick
      );
    if (CallHandler._els.btnStartAudio)
      CallHandler._els.btnStartAudio.addEventListener(
        "click",
        CallHandler.handleStartAudioCallClick
      );
    if (CallHandler._els.btnStartVideo)
      CallHandler._els.btnStartVideo.addEventListener(
        "click",
        CallHandler.handleStartVideoCallClick
      );
    if (CallHandler._els.btnAccept)
      CallHandler._els.btnAccept.addEventListener(
        "click",
        CallHandler.handleAcceptClick
      );
    if (CallHandler._els.btnReject)
      CallHandler._els.btnReject.addEventListener(
        "click",
        CallHandler.handleRejectClick
      );
    if (CallHandler._els.btnCancel)
      CallHandler._els.btnCancel.addEventListener(
        "click",
        CallHandler.handleCancelClick
      );

    document.addEventListener("app:call:start", CallHandler.handleAppStartCall);
    document.addEventListener(
      "app:call:accept",
      CallHandler.handleAcceptClick
    );
    console.log("%c[CallHandler] Event listener registered for app:call:accept", 'background: #28a745; color: white; font-weight: bold; padding: 5px;');
    document.addEventListener(
      "app:call:terminate",
      CallHandler.handleAppTerminateCall
    );
    console.log("%c[CallHandler] Event listener registered for app:call:terminate", 'background: #dc3545; color: white; font-weight: bold; padding: 5px;');
    document.addEventListener(
      "app:call:reject",
      CallHandler.handleAppRejectCall
    );
    document.addEventListener(
      "app:call:cancel",
      CallHandler.handleAppCancelCall
    );

    /* ====================================================================
     * _guardTerminated(callback) - Guard wrapper for terminated state
     * Wraps callbacks to ignore incoming messages when call is terminated
     * Uses call ID to allow new calls even if previous call was terminated
     * ==================================================================== */
    CallHandler._guardTerminated = function(callback) {
      return function(...args) {
        const callbackName = callback.name || 'unknown';
        const body = args[0] || {};
        const callId = body.callId;
        
        // Always allow cancellation messages through - needed to terminate other side
        const isCancellation = callbackName === 'handleSocketCancelled';
        if (isCancellation) {
          console.log(`%c[GUARD] ✅ Allowing cancellation message (always processed)`, 'background: #17a2b8; color: white; padding: 3px;', {
            callback: callbackName,
            callId: callId || 'none'
          });
          return callback.apply(this, args);
        }
        
        // Always allow NEW incoming calls (call:initiate) - they have new call IDs
        const isIncomingCall = callbackName === 'handleSocketIncomingCall';
        if (isIncomingCall) {
          // Check blocklist first
          const callerId = body.callerId || body.from;
          if (callerId && CallHandler.isUserBlocked(callerId)) {
            console.log(`%c[BLOCKLIST] 🚫 Blocked incoming call from ${callerId}`, 'background: #dc3545; color: white; font-weight: bold; padding: 5px;');
            return; // Block the call
          }
          
          // New incoming call - always allow (will set new call ID)
          console.log(`%c[GUARD] ✅ Allowing NEW incoming call (new call ID: ${callId || 'none'})`, 'background: #28a745; color: white; font-weight: bold; padding: 5px;', {
            callback: callbackName,
            callId: callId || 'none',
            callerId: callerId || body.from
          });
          
          // Cleanup previous call state if call ID changed
          if (CallHandler._currentCallId && CallHandler._currentCallId !== callId) {
            console.log(`%c[GUARD] 🧹 Call ID changed - running cleanup`, 'background: #ff6b6b; color: white; font-weight: bold; padding: 5px;', {
              oldCallId: CallHandler._currentCallId,
              newCallId: callId
            });
            CallHandler._cleanupForNewCall(callId, 'New incoming call with different ID');
          }
          
          return callback.apply(this, args);
        }
        
        // For all other messages, check if THIS specific call ID is terminated
        if (callId) {
          const isThisCallTerminated = CallHandler.isCallTerminated(callId);
          if (isThisCallTerminated) {
            console.log(`%c[GUARD] 🚫 Blocked message - call ID ${callId} is terminated`, 'background: #dc3545; color: white; font-weight: bold; padding: 5px;', {
              callback: callbackName,
              callId: callId
            });
            
            if (typeof DebugLogger !== 'undefined') {
              DebugLogger.addLog('terminated', 'NOTICE', '_guardTerminated', `Blocked ${callbackName} - call ID ${callId} terminated`, {
                callId: callId
              });
            }
            return; // Block the callback
          }
          
          // Call ID exists and is NOT terminated - allow
          console.log(`%c[GUARD] ✅ Allowing message - call ID ${callId} is active`, 'background: #28a745; color: white; padding: 3px;', {
            callback: callbackName,
            callId: callId
          });
          return callback.apply(this, args);
        }
        
        // No call ID in message - fallback to old behavior (check global flag)
        // This handles messages without call ID (backwards compatibility)
        const isTerminated = CallHandler._isCallTerminated || (CallHandler._currentUIState && (
          CallHandler._currentUIState.includes('terminated') ||
          CallHandler._currentUIState.includes('rejected') ||
          CallHandler._currentUIState.includes('declined') ||
          CallHandler._currentUIState === 'ended'
        ));
        
        if (isTerminated) {
          console.log(`%c[GUARD] 🚫 Blocked message - no call ID, using global flag (terminated)`, 'background: #ffc107; color: black; padding: 3px;', {
            callback: callbackName,
            warning: 'Message missing callId - using legacy check'
          });
          return; // Block the callback
        }
        
        // No call ID but not terminated - allow
        console.log(`%c[GUARD] ✅ Allowing message - no call ID, not terminated`, 'background: #28a745; color: white; padding: 3px;', {
          callback: callbackName
        });
        
        return callback.apply(this, args);
      };
    };

    // SOCKET listeners (NO listener for CALL_RINGING — it is local-only)
    // All callbacks wrapped with _guardTerminated to block messages when call is terminated
    SocketHandler.registerSocketListener({
      flag: CallHandler.FLAGS.CALL_INCOMING,
      callback: CallHandler._guardTerminated(CallHandler.handleSocketIncomingCall),
    });
    // Backend sends "call:initiate" to receiver, not "call:incoming"
    SocketHandler.registerSocketListener({
      flag: CallHandler.FLAGS.CALL_INITIATE,
      callback: CallHandler._guardTerminated(CallHandler.handleSocketIncomingCall),
    });
    SocketHandler.registerSocketListener({
      flag: CallHandler.FLAGS.CALL_ACCEPTED,
      callback: CallHandler._guardTerminated(CallHandler.handleSocketAccepted),
    });
    SocketHandler.registerSocketListener({
      flag: CallHandler.FLAGS.CALL_DECLINED,
      callback: CallHandler._guardTerminated(CallHandler.handleSocketDeclined),
    });
    SocketHandler.registerSocketListener({
      flag: CallHandler.FLAGS.CALL_TIMEOUT,
      callback: CallHandler._guardTerminated(CallHandler.handleSocketTimeout),
    });
    SocketHandler.registerSocketListener({
      flag: CallHandler.FLAGS.CALL_CANCELLED,
      callback: CallHandler._guardTerminated(CallHandler.handleSocketCancelled),
    });
    SocketHandler.registerSocketListener({
      flag: CallHandler.FLAGS.SELF_STOP_RING,
      callback: CallHandler._guardTerminated(CallHandler.handleSocketSelfStopRinging),
    });
    SocketHandler.registerSocketListener({
      flag: CallHandler.FLAGS.MEETING_READY,
      callback: CallHandler._guardTerminated(CallHandler.handleSocketMeetingReady),
    });
    SocketHandler.registerSocketListener({
      flag: CallHandler.FLAGS.MEETING_PROBLEM,
      callback: CallHandler._guardTerminated(CallHandler.handleSocketMeetingProblem),
    });
    SocketHandler.registerSocketListener({
      flag: "meeting:status",
      callback: CallHandler._guardTerminated(CallHandler.handleSocketMeetingStatus),
    });
    SocketHandler.registerSocketListener({
      flag: "grace:start",
      callback: CallHandler._guardTerminated(CallHandler.handleSocketGraceStart),
    });
    SocketHandler.registerSocketListener({
      flag: "grace:resume",
      callback: CallHandler._guardTerminated(CallHandler.handleSocketGraceResume),
    });
    SocketHandler.registerSocketListener({
      flag: "grace:end",
      callback: CallHandler._guardTerminated(CallHandler.handleSocketGraceEnd),
    });

    // Wire up Join Meeting button for callee manual join
    const joinMeetingBtn = document.getElementById("link-join-meeting");
    if (joinMeetingBtn) {
      joinMeetingBtn.addEventListener("click", (e) => {
        if (CallHandler._pendingCalleeJoin) {
          e.preventDefault();
          e.stopPropagation();
          CallHandler.handleManualCalleeJoin();
        }
      });
    }

    // Initialize blocklist from localStorage
    CallHandler._loadBlocklistFromStorage();
    
    // Set up periodic cleanup for expired temporary blocks (every 5 minutes)
    setInterval(() => {
      CallHandler._cleanExpiredBlocks();
    }, 5 * 60 * 1000);

    console.log("[CallHandler] init complete");
    DebugLogger.addLog("initialize", "NOTICE", "CallHandler.init", "Call handler initialized");
  }

  /* =========================
   * BUTTON HANDLERS → DISPATCH
   * ======================= */
  static handleStartInstantCallClick() {
    DebugLogger.addLog("calling", "NOTICE", "handleStartInstantCallClick", "UI click: Start Instant Call");
    console.log("[CallHandler] UI click: Start Instant Call");

    // Clear terminated flag when starting a new call
    if (CallHandler._isCallTerminated) {
      console.log("[CallHandler] Clearing terminated flag - starting new call");
      CallHandler._isCallTerminated = false;
    }

    if (!CallHandler._els.callType) {
      console.log("[CallHandler] callType select missing");
      DebugLogger.addLog(
        "calling",
        "CRITICAL",
        "handleStartInstantCallClick",
        "Missing call type"
      );
      return;
    }
    if (!CallHandler._els.role) {
      console.log("[CallHandler] role select missing");
      DebugLogger.addLog(
        "calling",
        "CRITICAL",
        "handleStartInstantCallClick",
        "Missing role"
      );
      return;
    }
    if (!CallHandler._els.currentUserId) {
      console.log("[CallHandler] currentUserId input missing");
      DebugLogger.addLog(
        "calling",
        "CRITICAL",
        "handleStartInstantCallClick",
        "Missing your ID"
      );
      return;
    }
    if (!CallHandler._els.targetUserId) {
      console.log("[CallHandler] targetUserId input missing");
      DebugLogger.addLog(
        "calling",
        "CRITICAL",
        "handleStartInstantCallClick",
        "Missing target user ID"
      );
      return;
    }

    const callTypeVal = CallHandler._els.callType.value;
    const callerRole = CallHandler._els.role.value;
    const callerIdVal = CallHandler._els.currentUserId.value;
    const calleeIdVal = CallHandler._els.targetUserId.value;

    console.log("[CallHandler] values", {
      callTypeVal,
      callerRole,
      callerIdVal,
      calleeIdVal,
    });

    if (callTypeVal !== CallHandler.TYPE_INSTANT) {
      console.log("[CallHandler] non-instant call selected; aborting");
      DebugLogger.addLog(
        "calling",
        "NOTICE",
        "handleStartInstantCallClick",
        "Instant one-on-one only in this flow"
      );
      return;
    }
    if (callerIdVal === undefined || callerIdVal === "") {
      console.log("[CallHandler] missing callerId");
      DebugLogger.addLog(
        "calling",
        "CRITICAL",
        "handleStartInstantCallClick",
        "Enter your User ID"
      );
      return;
    }
    if (calleeIdVal === undefined || calleeIdVal === "") {
      console.log("[CallHandler] missing calleeId");
      DebugLogger.addLog(
        "calling",
        "CRITICAL",
        "handleStartInstantCallClick",
        "Enter target User ID"
      );
      return;
    }
    if (callerRole === undefined || callerRole === "") {
      console.log("[CallHandler] missing role");
      DebugLogger.addLog(
        "calling",
        "CRITICAL",
        "handleStartInstantCallClick",
        "Select a role"
      );
      return;
    }

    console.log(`[CallHandler] dispatch ${CallHandler.FLAGS.CALL_INITIATE}`);
    document.dispatchEvent(
      new CustomEvent(CallHandler.FLAGS.CALL_INITIATE, {
        detail: {
          callerId: callerIdVal,
          calleeId: calleeIdVal,
          type: callTypeVal,
          role: callerRole,
        },
      })
    );

    console.log("[CallHandler] sending socket CALL_INITIATE");
    SocketHandler.sendSocketMessage({
      flag: CallHandler.FLAGS.CALL_INITIATE,
      payload: {
        to: calleeIdVal,
        callType: callTypeVal,
        callerId: callerIdVal,
        calleeId: calleeIdVal,
        role: callerRole,
      },
      schema: CallHandler.SCHEMA.initiate,
    });

    // Set current side to caller
    CallHandler._currentSide = "caller";
    
    // Reset chimeHandler alerts for new call
    if (typeof chimeHandler !== 'undefined') {
      chimeHandler._hasShownJoinedAlert = false;
      chimeHandler._hasShownConnectedAlert = false;
      chimeHandler._hasShownInCallAlert = false;
    }
    
    // Reset UI state tracking for new call (clear terminated flag)
    CallHandler.resetUIState(true);
    
    // Leave any existing Chime meeting without rejoin prompt (starting new call)
    if (typeof coreChime !== 'undefined' && coreChime._audioVideo) {
      console.log("[CallHandler] Leaving old Chime meeting before new call");
      coreChime.leave("Starting new call");
    }
    
    // 🔔 UI (caller) → calling state
    CallHandler.dipatchUI("caller:callWaiting", "none", {
      callerId: callerIdVal,
      calleeId: calleeIdVal,
      role: callerRole,
    });

    // ⏲️ caller-side 2min timeout (symmetry with callee)
    CallHandler.clearCallerRingTimer();
    CallHandler.clearCallerGraceTimer();
    const currentCallIdForCaller1 = CallHandler._currentCallId; // Store call ID in closure
    CallHandler._callerRingTimerId = setTimeout(() => {
      // Check if call ID still matches (call might have changed)
      if (CallHandler._currentCallId !== currentCallIdForCaller1) {
        console.log("[CallHandler] Caller timeout: call ID changed, ignoring timeout");
        return;
      }
      
      // Check if we're still in callWaiting state for this call (not in a different state)
      const isStillWaiting = CallHandler._currentUIState === 'caller:callWaiting';
      if (!isStillWaiting) {
        console.log("[CallHandler] Caller timeout: not in callWaiting state anymore, ignoring timeout", {
          currentState: CallHandler._currentUIState,
          callId: currentCallIdForCaller1
        });
        return;
      }
      
      console.log(
        "[CallHandler] CALLER ring timeout → notify callee, start grace period"
      );
      // Send timeout to callee
      SocketHandler.sendSocketMessage({
        flag: CallHandler.FLAGS.CALL_TIMEOUT,
        payload: {
          to: calleeIdVal,
          callerId: callerIdVal,
          calleeId: calleeIdVal,
          callId: currentCallIdForCaller1,
        },
        schema: CallHandler.SCHEMA.timeout,
      });
      // stop own ringing
      SocketHandler.sendSocketMessage({
        flag: CallHandler.FLAGS.SELF_STOP_RING,
        payload: { to: callerIdVal, calleeId: callerIdVal, callId: currentCallIdForCaller1 },
        schema: CallHandler.SCHEMA.selfStop,
      });
      
      // Start grace period - wait 10 seconds before terminating caller
      CallHandler._callerGraceTimerId = setTimeout(() => {
        // Check if call ID still matches
        if (CallHandler._currentCallId !== currentCallIdForCaller1) {
          console.log("[CallHandler] Grace period: call ID changed, ignoring termination");
          return;
        }
        
        // Check if we're already in an active call (accepted, connected, or joined)
        const isInActiveCall = CallHandler._currentUIState && (
          CallHandler._currentUIState.includes('callAccepted') ||
          CallHandler._currentUIState.includes('connected') ||
          CallHandler._currentUIState.includes('joined') ||
          CallHandler._currentUIState === 'shared:inCall'
        );
        
        if (isInActiveCall) {
          console.log("[CallHandler] Grace period: call is already active, ignoring timeout termination", {
            currentState: CallHandler._currentUIState,
            callId: currentCallIdForCaller1
          });
          return;
        }
        
        console.log("[CallHandler] Grace period ended → terminating caller");
        CallHandler.clearCallerGraceTimer();
        CallHandler.dipatchUI("caller:terminated", CallHandler.TERMINATION_REASONS.NO_ANSWER, {
          callerId: callerIdVal,
          calleeId: calleeIdVal,
        });
        DebugLogger.addLog(
          "terminated",
          "NOTICE",
          "handleStartInstantCallClick",
          "No answer (timeout)"
        );
      }, CallHandler._gracePeriodMs);
    }, CallHandler._ringTimeoutMs);

    DebugLogger.addLog("calling", "NOTICE", "handleStartInstantCallClick", "Calling...");
  }

  static handleStartAudioCallClick() {
    DebugLogger.addLog("calling", "NOTICE", "handleStartAudioCallClick", "UI click: Start Audio Call");
    console.log("[CallHandler] UI click: Start Audio Call");
    CallHandler._initiateCall("audio");
  }

  static handleStartVideoCallClick() {
    DebugLogger.addLog("calling", "NOTICE", "handleStartVideoCallClick", "UI click: Start Video Call");
    console.log("[CallHandler] UI click: Start Video Call");
    CallHandler._initiateCall("video");
  }

  static _initiateCall(mediaType) {
    DebugLogger.addLog("calling", "NOTICE", "_initiateCall", `Initiating ${mediaType} call`);
    if (!CallHandler._els.role) {
      console.log("[CallHandler] role select missing");
      DebugLogger.addLog(
        "calling",
        "CRITICAL",
        "_initiateCall",
        "Missing role"
      );
      return;
    }
    if (!CallHandler._els.currentUserId) {
      console.log("[CallHandler] currentUserId input missing");
      DebugLogger.addLog(
        "calling",
        "CRITICAL",
        "_initiateCall",
        "Missing your ID"
      );
      return;
    }
    if (!CallHandler._els.targetUserId) {
      console.log("[CallHandler] targetUserId input missing");
      DebugLogger.addLog(
        "calling",
        "CRITICAL",
        "_initiateCall",
        "Missing target user ID"
      );
      return;
    }

    const callerRole = CallHandler._els.role.value;
    const callerIdVal = CallHandler._els.currentUserId.value;
    const calleeIdVal = CallHandler._els.targetUserId.value;

    if (callerIdVal === undefined || callerIdVal === "") {
      console.log("[CallHandler] missing callerId");
      DebugLogger.addLog(
        "calling",
        "CRITICAL",
        "_initiateCall",
        "Enter your User ID"
      );
      return;
    }
    if (calleeIdVal === undefined || calleeIdVal === "") {
      console.log("[CallHandler] missing calleeId");
      DebugLogger.addLog(
        "calling",
        "CRITICAL",
        "_initiateCall",
        "Enter target User ID"
      );
      return;
    }
    if (callerRole === undefined || callerRole === "") {
      console.log("[CallHandler] missing role");
      DebugLogger.addLog(
        "calling",
        "CRITICAL",
        "_initiateCall",
        "Select a role"
      );
      return;
    }

    // Check if this is a new call to different users (different caller/callee IDs)
    const previousCallerId = CallHandler._invite?.callerId;
    const previousCalleeId = CallHandler._invite?.calleeId;
    const isNewCallToDifferentUsers = 
      (previousCallerId && previousCallerId !== callerIdVal) || 
      (previousCalleeId && previousCalleeId !== calleeIdVal);
    
    // If new call to different users, clear any previous terminated/disconnected states
    if (isNewCallToDifferentUsers) {
      console.log("%c[NEW CALL] 🔄 New call to different users - clearing previous call states", 'background: #17a2b8; color: white; font-weight: bold; padding: 5px;', {
        previousCallerId,
        previousCalleeId,
        newCallerId: callerIdVal,
        newCalleeId: calleeIdVal,
        currentState: CallHandler._currentUIState,
        isTerminated: CallHandler._isCallTerminated
      });
      
      // Clear terminated flag
      CallHandler._isCallTerminated = false;
      
      // Clear terminated/disconnected states from previous call
      const currentState = CallHandler._currentUIState;
      if (currentState && (
        currentState.includes("terminated") || 
        currentState.includes("disconnected") ||
        currentState.includes("rejected") ||
        currentState.includes("declined")
      )) {
        console.log("%c[NEW CALL] 🧹 Clearing previous call state:", 'background: #17a2b8; color: white; font-weight: bold; padding: 5px;', currentState);
        CallHandler._currentUIState = null;
        CallHandler._currentUISubstate = null;
      }
    }

    // Generate unique call ID for this call
    const callId = CallHandler._generateCallId();
    CallHandler.setCallId(callId);
    console.log(`%c[CALL ID] 🆕 New call initiated with ID: ${callId}`, 'background: #007bff; color: white; font-weight: bold; padding: 8px;');
    
    // Reset UI state for new call
    CallHandler.resetUIState(true); // Clear terminated flag for new call
    
    // Leave any existing Chime meeting without rejoin prompt (starting new call)
    if (typeof coreChime !== 'undefined' && coreChime._audioVideo) {
      console.log("[CallHandler] Leaving old Chime meeting before new call");
      coreChime.leave("Starting new call");
    }
    
    // Initialize CamMic permissions system (first call only)
    CallHandler._ensureCamMicInitialized();

    // Store callType and IDs for caller
    CallHandler._invite.callType = mediaType;
    CallHandler._invite.callerId = callerIdVal;
    CallHandler._invite.calleeId = calleeIdVal;

    // Populate mockCallData for the call
    if (window.mockCallData) {
      window.mockCallData.callType = CallHandler.TYPE_INSTANT;
      window.mockCallData.mediaType = mediaType;
      window.mockCallData.currentUserRole = callerRole;
      window.mockCallData.currentUserSide = "caller";
      // Use mockCallData users if CallHandler doesn't have them set
      CallHandler._currentUserData = CallHandler._currentUserData || window.mockCallData.currentUser;
      CallHandler._targetUserData = CallHandler._targetUserData || window.mockCallData.targetUser;
      
      // Sync mockCallData to Vue call settings
      if (window.vueApp && typeof window.vueApp.syncMockDataToVueSettings === 'function') {
        window.vueApp.syncMockDataToVueSettings();
      }
    }

    // Validate user data before initiating call
    if (!CallHandler.validateUserData(CallHandler._currentUserData, "Current user data")) return;
    if (!CallHandler.validateUserData(CallHandler._targetUserData, "Target user data")) return;

    console.log(`[CallHandler] dispatch ${CallHandler.FLAGS.CALL_INITIATE}`);
    document.dispatchEvent(
      new CustomEvent(CallHandler.FLAGS.CALL_INITIATE, {
        detail: {
          callerId: callerIdVal,
          calleeId: calleeIdVal,
          type: CallHandler.TYPE_INSTANT,
          role: callerRole,
        },
      })
    );

    console.log("[CallHandler] sending socket CALL_INITIATE");
    SocketHandler.sendSocketMessage({
      flag: CallHandler.FLAGS.CALL_INITIATE,
      payload: {
        to: calleeIdVal,
        callType: CallHandler.TYPE_INSTANT,
        callerId: callerIdVal,
        calleeId: calleeIdVal,
        role: callerRole,
        mediaType: mediaType,
        callerData: CallHandler._currentUserData,
        calleeData: CallHandler._targetUserData,
        callId: callId,
      },
      schema: CallHandler.SCHEMA.initiate,
    });

    // Set current side to caller
    CallHandler._currentSide = "caller";
    
    // Reset chimeHandler alerts for new call
    if (typeof chimeHandler !== 'undefined') {
      chimeHandler._hasShownJoinedAlert = false;
      chimeHandler._hasShownConnectedAlert = false;
      chimeHandler._hasShownInCallAlert = false;
    }
    
    // 🔔 UI (caller) → calling state
    CallHandler.dipatchUI("caller:callWaiting", "none", {
      callerId: callerIdVal,
      calleeId: calleeIdVal,
      role: callerRole,
      callerData: CallHandler._currentUserData,
      calleeData: CallHandler._targetUserData,
    });
    
    const targetName = CallHandler._targetUserData?.displayName || CallHandler._targetUserData?.username || calleeIdVal;
    DebugLogger.addLog(
      "calling",
      "NOTICE",
      "_initiateCall",
      `📞 Calling ${targetName} for ${mediaType} call...`
    );

    // ⏲️ caller-side 2min timeout (symmetry with callee)
    CallHandler.clearCallerRingTimer();
    CallHandler.clearCallerGraceTimer();
    const currentCallIdForCaller2 = callId; // Store call ID in closure
    CallHandler._callerRingTimerId = setTimeout(() => {
      // Check if call ID still matches (call might have changed)
      if (CallHandler._currentCallId !== currentCallIdForCaller2) {
        console.log("[CallHandler] Caller timeout: call ID changed, ignoring timeout");
        return;
      }
      
      // Check if we're still in callWaiting state for this call (not in a different state)
      const isStillWaiting = CallHandler._currentUIState === 'caller:callWaiting';
      if (!isStillWaiting) {
        console.log("[CallHandler] Caller timeout: not in callWaiting state anymore, ignoring timeout", {
          currentState: CallHandler._currentUIState,
          callId: currentCallIdForCaller2
        });
        return;
      }
      
      console.log(
        "[CallHandler] CALLER ring timeout → notify callee, start grace period"
      );
      // Send timeout to callee
      SocketHandler.sendSocketMessage({
        flag: CallHandler.FLAGS.CALL_TIMEOUT,
        payload: {
          to: calleeIdVal,
          callerId: callerIdVal,
          calleeId: calleeIdVal,
          callId: currentCallIdForCaller2,
        },
        schema: CallHandler.SCHEMA.timeout,
      });
      // stop own ringing
      SocketHandler.sendSocketMessage({
        flag: CallHandler.FLAGS.SELF_STOP_RING,
        payload: { to: callerIdVal, calleeId: callerIdVal, callId: currentCallIdForCaller2 },
        schema: CallHandler.SCHEMA.selfStop,
      });
      
      // Start grace period - wait 10 seconds before terminating caller
      CallHandler._callerGraceTimerId = setTimeout(() => {
        // Check if call ID still matches
        if (CallHandler._currentCallId !== currentCallIdForCaller2) {
          console.log("[CallHandler] Grace period: call ID changed, ignoring termination");
          return;
        }
        
        // Check if we're already in an active call (accepted, connected, or joined)
        const isInActiveCall = CallHandler._currentUIState && (
          CallHandler._currentUIState.includes('callAccepted') ||
          CallHandler._currentUIState.includes('connected') ||
          CallHandler._currentUIState.includes('joined') ||
          CallHandler._currentUIState === 'shared:inCall'
        );
        
        if (isInActiveCall) {
          console.log("[CallHandler] Grace period: call is already active, ignoring timeout termination", {
            currentState: CallHandler._currentUIState,
            callId: currentCallIdForCaller2
          });
          return;
        }
        
        console.log("[CallHandler] Grace period ended → terminating caller");
        CallHandler.clearCallerGraceTimer();
        CallHandler.dipatchUI("caller:terminated", CallHandler.TERMINATION_REASONS.NO_ANSWER, {
          callerId: callerIdVal,
          calleeId: calleeIdVal,
        });
        DebugLogger.addLog(
          "terminated",
          "NOTICE",
          "_initiateCall",
          "No answer (timeout)"
        );
      }, CallHandler._gracePeriodMs);
    }, CallHandler._ringTimeoutMs);

    DebugLogger.addLog(
      "calling",
      "NOTICE",
      "_initiateCall",
      `calling (${mediaType})`
    );
  }

  static handleAcceptClick() {
    DebugLogger.addLog("receiving call", "NOTICE", "handleAcceptClick", "UI click: Accept");
    console.log("[CallHandler] UI click: Accept");
    
    // DO NOT reset settings here - we're accepting an existing call with already-populated data
    // Reset only happens on terminate or when starting a brand new call

    if (!CallHandler._els.currentUserId) {
      console.log("[CallHandler] currentUserId input missing");
      DebugLogger.addLog(
        "accepted call",
        "CRITICAL",
        "handleAcceptClick",
        "Missing your ID"
      );
      return;
    }
    if (!CallHandler._els.targetUserId) {
      console.log("[CallHandler] targetUserId input missing");
      DebugLogger.addLog(
        "accepted call",
        "CRITICAL",
        "handleAcceptClick",
        "Missing target/caller ID"
      );
      return;
    }
    if (!CallHandler._els.callType) {
      console.log("[CallHandler] callType select missing");
      DebugLogger.addLog(
        "accepted call",
        "CRITICAL",
        "handleAcceptClick",
        "Missing call type"
      );
      return;
    }
    if (!CallHandler._els.role) {
      console.log("[CallHandler] role select missing");
      DebugLogger.addLog(
        "accepted call",
        "CRITICAL",
        "handleAcceptClick",
        "Missing role"
      );
      return;
    }

    const callTypeVal = CallHandler._els.callType.value;
    const calleeRole = CallHandler._els.role.value;
    const calleeIdVal = CallHandler._els.currentUserId.value; // receiver (this device user)
    const callerIdVal = CallHandler._els.targetUserId.value; // the original caller (from your input for this demo)

    console.log("[CallHandler] values", {
      callTypeVal,
      calleeRole,
      callerIdVal,
      calleeIdVal,
    });

    if (callTypeVal !== CallHandler.TYPE_INSTANT) {
      console.log("[CallHandler] non-instant call; accept aborted");
      DebugLogger.addLog(
        "accepted call",
        "NOTICE",
        "handleAcceptClick",
        "Instant one-on-one only"
      );
      return;
    }
    if (callerIdVal === undefined || callerIdVal === "") {
      console.log("[CallHandler] missing callerId");
      DebugLogger.addLog(
        "accepted call",
        "CRITICAL",
        "handleAcceptClick",
        "Missing callerId"
      );
      return;
    }
    if (calleeIdVal === undefined || calleeIdVal === "") {
      console.log("[CallHandler] missing calleeId");
      DebugLogger.addLog(
        "accepted call",
        "CRITICAL",
        "handleAcceptClick",
        "Missing calleeId"
      );
      return;
    }
    if (calleeRole === undefined || calleeRole === "") {
      console.log("[CallHandler] missing callee role");
      DebugLogger.addLog(
        "accepted call",
        "CRITICAL",
        "handleAcceptClick",
        "Missing role"
      );
      return;
    }

    if (CallHandler._invite.callerRole === null) {
      console.log("[CallHandler] missing stored callerRole from invite");
      DebugLogger.addLog(
        "accepted call",
        "CRITICAL",
        "handleAcceptClick",
        "Missing caller role from invite"
      );
      return;
    }

    // Validate user data before accepting call
    const currentUserData = CallHandler._invite.calleeData || window.mockCallData?.currentUser;
    const targetUserData = CallHandler._invite.callerData || window.mockCallData?.targetUser;
    if (!CallHandler.validateUserData(currentUserData, "Current user (callee) data")) return;
    if (!CallHandler.validateUserData(targetUserData, "Target user (caller) data")) return;
    
    // Validate current with target for the callee side
    // For callee: currentUserId should match calleeId, targetUserId should match callerId
    if (CallHandler._invite.calleeId && calleeIdVal !== CallHandler._invite.calleeId) {
      console.error("[CallHandler] [Callee] Validation failed: currentUserId does not match invite calleeId", {
        currentUserId: calleeIdVal,
        inviteCalleeId: CallHandler._invite.calleeId
      });
      DebugLogger.addLog(
        "accepted call",
        "CRITICAL",
        "handleAcceptClick",
        "Current user ID does not match invite callee ID"
      );
      return;
    }
    if (CallHandler._invite.callerId && callerIdVal !== CallHandler._invite.callerId) {
      console.error("[CallHandler] [Callee] Validation failed: targetUserId does not match invite callerId", {
        targetUserId: callerIdVal,
        inviteCallerId: CallHandler._invite.callerId
      });
      DebugLogger.addLog(
        "accepted call",
        "CRITICAL",
        "handleAcceptClick",
        "Target user ID does not match invite caller ID"
      );
      return;
    }

    // Finalize userData when call is accepted
    CallHandler._currentUserData = currentUserData;
    CallHandler._targetUserData = targetUserData;
    console.log("[CallHandler] ✅ UserData finalized on call acceptance", {
      currentUser: CallHandler._currentUserData,
      targetUser: CallHandler._targetUserData
    });

    // Clear callee's ring timer since we're accepting
    CallHandler.clearCalleeRingTimer();

    // Set current side to callee
    CallHandler._currentSide = "callee";
    
    // Reset chimeHandler alerts for new call
    if (typeof chimeHandler !== 'undefined') {
      chimeHandler._hasShownJoinedAlert = false;
      chimeHandler._hasShownConnectedAlert = false;
      chimeHandler._hasShownInCallAlert = false;
    }
    
    // 🔔 UI (callee) → IMMEDIATELY show accepted state
    console.log('[CallHandler] [Callee] 📺 Showing callAccepted IMMEDIATELY');
    CallHandler.dipatchUI("callee:callAccepted", "none", {
      callerId: callerIdVal,
      calleeId: calleeIdVal,
      role: calleeRole,
    });
    CallHandler._inCallOrConnecting = true;

    console.log("[CallHandler] SELF_STOP_RING to callee (all devices)");
    SocketHandler.sendSocketMessage({
      flag: CallHandler.FLAGS.SELF_STOP_RING,
      payload: { 
        to: calleeIdVal, 
        calleeId: calleeIdVal,
        callId: CallHandler._currentCallId,
      },
      schema: CallHandler.SCHEMA.selfStop,
    });

    console.log("[CallHandler] CALL_ACCEPTED to caller");
    SocketHandler.sendSocketMessage({
      flag: CallHandler.FLAGS.CALL_ACCEPTED,
      payload: {
        to: callerIdVal,
        callerId: callerIdVal,
        calleeId: calleeIdVal,
        callId: CallHandler._currentCallId,
      },
      schema: CallHandler.SCHEMA.accept,
    });

    console.log("[CallHandler] local dispatch CALL_ACCEPTED");
    document.dispatchEvent(
      new CustomEvent(CallHandler.FLAGS.CALL_ACCEPTED, {
        detail: { callerId: callerIdVal, calleeId: calleeIdVal },
      })
    );

    DebugLogger.addLog("accepted call", "NOTICE", "handleAcceptClick", "Call accepted");
    DebugLogger.addLog("setuping up", "NOTICE", "handleAcceptClick", "Step 1: Creating meeting...");

    // Orchestrate cam/mic permissions for callee based on call type
    console.log('[CallHandler] [Callee] [FIX v1.1] Orchestrating cam/mic permissions');
    
    const mediaType = window.mockCallData?.mediaType || CallHandler._invite?.callType || 'video';
    const isVideoCall = mediaType === 'video';
    console.log('[CallHandler] [Callee] [FIX v1.1] Media type:', mediaType, 'isVideoCall:', isVideoCall);
    
    // Helper function to wait for UI state to actually change (event-based only)
    const waitForUIStateChange = (targetState) => {
      return new Promise((resolve) => {
        console.log('[CallHandler] [Callee] [FIX v1.1] ⏳ Waiting for UI state to change to:', targetState);
        
        // Check if already in target state
        const vueState = window.vueApp?.state;
        const currentState = vueState || CallHandler._currentUIState;
        if (currentState === targetState) {
          console.log('[CallHandler] [Callee] [FIX v1.1] ✅ Already in target state:', targetState);
          resolve();
          return;
        }
        
        // Listen for state change events only
        const stateListener = (ev) => {
          const newState = ev.detail?.state;
          const vueState = window.vueApp?.state;
          const currentState = vueState || newState || CallHandler._currentUIState;
          
          if (currentState === targetState) {
            document.removeEventListener('chime-ui::state', stateListener);
            console.log('[CallHandler] [Callee] [FIX v1.1] ✅ UI state confirmed changed to:', targetState);
            resolve();
          }
        };
        
        document.addEventListener('chime-ui::state', stateListener);
      });
    };
    
    // Listen for when browser will prompt (shows UI BEFORE browser freezes)
    const onShowWaiting = async (ev) => {
      console.log('[CallHandler] [Callee] [FIX v1.1] ⏳ CamMic:UI:ShowWaiting received - showing waiting UI NOW');
      console.log('[CallHandler] [Callee] [FIX v1.1] Event detail:', ev.detail);
      
      // Shift UI first
      CallHandler.dipatchUI("callee:waitingForCamMicPermissions", "none", {
        callerId: callerIdVal,
        calleeId: calleeIdVal,
        role: calleeRole,
      });
      console.log('[CallHandler] [Callee] [FIX v1.1] 📺 UI shift dispatched, waiting for confirmation...');
      
      // Wait for UI to actually change
      try {
        await waitForUIStateChange("callee:waitingForCamMicPermissions");
        console.log('[CallHandler] [Callee] [FIX v1.1] ✅ UI confirmed shifted to callee:waitingForCamMicPermissions');
      } catch (error) {
        console.warn('[CallHandler] [Callee] [FIX v1.1] ⚠️ Could not confirm UI shift, proceeding anyway:', error);
      }
    };
    
    // Listen for permissions resolved
    const onPermissionsResolved = (ev) => {
      const detail = ev.detail || {};
      console.log('[CallHandler] [Callee] [FIX v1.1] 📺 CamMic:UI:PermissionsResolved received:', detail);
      
      // If we were in waiting state, return to callAccepted
      if (CallHandler._currentUIState === 'callee:waitingForCamMicPermissions') {
        console.log('[CallHandler] [Callee] [FIX v1.1] 📺 Current state is waitingForCamMicPermissions - returning to callAccepted');
        CallHandler.dipatchUI("callee:callAccepted", "none", {
          callerId: callerIdVal,
          calleeId: calleeIdVal,
          role: calleeRole,
        });
        console.log('[CallHandler] [Callee] [FIX v1.1] ✅ UI transitioned back to callee:callAccepted');
      } else {
        console.log('[CallHandler] [Callee] [FIX v1.1] ⏭️ Current state is NOT waitingForCamMicPermissions, skipping UI change. Current state:', CallHandler._currentUIState);
      }
    };
    
    if (isVideoCall) {
      // Video call: orchestrate both with no preview
      console.log('[CallHandler] [Callee] [FIX v1.1] Video call - orchestrating both (no preview)');
      
      // Use a callback pattern to wait for orchestration completion
      const onAcceptComplete = (ev) => {
        console.log('[CallHandler] [Callee] [FIX v1.1] 🔔 CamMic:Orchestrate:Complete received');
        window.removeEventListener('CamMic:Orchestrate:Complete', onAcceptComplete);
        window.removeEventListener('CamMic:UI:ShowWaiting', onShowWaiting);
        window.removeEventListener('CamMic:UI:PermissionsResolved', onPermissionsResolved);
        console.log('[CallHandler] [Callee] [FIX v1.1] 🧹 Removed all event listeners');
        
        const detail = ev.detail || {};
        console.log('[CallHandler] [Callee] [FIX v1.1] CamMic orchestration complete:', detail);
        
        // Check permission states
        const camera = detail.permissions?.camera || 'unknown';
        const microphone = detail.permissions?.microphone || 'unknown';
        
        console.log('[CallHandler] [Callee] [FIX v1.1] Permission states:', { camera, microphone });
        console.log('[CallHandler] [Callee] [FIX v1.1] Current UI state:', CallHandler._currentUIState);
        
        // If permissions denied, show error and stay waiting
        if (camera === 'denied' || microphone === 'denied') {
          console.log('[CallHandler] [Callee] [FIX v1.1] ❌ Permissions denied - keeping waiting UI');
          alert('❌ Camera/Microphone access denied. Please enable permissions in browser settings and try again.');
          // Stay in permission waiting state (UI already showing)
          return;
        }
        
        // If permissions granted, proceed
        if (camera === 'granted' && microphone === 'granted') {
          console.log('[CallHandler] [Callee] [FIX v1.1] ✅ Both permissions granted');
          console.log('[CallHandler] [Callee] [FIX v1.1] Current UI state before continueAcceptFlow:', CallHandler._currentUIState);
          
          // If we never showed waiting UI, we're still in callAccepted - that's correct!
          if (CallHandler._currentUIState === 'callee:waitingForCamMicPermissions') {
            console.log('[CallHandler] [Callee] [FIX v1.1] ⚠️ Still in waitingForCamMicPermissions - onPermissionsResolved should have handled this');
          } else {
            console.log('[CallHandler] [Callee] [FIX v1.1] ✅ Still in callAccepted (never showed waiting UI) - correct behavior!');
          }
          
          // Continue with accept flow (stays in callAccepted if we never showed waiting)
          continueAcceptFlow();
          return;
        }
        
        // Unknown state - show warning but proceed
        console.warn('[CallHandler] [Callee] [FIX v1.1] ⚠️ Unknown permission state - proceeding anyway');
        alert('⚠️ Unable to verify camera/microphone permissions. Call may not work properly.');
        continueAcceptFlow();
      };
      
      // Listen for UI events (NEW system)
      console.log('[CallHandler] [Callee] [FIX v1.1] 📡 Registering listeners: CamMic:UI:ShowWaiting, CamMic:UI:PermissionsResolved, CamMic:Orchestrate:Complete');
      window.addEventListener('CamMic:UI:ShowWaiting', onShowWaiting);
      window.addEventListener('CamMic:UI:PermissionsResolved', onPermissionsResolved);
      
      // Listen for orchestration completion
      window.addEventListener('CamMic:Orchestrate:Complete', onAcceptComplete);
      console.log('[CallHandler] [Callee] [FIX v1.1] ✅ All listeners registered');
      
      // Check if we need to shift UI first, then start orchestration
      const startOrchestration = async () => {
        // Check current permissions to see if we need to show waiting UI
        try {
          const cameraState = await navigator.permissions?.query({ name: 'camera' }).then(r => r.state).catch(() => 'prompt');
          const micState = await navigator.permissions?.query({ name: 'microphone' }).then(r => r.state).catch(() => 'prompt');
          
          const needsPrompt = cameraState === 'prompt' || micState === 'prompt';
          
          if (needsPrompt) {
            console.log('[CallHandler] [Callee] [FIX v1.1] 📺 Permissions need prompt - shifting UI first');
            // Shift UI first
            CallHandler.dipatchUI("callee:waitingForCamMicPermissions", "none", {
              callerId: callerIdVal,
              calleeId: calleeIdVal,
              role: calleeRole,
            });
            
            // Wait for UI to actually shift
            try {
              await waitForUIStateChange("callee:waitingForCamMicPermissions");
              console.log('[CallHandler] [Callee] [FIX v1.1] ✅ UI confirmed shifted - starting orchestration');
            } catch (error) {
              console.warn('[CallHandler] [Callee] [FIX v1.1] ⚠️ Could not confirm UI shift, proceeding anyway:', error);
            }
          } else {
            console.log('[CallHandler] [Callee] [FIX v1.1] ✅ Permissions already granted - no UI shift needed');
          }
        } catch (error) {
          console.warn('[CallHandler] [Callee] [FIX v1.1] ⚠️ Error checking permissions, proceeding:', error);
        }
        
        // Start orchestration after UI shift (if needed)
        console.log('[CallHandler] [Callee] [FIX v1.1] 🚀 Dispatching CamMic:Orchestrate:Both:NoPreview');
        window.dispatchEvent(new CustomEvent('CamMic:Orchestrate:Both:NoPreview'));
        console.log('[CallHandler] [Callee] [FIX v1.1] ✅ Orchestration started - waiting for events...');
      };
      
      // Start the flow
      startOrchestration();
      
    } else {
      // Audio call: orchestrate microphone only
      console.log('[CallHandler] [Callee] [FIX v1.1] Audio call - orchestrating microphone only');
      
      // Use a callback pattern to wait for orchestration completion
      const onAcceptComplete = (ev) => {
        console.log('[CallHandler] [Callee] [FIX v1.1] 🔔 CamMic:Orchestrate:Complete received (audio)');
        window.removeEventListener('CamMic:Orchestrate:Complete', onAcceptComplete);
        window.removeEventListener('CamMic:UI:ShowWaiting', onShowWaiting);
        window.removeEventListener('CamMic:UI:PermissionsResolved', onPermissionsResolved);
        console.log('[CallHandler] [Callee] [FIX v1.1] 🧹 Removed all event listeners (audio)');
        
        const detail = ev.detail || {};
        console.log('[CallHandler] [Callee] [FIX v1.1] Mic orchestration complete:', detail);
        
        // Check permission states
        const microphone = detail.permissions?.microphone || 'unknown';
        
        console.log('[CallHandler] [Callee] [FIX v1.1] Microphone permission state:', microphone);
        console.log('[CallHandler] [Callee] [FIX v1.1] Current UI state:', CallHandler._currentUIState);
        
        // If permission denied, show error and stay waiting
        if (microphone === 'denied') {
          console.log('[CallHandler] [Callee] [FIX v1.1] ❌ Microphone denied - keeping waiting UI');
          alert('❌ Microphone access denied. Please enable permissions in browser settings and try again.');
          // Stay in permission waiting state (UI already showing)
          return;
        }
        
        // If permission granted, proceed
        if (microphone === 'granted') {
          console.log('[CallHandler] [Callee] [FIX v1.1] ✅ Microphone permission granted');
          console.log('[CallHandler] [Callee] [FIX v1.1] Current UI state before continueAcceptFlow:', CallHandler._currentUIState);
          
          // If we never showed waiting UI, we're still in callAccepted - that's correct!
          if (CallHandler._currentUIState === 'callee:waitingForCamMicPermissions') {
            console.log('[CallHandler] [Callee] [FIX v1.1] ⚠️ Still in waitingForCamMicPermissions - onPermissionsResolved should have handled this');
          } else {
            console.log('[CallHandler] [Callee] [FIX v1.1] ✅ Still in callAccepted (never showed waiting UI) - correct behavior!');
          }
          
          // Continue with accept flow (stays in callAccepted if we never showed waiting)
          continueAcceptFlow();
          return;
        }
        
        // Unknown state - show warning but proceed
        console.warn('[CallHandler] [Callee] [FIX v1.1] ⚠️ Unknown microphone permission state - proceeding anyway');
        alert('⚠️ Unable to verify microphone permissions. Call may not work properly.');
        continueAcceptFlow();
      };
      
      // Listen for UI events (NEW system)
      console.log('[CallHandler] [Callee] [FIX v1.1] 📡 Registering listeners (audio): CamMic:UI:ShowWaiting, CamMic:UI:PermissionsResolved, CamMic:Orchestrate:Complete');
      window.addEventListener('CamMic:UI:ShowWaiting', onShowWaiting);
      window.addEventListener('CamMic:UI:PermissionsResolved', onPermissionsResolved);
      
      // Listen for orchestration completion
      window.addEventListener('CamMic:Orchestrate:Complete', onAcceptComplete);
      console.log('[CallHandler] [Callee] [FIX v1.1] ✅ All listeners registered (audio)');
      
      // Check if we need to shift UI first, then start orchestration
      const startOrchestration = async () => {
        // Check current permissions to see if we need to show waiting UI
        try {
          const micState = await navigator.permissions?.query({ name: 'microphone' }).then(r => r.state).catch(() => 'prompt');
          
          const needsPrompt = micState === 'prompt';
          
          if (needsPrompt) {
            console.log('[CallHandler] [Callee] [FIX v1.1] 📺 Microphone needs prompt - shifting UI first');
            // Shift UI first
            CallHandler.dipatchUI("callee:waitingForCamMicPermissions", "none", {
              callerId: callerIdVal,
              calleeId: calleeIdVal,
              role: calleeRole,
            });
            
            // Wait for UI to actually shift
            try {
              await waitForUIStateChange("callee:waitingForCamMicPermissions");
              console.log('[CallHandler] [Callee] [FIX v1.1] ✅ UI confirmed shifted - starting orchestration');
            } catch (error) {
              console.warn('[CallHandler] [Callee] [FIX v1.1] ⚠️ Could not confirm UI shift, proceeding anyway:', error);
            }
          } else {
            console.log('[CallHandler] [Callee] [FIX v1.1] ✅ Microphone already granted - no UI shift needed');
          }
        } catch (error) {
          console.warn('[CallHandler] [Callee] [FIX v1.1] ⚠️ Error checking permissions, proceeding:', error);
        }
        
        // Start orchestration after UI shift (if needed)
        console.log('[CallHandler] [Callee] [FIX v1.1] 🚀 Dispatching CamMic:Orchestrate:Microphone');
        window.dispatchEvent(new CustomEvent('CamMic:Orchestrate:Microphone'));
        console.log('[CallHandler] [Callee] [FIX v1.1] ✅ Orchestration started (audio) - waiting for events...');
      };
      
      // Start the flow
      startOrchestration();
    }
    
    // Return early - the rest of the accept flow will run in continueAcceptFlow()
    console.log('[CallHandler] [Callee] [FIX v1.1] ⏸️ Returning early - accept flow will continue in continueAcceptFlow()');
    return;
    
    // Helper function to continue accept flow after CamMic orchestration
    function continueAcceptFlow() {
      console.log('[CallHandler] [Callee] 🎬 Continuing accept flow after CamMic orchestration (meeting setup)');

    console.log("[CallHandler] meeting ops begin");
    
    // Notify caller: Starting DB creation
    SocketHandler.sendSocketMessage({
      flag: "meeting:status",
      payload: {
        to: callerIdVal,
        status: "creating_db",
        message: "Creating meeting in database...",
      },
    });
    
    // Create new AbortController for this API request chain
    console.log('%c[API] Creating new AbortController for meeting setup', 'background: #17a2b8; color: white; padding: 5px;');
    CallHandler._apiAbortController = new AbortController();
    
    CallHandler.getMeetingID(calleeIdVal, calleeRole)
      .then((meetingId) => {
        console.log("[CallHandler] DB meeting id", meetingId);
        DebugLogger.addLog(
          "setuping up",
          "NOTICE",
          "handleAcceptClick",
          "Step 2: Creating Chime meeting & requesting permissions..."
        );
        
        // Notify caller: DB created, creating Chime
        SocketHandler.sendSocketMessage({
          flag: "meeting:status",
          payload: {
            to: callerIdVal,
            status: "creating_chime",
            message: "Database meeting created. Creating Chime meeting...",
            meetingId: meetingId,
          },
        });
        
        // Check if we need to request permissions now or wait for manual join
        const mediaType = CallHandler._invite.callType || "video";
        if (CallHandler.CALLEE_MANUAL_JOIN_ENABLED) {
          // Manual join: don't request permissions now, wait for Join button click
          return CallHandler.createChimeMeeting(meetingId, calleeIdVal, calleeRole)
            .then((chimeData) => ({ meetingId, chimeId: chimeData.chimeMeetingId, fullMeeting: chimeData.fullMeeting }));
        } else {
          // Auto-join: request permissions now
          return Promise.all([
            CallHandler.createChimeMeeting(meetingId, calleeIdVal, calleeRole),
            CallHandler.ensureCamMicReady(mediaType)
          ]).then(([chimeData]) => ({ meetingId, chimeId: chimeData.chimeMeetingId, fullMeeting: chimeData.fullMeeting }));
        }
      })
      .then(({ meetingId, chimeId, fullMeeting }) => {
        console.log("[CallHandler] MEETING_READY to caller (with roles)", {
          meetingId,
          callerRole: CallHandler._invite.callerRole,
          calleeRole,
        });

        DebugLogger.addLog(
          "setuping up",
          "NOTICE",
          "handleAcceptClick",
          "Step 3: Permissions granted. Notifying caller..."
        );
        DebugLogger.addLog(
          "setuping up",
          "NOTICE",
          "handleAcceptClick",
          `Sending to caller: DB ID = ${meetingId}, Chime ID = ${chimeId}`
        );

        // Fix callerRole type validation - ensure it's a string
        const callerRoleValue = typeof CallHandler._invite.callerRole === 'string' 
          ? CallHandler._invite.callerRole 
          : (CallHandler._invite.callerRole?.value || 'attendee');
        
        console.log('%c[MEETING_READY] Sending with callerRole:', 'background: #28a745; color: white; padding: 5px;', {
          callerRoleRaw: CallHandler._invite.callerRole,
          callerRoleValue: callerRoleValue,
          calleeRole: calleeRole
        });
        
        SocketHandler.sendSocketMessage({
          flag: CallHandler.FLAGS.MEETING_READY,
          payload: {
            to: CallHandler._invite.callerId || callerIdVal,
            meetingId,
            callerId: callerIdVal,
            calleeId: calleeIdVal,
            callerRole: callerRoleValue,
            calleeRole,
            chimeMeetingId: chimeId,
            dbMeetingId: meetingId,
            callId: CallHandler._currentCallId,
          },
          schema: CallHandler.SCHEMA.meetingReady,
        });

        // 🔔 UI (callee) → check if manual join is enabled
        if (CallHandler.CALLEE_MANUAL_JOIN_ENABLED) {
          // Callee needs to manually click Join to join with cam/mic
          CallHandler.dipatchUI("callee:connected", "none", {
            meetingId,
            userId: calleeIdVal,
            role: calleeRole,
          });
          
          // Store join info for when the Join button is clicked
          CallHandler._pendingCalleeJoin = {
            callId: CallHandler._currentCallId,
            meetingId,
            calleeId: calleeIdVal,
            calleeRole,
            chimeId,
            callType: CallHandler._invite.callType,
            fullMeeting,
          };
        } else {
          // Auto-join like before
          DebugLogger.addLog(
            "connecting",
            "NOTICE",
            "handleAcceptClick",
            "Step 4: Joining meeting..."
          );
          console.log(
            "[CallHandler] callee joinChimeMeeting with role",
            calleeRole
          );
          return CallHandler.joinChimeMeeting(
            meetingId,
            calleeIdVal,
            calleeRole,
            chimeId,
            CallHandler._invite.callType,
            fullMeeting
          ).then(() => {
            console.log("[CallHandler] dispatch MEETING_CONNECT (callee)");
            document.dispatchEvent(
              new CustomEvent(CallHandler.FLAGS.MEETING_CONNECT, {
                detail: {
                  meetingId,
                  userId: calleeIdVal,
                  role: calleeRole,
                  chimeMeetingId: chimeId,
                },
              })
            );
          });
        }
      })
      .catch((err) => {
        console.error("[CallHandler] callee meeting flow error", err);
        CallHandler._inCallOrConnecting = false; // Reset so user can try again
        CallHandler.dipatchUI("callee:terminated", "error", {
          message: err && err.message ? err.message : "Unknown error",
        });
        DebugLogger.addLog(
          "terminated",
          "CRITICAL",
          "handleAcceptClick",
          `Meeting Error: ${err && err.message ? err.message : "Unknown error"}`
        );
        SocketHandler.sendSocketMessage({
          flag: CallHandler.FLAGS.MEETING_PROBLEM,
          payload: {
            to: callerIdVal,
            meetingId: "unknown",
            callerId: callerIdVal,
            calleeId: calleeIdVal,
            message: err && err.message ? err.message : "Unknown error",
          },
          schema: CallHandler.SCHEMA.meetingProblem,
        });
      });
    } // End of continueAcceptFlow function
  }

  static handleRejectClick() {
    DebugLogger.addLog("receiving call", "NOTICE", "handleRejectClick", "UI click: Reject");
    console.log("[CallHandler] UI click: Reject");

    if (!CallHandler._els.currentUserId) {
      console.log("[CallHandler] currentUserId input missing");
      DebugLogger.addLog(
        "rejected",
        "CRITICAL",
        "handleRejectClick",
        "Missing your ID"
      );
      return;
    }
    if (!CallHandler._els.targetUserId) {
      console.log("[CallHandler] targetUserId input missing");
      DebugLogger.addLog(
        "rejected",
        "CRITICAL",
        "handleRejectClick",
        "Missing target/caller ID"
      );
      return;
    }
    if (!CallHandler._els.callType) {
      console.log("[CallHandler] callType select missing");
      DebugLogger.addLog(
        "rejected",
        "CRITICAL",
        "handleRejectClick",
        "Missing call type"
      );
      return;
    }
    if (!CallHandler._els.rejectReason) {
      console.log("[CallHandler] rejectReason select missing");
      DebugLogger.addLog(
        "rejected",
        "CRITICAL",
        "handleRejectClick",
        "Missing reject reason"
      );
      return;
    }

    const callTypeVal = CallHandler._els.callType.value;
    const reasonVal = CallHandler._els.rejectReason.value;
    const calleeIdVal = CallHandler._els.currentUserId.value;
    const callerIdVal = CallHandler._els.targetUserId.value;

    console.log("[CallHandler] values", {
      callTypeVal,
      reasonVal,
      callerIdVal,
      calleeIdVal,
    });

    if (callTypeVal !== CallHandler.TYPE_INSTANT) {
      console.log("[CallHandler] non-instant call; reject aborted");
      DebugLogger.addLog(
        "rejected",
        "NOTICE",
        "handleRejectClick",
        "Instant one-on-one only"
      );
      return;
    }
    if (callerIdVal === undefined || callerIdVal === "") {
      console.log("[CallHandler] missing callerId");
      DebugLogger.addLog(
        "rejected",
        "CRITICAL",
        "handleRejectClick",
        "Missing callerId"
      );
      return;
    }
    if (calleeIdVal === undefined || calleeIdVal === "") {
      console.log("[CallHandler] missing calleeId");
      DebugLogger.addLog(
        "rejected",
        "CRITICAL",
        "handleRejectClick",
        "Missing calleeId"
      );
      return;
    }
    if (reasonVal === undefined || reasonVal === "") {
      console.log("[CallHandler] missing reason");
      DebugLogger.addLog(
        "rejected",
        "CRITICAL",
        "handleRejectClick",
        "Select a reject reason"
      );
      return;
    }

    console.log("[CallHandler] SELF_STOP_RING to callee");
    SocketHandler.sendSocketMessage({
      flag: CallHandler.FLAGS.SELF_STOP_RING,
      payload: { to: calleeIdVal, calleeId: calleeIdVal },
      schema: CallHandler.SCHEMA.selfStop,
    });

    console.log("[CallHandler] CALL_DECLINED to caller");
    SocketHandler.sendSocketMessage({
      flag: CallHandler.FLAGS.CALL_DECLINED,
      payload: {
        to: callerIdVal,
        callerId: callerIdVal,
        calleeId: calleeIdVal,
        reason: reasonVal,
      },
      schema: CallHandler.SCHEMA.decline,
    });

    console.log("[CallHandler] local dispatch CALL_DECLINED");
    document.dispatchEvent(
      new CustomEvent(CallHandler.FLAGS.CALL_DECLINED, {
        detail: {
          callerId: callerIdVal,
          calleeId: calleeIdVal,
          reason: reasonVal,
        },
      })
    );

    // 🔔 UI (callee) → rejected
    CallHandler.dipatchUI("callee:rejected", "none", {
      callerId: callerIdVal,
      calleeId: calleeIdVal,
      reason: reasonVal,
    });

    DebugLogger.addLog("rejected", "NOTICE", "handleRejectClick", "Rejected with answer");
  }

  static handleCancelClick() {
    DebugLogger.addLog("calling", "NOTICE", "handleCancelClick", "UI click: Cancel");
    console.log("[CallHandler] UI click: Cancel");

    if (!CallHandler._els.currentUserId) {
      console.log("[CallHandler] currentUserId input missing");
      DebugLogger.addLog(
        "terminated",
        "CRITICAL",
        "handleCancelClick",
        "Missing your ID"
      );
      return;
    }
    if (!CallHandler._els.targetUserId) {
      console.log("[CallHandler] targetUserId input missing");
      DebugLogger.addLog(
        "terminated",
        "CRITICAL",
        "handleCancelClick",
        "Missing target user ID"
      );
      return;
    }
    if (!CallHandler._els.callType) {
      console.log("[CallHandler] callType select missing");
      DebugLogger.addLog(
        "terminated",
        "CRITICAL",
        "handleCancelClick",
        "Missing call type"
      );
      return;
    }

    const callTypeVal = CallHandler._els.callType.value;
    const callerIdVal = CallHandler._els.currentUserId.value;
    const calleeIdVal = CallHandler._els.targetUserId.value;

    console.log("[CallHandler] values", {
      callTypeVal,
      callerIdVal,
      calleeIdVal,
    });

    if (callTypeVal !== CallHandler.TYPE_INSTANT) {
      console.log("[CallHandler] non-instant call; cancel aborted");
      DebugLogger.addLog(
        "terminated",
        "NOTICE",
        "handleCancelClick",
        "Instant one-on-one only"
      );
      return;
    }
    if (callerIdVal === undefined || callerIdVal === "") {
      console.log("[CallHandler] missing callerId");
      DebugLogger.addLog(
        "terminated",
        "CRITICAL",
        "handleCancelClick",
        "Missing callerId"
      );
      return;
    }
    if (calleeIdVal === undefined || calleeIdVal === "") {
      console.log("[CallHandler] missing calleeId");
      DebugLogger.addLog(
        "terminated",
        "CRITICAL",
        "handleCancelClick",
        "Missing calleeId"
      );
      return;
    }

    console.log("[CallHandler] CALL_CANCELLED to callee");
    SocketHandler.sendSocketMessage({
      flag: CallHandler.FLAGS.CALL_CANCELLED,
      payload: {
        to: calleeIdVal,
        callerId: callerIdVal,
        calleeId: calleeIdVal,
      },
      schema: CallHandler.SCHEMA.cancel,
    });

    console.log("[CallHandler] local dispatch CALL_CANCELLED");
    document.dispatchEvent(
      new CustomEvent(CallHandler.FLAGS.CALL_CANCELLED, {
        detail: { callerId: callerIdVal, calleeId: calleeIdVal },
      })
    );

    // 🔔 UI (caller) → cancelled
    CallHandler.dipatchUI("caller:terminated", "cancelled", {
      callerId: callerIdVal,
      calleeId: calleeIdVal,
    });

    DebugLogger.addLog("terminated", "NOTICE", "handleCancelClick", "Call cancelled");
  }

  /* ====================================================================
   * handleTerminateClick()
   * Called when user clicks end-call button during callWaiting or callAccepted
   * ==================================================================== */
  static handleTerminateClick() {
    DebugLogger.addLog("calling", "NOTICE", "handleTerminateClick", "User clicked end-call");
    console.log("%c[TERMINATE] 🚨 handleTerminateClick called", 'background: #dc3545; color: white; font-weight: bold; padding: 5px;');

    // Get IDs from form inputs - NO FALLBACK, throw error if missing
    const currentUserInput = document.getElementById('currentUserId');
    const targetUserInput = document.getElementById('targetUserId');
    
    if (!currentUserInput || !targetUserInput) {
      console.error("%c[TERMINATE] ❌ Form input elements not found", 'background: #dc3545; color: white; font-weight: bold; padding: 5px;');
      DebugLogger.addLog("terminated", "CRITICAL", "handleTerminateClick", "Form input elements not found");
      return;
    }
    
    const callerId = currentUserInput.value.trim();
    const calleeId = targetUserInput.value.trim();
    
    if (!callerId || !calleeId) {
      console.error("%c[TERMINATE] ❌ Form inputs are empty", 'background: #dc3545; color: white; font-weight: bold; padding: 5px;', { callerId, calleeId });
      DebugLogger.addLog("terminated", "CRITICAL", "handleTerminateClick", "Form inputs are empty");
      return;
    }
    
    console.log("%c[TERMINATE] 📋 User IDs from form", 'background: #17a2b8; color: white; padding: 5px;', { 
      currentUser: callerId, 
      targetUser: calleeId
    });

    // Get role from _currentSide (set during call initiation)
    const role = CallHandler._currentSide || 'caller';
    console.log("%c[TERMINATE] 👤 Role", 'background: #17a2b8; color: white; padding: 5px;', { 
      role,
      source: CallHandler._currentSide ? '_currentSide' : 'default'
    });

    // Detect termination reason
    let terminationReason;
    if (CallHandler._inCallOrConnecting === true) {
      terminationReason = CallHandler.TERMINATION_REASONS.ON_ANOTHER_CALL;
      console.log("%c[TERMINATE] 🔍 Detected reason: ON_ANOTHER_CALL", 'background: #ffc107; color: black; padding: 5px;');
    } else {
      terminationReason = CallHandler.TERMINATION_REASONS.BUSY;
      console.log("%c[TERMINATE] 🔍 Detected reason: BUSY", 'background: #ffc107; color: black; padding: 5px;');
    }

    // Shutdown and reset all Chime calls and stop all video streams
    console.log("%c[TERMINATE] 🔌 Shutting down Chime meeting and stopping all streams", 'background: #17a2b8; color: white; padding: 5px;');
    
    // 1. Disconnect from Chime meeting (built-in cleanup)
    if (window.chimeHandler && typeof chimeHandler.handleEnd === 'function') {
      console.log("%c[TERMINATE] 🔌 Calling chimeHandler.handleEnd()", 'background: #17a2b8; color: white; padding: 5px;');
      chimeHandler.handleEnd(true);
    } else if (typeof coreChime !== 'undefined' && typeof coreChime.leave === 'function') {
      console.log("%c[TERMINATE] 🔌 Calling coreChime.leave() directly", 'background: #17a2b8; color: white; padding: 5px;');
      coreChime.leave("User ended call");
    } else {
      console.log("%c[TERMINATE] ⚠️ Chime handlers not available", 'background: #ffc107; color: black; padding: 5px;');
    }
    
    // 2. Stop all camera/mic streams via CamMic permissions handler (safety)
    try {
      if (window.CamMicPermissionsHandler && typeof window.CamMicPermissionsHandler.stopAllStreams === 'function') {
        console.log("%c[TERMINATE] 🎥 Stopping all streams via CamMicPermissionsHandler", 'background: #17a2b8; color: white; padding: 5px;');
        window.CamMicPermissionsHandler.stopAllStreams();
      } else if (window.CamMicPermissionsUtility && typeof window.CamMicPermissionsUtility.stopStreams === 'function') {
        console.log("%c[TERMINATE] 🎥 Stopping all streams via CamMicPermissionsUtility", 'background: #17a2b8; color: white; padding: 5px;');
        window.CamMicPermissionsUtility.stopStreams();
      } else {
        // Fallback: dispatch event
        console.log("%c[TERMINATE] 🎥 Dispatching CamMic:Streams:Stop event", 'background: #17a2b8; color: white; padding: 5px;');
        window.dispatchEvent(new CustomEvent('CamMic:Streams:Stop'));
      }
    } catch (err) {
      console.error("%c[TERMINATE] ❌ Error stopping streams", 'background: #dc3545; color: white; font-weight: bold; padding: 5px;', err);
    }

    // Check if SocketHandler exists
    if (typeof SocketHandler === 'undefined') {
      console.error("%c[TERMINATE] ❌ SocketHandler is not defined!", 'background: #dc3545; color: white; font-weight: bold; padding: 5px;');
      DebugLogger.addLog("terminated", "CRITICAL", "handleTerminateClick", "SocketHandler not defined");
      return;
    }

    if (typeof SocketHandler.sendSocketMessage !== 'function') {
      console.error("%c[TERMINATE] ❌ SocketHandler.sendSocketMessage is not a function!", 'background: #dc3545; color: white; font-weight: bold; padding: 5px;');
      DebugLogger.addLog("terminated", "CRITICAL", "handleTerminateClick", "SocketHandler.sendSocketMessage not a function");
      return;
    }

    // Recipient is ALWAYS the targetUser (the other person)
    const recipientId = calleeId;
    
    console.log("%c[TERMINATE] TERMINATED TO: " + recipientId, 'background: #ff0000; color: white; font-weight: bold; font-size: 14px; padding: 8px;', {
      from: callerId,
      to: recipientId,
      role,
      message: `Sending termination from ${callerId} to ${recipientId}`
    });
    
    // Determine substate based on role and current state - DIRECT CHECK, NO FALLBACKS
    let localSubstate = terminationReason; // Default: Busy or on_another_call
    let socketReason = 'cancelled'; // Default reason for socket message
    
    if (role === 'callee') {
      // Callee terminating - check if in incoming call state (not answered yet) OR callAccepted state
      const isIncomingCall = CallHandler._currentUIState === 'callee:incomingVideoCall' || 
                            CallHandler._currentUIState === 'callee:incomingAudioCall';
      const isCallAccepted = CallHandler._currentUIState === 'callee:callAccepted';
      if (isIncomingCall || isCallAccepted) {
        // Callee declined before accepting OR declined from callAccepted state
        localSubstate = 'declined';
        socketReason = 'declined';
      } else {
        // Callee ended after accepting (joined/inCall/connected)
        localSubstate = terminationReason; // Busy or on_another_call
        socketReason = 'ended';
      }
    } else if (role === 'caller') {
      // Caller cancelling - check if in callWaiting (callee not answered) or in call (callee answered)
      const isCallWaiting = CallHandler._currentUIState === 'caller:callWaiting';
      const isInCall = CallHandler._currentUIState && (
        CallHandler._currentUIState.includes('connected') || 
        CallHandler._currentUIState.includes('joined') ||
        CallHandler._currentUIState === 'caller:callAccepted' ||
        CallHandler._currentUIState === 'shared:inCall'
      );
      if (isCallWaiting) {
        // Caller cancelled before callee answered - caller sees "You have cancelled the call"
        localSubstate = 'caller_cancelled'; // Special substate for caller cancelling
        socketReason = 'cancelled';
      } else if (isInCall) {
        // Caller ended after callee answered
        localSubstate = terminationReason; // Busy or on_another_call
        socketReason = 'ended';
      } else {
        // Fallback
        localSubstate = terminationReason;
        socketReason = 'cancelled';
      }
    }

    const socketMessage = {
      flag: CallHandler.FLAGS.CALL_CANCELLED,
      payload: {
        to: recipientId,
        callerId: callerId,
        calleeId: calleeId,
        callId: CallHandler._currentCallId,
        reason: socketReason,
      },
      schema: CallHandler.SCHEMA.cancel,
    };

    console.log("%c[TERMINATE] 📤 Sending CALL_CANCELLED socket message", 'background: #28a745; color: white; font-weight: bold; padding: 5px;', {
      flag: socketMessage.flag,
      flagValue: CallHandler.FLAGS.CALL_CANCELLED,
      payload: socketMessage.payload,
      schema: socketMessage.schema,
      fullMessage: JSON.stringify(socketMessage, null, 2)
    });

    // Terminate this call ID
    if (CallHandler._currentCallId) {
      CallHandler.terminateCall(CallHandler._currentCallId);
    }
    
    // Run comprehensive cleanup for termination
    console.log('%c[TERMINATE] 🧹 Running cleanup for terminated call', 'background: #ff6b6b; color: white; font-weight: bold; padding: 5px;');
    CallHandler._cleanupForNewCall(null, 'Call terminated by user');
    
    // Clear all call-related state (database IDs, meeting info, etc.)
    CallHandler.clearAllCallState();
    
    // Reset Vue call settings (including cam/mic)
    if (window.vueApp && typeof window.vueApp.resetCallSettings === 'function') {
      window.vueApp.resetCallSettings();
    }
    
    // Reset mockCallData on terminate
    if (window.mockCallData) {
      console.log('[CallHandler] Resetting mockCallData on terminate');
      window.mockCallData.callType = null;
      window.mockCallData.mediaType = null;
      window.mockCallData.currentUserRole = null;
      window.mockCallData.currentUserSide = null;
      window.mockCallData.isInGrace = false;
      // Note: We keep currentUser and targetUser as they may be persistent user info
    }
    
    try {
      SocketHandler.sendSocketMessage(socketMessage);
      console.log("%c[TERMINATE] ✅ Socket message sent successfully", 'background: #28a745; color: white; font-weight: bold; padding: 5px;');
      DebugLogger.addLog("terminated", "NOTICE", "handleTerminateClick", "Socket message sent", socketMessage);
    } catch (error) {
      console.error("%c[TERMINATE] ❌ Error sending socket message", 'background: #dc3545; color: white; font-weight: bold; padding: 5px;', error);
      DebugLogger.addLog("terminated", "CRITICAL", "handleTerminateClick", "Error sending socket message", { error: error.message });
    }

    // Dispatch local CALL_CANCELLED event
    console.log("%c[TERMINATE] 📢 Dispatching local CALL_CANCELLED event", 'background: #17a2b8; color: white; padding: 5px;');
    document.dispatchEvent(
      new CustomEvent(CallHandler.FLAGS.CALL_CANCELLED, {
        detail: { callerId: callerId, calleeId: calleeId },
      })
    );

    // Set terminated state with determined substate
    const terminatedState = `${role}:terminated`;
    console.log("%c[TERMINATE] 🎯 Setting UI state", 'background: #17a2b8; color: white; padding: 5px;', { 
      terminatedState, 
      substate: localSubstate, 
      reason: terminationReason,
      currentState: CallHandler._currentUIState,
      role
    });
    CallHandler.dipatchUI(terminatedState, localSubstate, {
      callerId: callerId,
      calleeId: calleeId,
    });

    DebugLogger.addLog("terminated", "NOTICE", "handleTerminateClick", "Call terminated by user");
    console.log("%c[TERMINATE] ✅ handleTerminateClick completed", 'background: #28a745; color: white; font-weight: bold; padding: 5px;');
  }

  /* ====================================================================
   * handleInsufficientTokens()
   * Called when caller or callee ends call due to insufficient tokens
   * ==================================================================== */
  static handleInsufficientTokens() {
    DebugLogger.addLog("terminated", "NOTICE", "handleInsufficientTokens", "Call ended due to insufficient tokens");
    console.log("%c[INSUFFICIENT_TOKENS] 🚨 Call ended due to insufficient tokens", 'background: #dc3545; color: white; font-weight: bold; padding: 5px;');

    // Get IDs from form inputs
    const currentUserInput = document.getElementById('currentUserId');
    const targetUserInput = document.getElementById('targetUserId');
    
    if (!currentUserInput || !targetUserInput) {
      console.error("%c[INSUFFICIENT_TOKENS] ❌ Form input elements not found", 'background: #dc3545; color: white; font-weight: bold; padding: 5px;');
      return;
    }
    
    const currentUserId = currentUserInput.value.trim();
    const targetUserId = targetUserInput.value.trim();
    
    if (!currentUserId || !targetUserId) {
      console.error("%c[INSUFFICIENT_TOKENS] ❌ Form inputs are empty", 'background: #dc3545; color: white; font-weight: bold; padding: 5px;');
      return;
    }

    // Determine role (caller or callee) from _currentSide or _invite
    let role = CallHandler._currentSide;
    let callerId, calleeId;
    
    if (!role) {
      // Try to determine from _invite
      if (CallHandler._invite && CallHandler._invite.callerId && CallHandler._invite.calleeId) {
        if (CallHandler._invite.callerId === currentUserId) {
          role = 'caller';
          callerId = CallHandler._invite.callerId;
          calleeId = CallHandler._invite.calleeId;
        } else if (CallHandler._invite.calleeId === currentUserId) {
          role = 'callee';
          callerId = CallHandler._invite.callerId;
          calleeId = CallHandler._invite.calleeId;
        } else {
          // Fallback: use form inputs
          role = 'caller'; // Default assumption
          callerId = currentUserId;
          calleeId = targetUserId;
        }
      } else {
        // Fallback: use form inputs
        role = 'caller'; // Default assumption
        callerId = currentUserId;
        calleeId = targetUserId;
      }
    } else {
      // Use _invite data if available, otherwise use form inputs
      if (CallHandler._invite && CallHandler._invite.callerId && CallHandler._invite.calleeId) {
        callerId = CallHandler._invite.callerId;
        calleeId = CallHandler._invite.calleeId;
      } else {
        callerId = currentUserId;
        calleeId = targetUserId;
      }
    }
    
    console.log("%c[INSUFFICIENT_TOKENS] 📋 Role determined", 'background: #17a2b8; color: white; padding: 5px;', { role, callerId, calleeId });
    
    // Shutdown and reset all Chime calls and stop all video streams
    console.log("%c[INSUFFICIENT_TOKENS] 🔌 Shutting down Chime meeting and stopping all streams", 'background: #17a2b8; color: white; padding: 5px;');
    
    // 1. Disconnect from Chime meeting
    if (window.chimeHandler && typeof chimeHandler.handleEnd === 'function') {
      chimeHandler.handleEnd(true); // Pass true to indicate user-initiated termination
    } else if (typeof coreChime !== 'undefined' && typeof coreChime.leave === 'function') {
      coreChime.leave("Insufficient tokens");
    }
    
    // 2. Stop all camera/mic streams
    try {
      if (window.CamMicPermissionsHandler && typeof window.CamMicPermissionsHandler.stopAllStreams === 'function') {
        window.CamMicPermissionsHandler.stopAllStreams();
      } else if (window.CamMicPermissionsUtility && typeof window.CamMicPermissionsUtility.stopStreams === 'function') {
        window.CamMicPermissionsUtility.stopStreams();
      } else {
        window.dispatchEvent(new CustomEvent('CamMic:Streams:Stop'));
      }
    } catch (err) {
      console.error("%c[INSUFFICIENT_TOKENS] ❌ Error stopping streams", 'background: #dc3545; color: white; font-weight: bold; padding: 5px;', err);
    }

    // Send cancellation to the other party
    const recipientId = role === 'caller' ? calleeId : callerId;
    if (typeof SocketHandler !== 'undefined' && typeof SocketHandler.sendSocketMessage === 'function') {
      SocketHandler.sendSocketMessage({
        flag: CallHandler.FLAGS.CALL_CANCELLED,
        payload: {
          to: recipientId,
          callerId: callerId,
          calleeId: calleeId,
          callId: CallHandler._currentCallId,
          reason: CallHandler.TERMINATION_REASONS.INSUFFICIENT_TOKENS,
        },
        schema: CallHandler.SCHEMA.cancel,
      });
    }

    // Terminate this call ID
    if (CallHandler._currentCallId) {
      CallHandler.terminateCall(CallHandler._currentCallId);
    }

    // Clear all call-related state (database IDs, meeting info, etc.)
    CallHandler.clearAllCallState();

    // Dispatch local event for insufficient tokens
    document.dispatchEvent(
      new CustomEvent('call:insufficient_tokens', {
        detail: { callerId, calleeId, reason: CallHandler.TERMINATION_REASONS.INSUFFICIENT_TOKENS, role },
      })
    );

    // Set terminated state (works for both caller and callee)
    const terminatedState = `${role}:terminated`;
    CallHandler.dipatchUI(terminatedState, CallHandler.TERMINATION_REASONS.INSUFFICIENT_TOKENS, {
      callerId: callerId,
      calleeId: calleeId,
    });

    DebugLogger.addLog("terminated", "NOTICE", "handleInsufficientTokens", "Call ended due to insufficient tokens", { role });
  }

  /* ===========================
   * APP DISPATCH (optional)
   * ========================= */
  static handleAppStartCall(e) {
    console.log("[CallHandler] app:call:start", e);
    const d = e && e.detail ? e.detail : undefined;
    if (!d) {
      console.log("[CallHandler] app:call:start missing detail");
      DebugLogger.addLog("calling", "CRITICAL", "handleAppStartCall", "Missing payload");
      return;
    }

    // Reset all call settings for new call (prevent inheritance from previous call)
    console.log("[CallHandler] Resetting all call settings for new call");
    if (window.vueApp && typeof window.vueApp.resetCallSettings === 'function') {
      window.vueApp.resetCallSettings();
    }

    // Clear terminated flag when starting a new call
    if (CallHandler._isCallTerminated) {
      console.log("[CallHandler] Clearing terminated flag - starting new call");
      CallHandler._isCallTerminated = false;
    }

    const callerId = d.callerId;
    const calleeId = d.calleeId;
    const callerRole = d.role;
    const callType = d.callType;

    if (callType !== CallHandler.TYPE_INSTANT) {
      console.log("[CallHandler] non-instant app start");
      DebugLogger.addLog(
        "calling",
        "NOTICE",
        "handleAppStartCall",
        "Instant one-on-one only"
      );
      return;
    }
    if (callerId === undefined || callerId === "") {
      console.log("[CallHandler] app start missing callerId");
      DebugLogger.addLog(
        "calling",
        "CRITICAL",
        "handleAppStartCall",
        "Missing callerId"
      );
      return;
    }
    if (calleeId === undefined || calleeId === "") {
      console.log("[CallHandler] app start missing calleeId");
      DebugLogger.addLog(
        "calling",
        "CRITICAL",
        "handleAppStartCall",
        "Missing calleeId"
      );
      return;
    }
    if (callerRole === undefined || callerRole === "") {
      console.log("[CallHandler] app start missing role");
      DebugLogger.addLog(
        "calling",
        "CRITICAL",
        "handleAppStartCall",
        "Missing role"
      );
      return;
    }

    console.log("[CallHandler] dispatch call:initiate");
    document.dispatchEvent(
      new CustomEvent(CallHandler.FLAGS.CALL_INITIATE, {
        detail: { callerId, calleeId, type: callType, role: callerRole },
      })
    );

    console.log("[CallHandler] socket CALL_INITIATE");
    SocketHandler.sendSocketMessage({
      flag: CallHandler.FLAGS.CALL_INITIATE,
      payload: { to: calleeId, callType, callerId, calleeId, role: callerRole },
      schema: CallHandler.SCHEMA.initiate,
    });

    // Set current side to caller
    CallHandler._currentSide = "caller";
    
    // Reset chimeHandler alerts for new call
    if (typeof chimeHandler !== 'undefined') {
      chimeHandler._hasShownJoinedAlert = false;
      chimeHandler._hasShownConnectedAlert = false;
      chimeHandler._hasShownInCallAlert = false;
    }
    
    // 🔔 UI (caller) → calling
    CallHandler.dipatchUI("caller:callWaiting", "none", {
      callerId,
      calleeId,
      role: callerRole,
    });

    // ⏲️ caller-side 2min timeout
    CallHandler.clearCallerRingTimer();
    CallHandler.clearCallerGraceTimer();
    const currentCallIdForCaller3 = CallHandler._currentCallId; // Store call ID in closure
    CallHandler._callerRingTimerId = setTimeout(() => {
      // Check if call ID still matches (call might have changed)
      if (CallHandler._currentCallId !== currentCallIdForCaller3) {
        console.log("[CallHandler] Caller timeout: call ID changed, ignoring timeout");
        return;
      }
      
      // Check if we're still in callWaiting state for this call (not in a different state)
      const isStillWaiting = CallHandler._currentUIState === 'caller:callWaiting';
      if (!isStillWaiting) {
        console.log("[CallHandler] Caller timeout: not in callWaiting state anymore, ignoring timeout", {
          currentState: CallHandler._currentUIState,
          callId: currentCallIdForCaller3
        });
        return;
      }
      
      console.log(
        "[CallHandler] CALLER ring timeout (app) → notify callee, start grace period"
      );
      // Send timeout to callee
      SocketHandler.sendSocketMessage({
        flag: CallHandler.FLAGS.CALL_TIMEOUT,
        payload: { to: calleeId, callerId, calleeId, callId: currentCallIdForCaller3 },
        schema: CallHandler.SCHEMA.timeout,
      });
      SocketHandler.sendSocketMessage({
        flag: CallHandler.FLAGS.SELF_STOP_RING,
        payload: { to: callerId, calleeId: callerId, callId: currentCallIdForCaller3 },
        schema: CallHandler.SCHEMA.selfStop,
      });
      
      // Start grace period - wait 10 seconds before terminating caller
      CallHandler._callerGraceTimerId = setTimeout(() => {
        // Check if call ID still matches
        if (CallHandler._currentCallId !== currentCallIdForCaller3) {
          console.log("[CallHandler] Grace period: call ID changed, ignoring termination");
          return;
        }
        
        // Check if we're already in an active call (accepted, connected, or joined)
        const isInActiveCall = CallHandler._currentUIState && (
          CallHandler._currentUIState.includes('callAccepted') ||
          CallHandler._currentUIState.includes('connected') ||
          CallHandler._currentUIState.includes('joined') ||
          CallHandler._currentUIState === 'shared:inCall'
        );
        
        if (isInActiveCall) {
          console.log("[CallHandler] Grace period: call is already active, ignoring timeout termination", {
            currentState: CallHandler._currentUIState,
            callId: currentCallIdForCaller3
          });
          return;
        }
        
        console.log("[CallHandler] Grace period ended → terminating caller");
        CallHandler.clearCallerGraceTimer();
        CallHandler.dipatchUI("caller:terminated", CallHandler.TERMINATION_REASONS.NO_ANSWER, {
          callerId,
          calleeId,
        });
        DebugLogger.addLog(
          "terminated",
          "NOTICE",
          "handleAppStartCall",
          "No answer (timeout)"
        );
      }, CallHandler._gracePeriodMs);
    }, CallHandler._ringTimeoutMs);

    DebugLogger.addLog("calling", "NOTICE", "handleAppStartCall", "Calling...");
  }


  static handleAppTerminateCall(e) {
    console.log("%c[CallHandler] app:call:terminate event received", 'background: #dc3545; color: white; font-weight: bold; padding: 5px;', e);
    const d = e && e.detail ? e.detail : undefined;
    console.log("[CallHandler] Event detail:", d);
    if (!d) {
      console.error("%c[CallHandler] app:call:terminate missing detail", 'background: #dc3545; color: white; font-weight: bold; padding: 5px;');
      DebugLogger.addLog(
        "terminated",
        "CRITICAL",
        "handleAppTerminateCall",
        "Missing payload"
      );
      return;
    }

    // Route to handleTerminateClick() - it will handle all termination logic
    console.log("%c[CallHandler] Routing to handleTerminateClick()", 'background: #17a2b8; color: white; padding: 5px;');
    CallHandler.handleTerminateClick();
  }

  static handleAppRejectCall(e) {
    console.log("[CallHandler] app:call:reject", e);
    const d = e && e.detail ? e.detail : undefined;
    if (!d) {
      console.log("[CallHandler] app:call:reject missing detail");
      DebugLogger.addLog(
        "rejected",
        "CRITICAL",
        "handleAppRejectCall",
        "Missing payload"
      );
      return;
    }

    const callerId = d.callerId;
    const calleeId = d.calleeId;
    const reason = d.reason;
    const callType = d.callType;

    if (callType !== CallHandler.TYPE_INSTANT) {
      console.log("[CallHandler] non-instant reject");
      DebugLogger.addLog(
        "rejected",
        "NOTICE",
        "handleAppRejectCall",
        "Instant one-on-one only"
      );
      return;
    }
    if (callerId === undefined || callerId === "") {
      console.log("[CallHandler] reject missing callerId");
      DebugLogger.addLog(
        "rejected",
        "CRITICAL",
        "handleAppRejectCall",
        "Missing callerId"
      );
      return;
    }
    if (calleeId === undefined || calleeId === "") {
      console.log("[CallHandler] reject missing calleeId");
      DebugLogger.addLog(
        "rejected",
        "CRITICAL",
        "handleAppRejectCall",
        "Missing calleeId"
      );
      return;
    }
    if (reason === undefined || reason === "") {
      console.log("[CallHandler] reject missing reason");
      DebugLogger.addLog(
        "rejected",
        "CRITICAL",
        "handleAppRejectCall",
        "Missing reason"
      );
      return;
    }

    console.log("[CallHandler] SELF_STOP_RING to callee");
    SocketHandler.sendSocketMessage({
      flag: CallHandler.FLAGS.SELF_STOP_RING,
      payload: { to: calleeId, calleeId },
      schema: CallHandler.SCHEMA.selfStop,
    });

    console.log("[CallHandler] CALL_DECLINED to caller");
    SocketHandler.sendSocketMessage({
      flag: CallHandler.FLAGS.CALL_DECLINED,
      payload: { to: callerId, callerId, calleeId, reason },
      schema: CallHandler.SCHEMA.decline,
    });

    console.log("[CallHandler] local dispatch CALL_DECLINED");
    document.dispatchEvent(
      new CustomEvent(CallHandler.FLAGS.CALL_DECLINED, {
        detail: { callerId, calleeId, reason },
      })
    );

    // 🔔 UI (callee) → rejected
    CallHandler.dipatchUI("callee:rejected", "none", {
      callerId,
      calleeId,
      reason,
    });

    DebugLogger.addLog(
      "rejected",
      "NOTICE",
      "handleAppRejectCall",
      "Rejected with answer"
    );
  }

  static handleAppCancelCall(e) {
    console.log("[CallHandler] app:call:cancel", e);
    const d = e && e.detail ? e.detail : undefined;
    if (!d) {
      console.log("[CallHandler] app:call:cancel missing detail");
      DebugLogger.addLog(
        "terminated",
        "CRITICAL",
        "handleAppCancelCall",
        "Missing payload"
      );
      return;
    }

    const callerId = d.callerId;
    const calleeId = d.calleeId;
    const callType = d.callType;

    if (callType !== CallHandler.TYPE_INSTANT) {
      console.log("[CallHandler] non-instant cancel");
      DebugLogger.addLog(
        "terminated",
        "NOTICE",
        "handleAppCancelCall",
        "Instant one-on-one only"
      );
      return;
    }
    if (callerId === undefined || callerId === "") {
      console.log("[CallHandler] cancel missing callerId");
      DebugLogger.addLog(
        "terminated",
        "CRITICAL",
        "handleAppCancelCall",
        "Missing callerId"
      );
      return;
    }
    if (calleeId === undefined || calleeId === "") {
      console.log("[CallHandler] cancel missing calleeId");
      DebugLogger.addLog(
        "terminated",
        "CRITICAL",
        "handleAppCancelCall",
        "Missing calleeId"
      );
      return;
    }

    console.log("[CallHandler] CALL_CANCELLED to callee");
    SocketHandler.sendSocketMessage({
      flag: CallHandler.FLAGS.CALL_CANCELLED,
      payload: { to: calleeId, callerId, calleeId },
      schema: CallHandler.SCHEMA.cancel,
    });

    console.log("[CallHandler] local dispatch CALL_CANCELLED");
    document.dispatchEvent(
      new CustomEvent(CallHandler.FLAGS.CALL_CANCELLED, {
        detail: { callerId, calleeId },
      })
    );

    // 🔔 UI (caller) → cancelled
    CallHandler.dipatchUI("caller:terminated", "cancelled", {
      callerId,
      calleeId,
    });

    DebugLogger.addLog(
      "terminated",
      "NOTICE",
      "handleAppCancelCall",
      "Call cancelled"
    );
  }

  /* ===========================
   * SOCKET EVENT HANDLERS
   * ========================= */
  static handleSocketIncomingCall(body) {
    DebugLogger.addLog("receiving call", "NOTICE", "handleSocketIncomingCall", "Incoming call from socket", body);
    console.log("[CallHandler] SOCKET call:incoming", body);
    if (!body) {
      console.log("[CallHandler] incoming missing body");
      return;
    }
    
    // Check blocklist FIRST - before any processing
    const callerId = body.callerId || body.from;
    if (callerId && CallHandler.isUserBlocked(callerId)) {
      console.log(`%c[BLOCKLIST] 🚫 Blocked incoming call from ${callerId} - no UI shift, no processing`, 'background: #dc3545; color: white; font-weight: bold; padding: 5px;');
      DebugLogger.addLog("blocklist", "NOTICE", "handleSocketIncomingCall", `Blocked incoming call from ${callerId}`);
      return; // Block completely - no UI, no processing
    }
    
    // Reset UI state tracking for new incoming call (clear terminated flag) - MUST be early, before any guard checks
    CallHandler.resetUIState(true);
    
    // Reset _inCallOrConnecting flag for new incoming call (callee can receive new call)
    CallHandler._inCallOrConnecting = false;
    console.log("[CallHandler] Reset _inCallOrConnecting for new incoming call");
    
    // CRITICAL: Clear old pending join to prevent joining old meetings
    if (CallHandler._pendingCalleeJoin) {
      console.log(`%c[CALL ID] 🧹 Clearing old pending join for call ${CallHandler._pendingCalleeJoin.callId}`, 'background: #dc3545; color: white; font-weight: bold; padding: 5px;');
      CallHandler._pendingCalleeJoin = null;
    }
    
    // Set call ID from incoming message (for callee)
    if (body.callId) {
      CallHandler.setCallId(body.callId);
      console.log(`%c[CALL ID] 📥 Received incoming call with ID: ${body.callId}`, 'background: #007bff; color: white; font-weight: bold; padding: 5px;');
    } else {
      console.warn(`%c[CALL ID] ⚠️ Incoming call missing callId`, 'background: #ffc107; color: black; padding: 5px;');
    }
    
    if (body.callType !== CallHandler.TYPE_INSTANT) {
      console.log("[CallHandler] ignore non-instant incoming");
      return;
    }
    if (body.callerId === undefined || body.callerId === "") {
      console.log("[CallHandler] incoming missing callerId");
      return;
    }
    if (body.calleeId === undefined || body.calleeId === "") {
      console.log("[CallHandler] incoming missing calleeId");
      return;
    }
    if (body.role === undefined || body.role === "") {
      console.log("[CallHandler] incoming missing callerRole");
      return;
    }

    // === Busy guard: if already in setup/connecting/connected, alert + auto-decline ===
    // BUT: Don't block if we're in terminated state (terminated means we're NOT in a call)
    const isTerminatedState = CallHandler._currentUIState && (
      CallHandler._currentUIState.includes('terminated') ||
      CallHandler._currentUIState.includes('rejected') ||
      CallHandler._currentUIState.includes('declined') ||
      CallHandler._currentUIState === 'ended'
    );
    
    if (CallHandler._inCallOrConnecting === true && !isTerminatedState) {
      DebugLogger.addLog(
        "receiving call",
        "NOTICE",
        "handleSocketIncomingCall",
        "Incoming call while in-call/connecting — auto-declining (kept current call)."
      );

      // Auto-decline new incoming without affecting current call
      SocketHandler.sendSocketMessage({
        flag: CallHandler.FLAGS.CALL_DECLINED,
        payload: {
          to: body.callerId,
          callerId: body.callerId,
          calleeId: body.calleeId,
          reason: CallHandler.TERMINATION_REASONS.ON_ANOTHER_CALL,
        },
        schema: CallHandler.SCHEMA.decline,
      });

      // Don't dispatch UI change - just decline the new call silently
      // (keep current call active, don't show terminated state)
      console.log("[CallHandler] Auto-declined new incoming call (user already in a call)");
      return; // do not start a new ring timer or incoming UI
    }

    // NOTE: ON INCOMING, WE SOURCE TARGET/CALLER FROM SOCKET (NOT FROM INPUTS)
    CallHandler._invite.callerId = body.callerId;
    CallHandler._invite.calleeId = body.calleeId;
    CallHandler._invite.callerRole = body.role;
    CallHandler._invite.callType = body.mediaType || "video";
    CallHandler._invite.callerData = body.callerData || null;
    CallHandler._invite.calleeData = body.calleeData || null;
    
    // Populate mockCallData for the call
    if (window.mockCallData) {
      window.mockCallData.callType = body.callType || CallHandler.TYPE_INSTANT;
      window.mockCallData.mediaType = body.mediaType || "video";
      
      // For callee: body.role is the CALLER's role, we need the CALLEE's role
      // In one-on-one: if caller is host, callee is attendee (and vice versa)
      const calleeRole = body.role === 'host' ? 'attendee' : 'host';
      window.mockCallData.currentUserRole = calleeRole;
      window.mockCallData.currentUserSide = "callee";
      
      // Callee side: use target from payload (callerData), NOT from DOM
      // Swap: current user is the callee, target user is the caller (from payload)
      window.mockCallData.currentUser = body.calleeData || window.mockCallData.currentUser;
      window.mockCallData.targetUser = body.callerData || window.mockCallData.targetUser;
      
      console.log(`[CallHandler] [Callee] mockCallData populated - Caller role: ${body.role}, Callee role: ${calleeRole}`, window.mockCallData);
      console.log(`[CallHandler] [Callee] Using targetUser from payload (callerData):`, body.callerData);
      
      // Sync mockCallData to Vue call settings
      if (window.vueApp && typeof window.vueApp.syncMockDataToVueSettings === 'function') {
        window.vueApp.syncMockDataToVueSettings();
      }
    }
    
    // Initialize CamMic permissions system (first call only)
    CallHandler._ensureCamMicInitialized();
    
    // Set current side to callee
    CallHandler._currentSide = "callee";
    
    // Reset chimeHandler alerts for new call
    if (typeof chimeHandler !== 'undefined') {
      chimeHandler._hasShownJoinedAlert = false;
      chimeHandler._hasShownConnectedAlert = false;
      chimeHandler._hasShownInCallAlert = false;
    }

    console.log("[CallHandler] dispatch LOCAL call:ringing");
    document.dispatchEvent(
      new CustomEvent(CallHandler.FLAGS.CALL_RINGING, {
        detail: { 
          callerId: body.callerId, 
          calleeId: body.calleeId,
          callerData: body.callerData,
          calleeData: body.calleeData,
        },
      })
    );

    // 🔔 UI (callee) → incoming - determine if audio or video call
    const mediaType = body.mediaType || "video";
    const incomingState = mediaType === "audio" ? "callee:incomingAudioCall" : "callee:incomingVideoCall";
    CallHandler.dipatchUI(incomingState, "none", {
      callerId: body.callerId,
      calleeId: body.calleeId,
      callerRole: body.role,
      callerData: body.callerData,
      calleeData: body.calleeData,
    });
    
    // Format caller details for logging
    const callerName = body.callerData?.displayName || body.callerData?.username || body.callerId;
    let callerDetailsStr = `User ID: ${body.callerId}`;
    if (body.callerData) {
      callerDetailsStr = [
        `Display Name: ${body.callerData.displayName}`,
        `Username: @${body.callerData.username}`,
        `User ID: ${body.callerData.userId}`,
        body.callerData.avatar ? `Avatar: ${body.callerData.avatar}` : null,
        `Initials: ${body.callerData.initials}`
      ].filter(Boolean).join(', ');
    }
    
    DebugLogger.addLog(
      "receiving call",
      "NOTICE",
      "handleSocketIncomingCall",
      `📞 ${callerName} is calling you for ${mediaType} call — Caller details: ${callerDetailsStr}`
    );

    // 25s TIMEOUT → ENDS FLOW FOR BOTH SIDES (callee side timer)
    CallHandler.clearCalleeRingTimer();
    console.log("[CallHandler] start ring timeout 2min (callee)");
    const currentCallIdForCallee = CallHandler._currentCallId; // Store call ID in closure
    CallHandler._calleeRingTimerId = setTimeout(() => {
      // Check if call ID still matches (call might have changed)
      if (CallHandler._currentCallId !== currentCallIdForCallee) {
        console.log("[CallHandler] Callee timeout: call ID changed, ignoring timeout");
        return;
      }
      
      console.log("[CallHandler] CALLEE ring timeout → terminate immediately");
      CallHandler.clearCalleeRingTimer();
      CallHandler._inCallOrConnecting = false;
      
      CallHandler.dipatchUI("callee:terminated", CallHandler.TERMINATION_REASONS.NO_ANSWER, {
        callerId: body.callerId,
        calleeId: body.calleeId,
      });
      
      DebugLogger.addLog(
        "terminated",
        "NOTICE",
        "handleSocketIncomingCall",
        "No answer (timeout)"
      );
    }, CallHandler._ringTimeoutMs);
  }

  static handleSocketAccepted(body) {
    DebugLogger.addLog("calling", "NOTICE", "handleSocketAccepted", "Call accepted by remote", body);
    console.log("[CallHandler] SOCKET call:accepted", body);
    
    // Cancel grace period timer if active (caller received accepted message during grace period)
    if (CallHandler._callerGraceTimerId !== null) {
      console.log("[CallHandler] ✅ Call accepted during grace period - canceling timeout termination");
      CallHandler.clearCallerGraceTimer();
    }
    
    // Prevent call:accepted if call has already ended (terminated, rejected, declined, etc)
    // Check both persistent flag and current state
    const isTerminated = CallHandler._isCallTerminated || (CallHandler._currentUIState && (
      CallHandler._currentUIState.includes('terminated') ||
      CallHandler._currentUIState.includes('rejected') ||
      CallHandler._currentUIState.includes('declined') ||
      CallHandler._currentUIState === 'ended'
    ));
    
    if (isTerminated) {
      console.log(`%c[CallHandler] 🚫 Ignoring call:accepted - call already terminated`, 'background: #dc3545; color: white; font-weight: bold; padding: 5px;', {
        isCallTerminated: CallHandler._isCallTerminated,
        currentState: CallHandler._currentUIState
      });
      DebugLogger.addLog("terminated", "NOTICE", "handleSocketAccepted", "Ignoring delayed call:accepted - call terminated", {
        isCallTerminated: CallHandler._isCallTerminated,
        state: CallHandler._currentUIState
      });
      return;
    }
    
    if (!body) {
      console.log("[CallHandler] accepted missing body");
      return;
    }
    if (body.callerId === undefined || body.callerId === "") {
      console.log("[CallHandler] accepted missing callerId");
      return;
    }
    if (body.calleeId === undefined || body.calleeId === "") {
      console.log("[CallHandler] accepted missing calleeId");
      return;
    }

    // Clear caller's ring timer since call is accepted
    CallHandler.clearCallerRingTimer();
    
    // Set current side to caller
    CallHandler._currentSide = "caller";
    
    // Guard: Only dispatch if not already in caller:callAccepted state
    if (CallHandler._currentUIState !== 'caller:callAccepted') {
      CallHandler.dipatchUI("caller:callAccepted", "none", {
        callerId: body.callerId,
        calleeId: body.calleeId,
        side: "caller",
      });
    } else {
      console.log("[CallHandler] Already in caller:callAccepted state, skipping duplicate dispatch");
    }
    
    // Reset chimeHandler alerts for new call
    if (typeof chimeHandler !== 'undefined') {
      chimeHandler._hasShownJoinedAlert = false;
      chimeHandler._hasShownConnectedAlert = false;
      chimeHandler._hasShownInCallAlert = false;
    }

    // 🔔 UI (caller) → accepted call, setting up (waiting for meeting)
    // Guard: Only dispatch if not already in caller:callAccepted state
    if (CallHandler._currentUIState !== 'caller:callAccepted') {
      CallHandler.dipatchUI("caller:callAccepted", "none", {
        callerId: body.callerId,
        calleeId: body.calleeId,
        side: "caller",
      });
    } else {
      console.log("[CallHandler] Already in caller:callAccepted state, skipping duplicate dispatch");
    }
    CallHandler._inCallOrConnecting = true; // NEW
    DebugLogger.addLog(
      "accepted call",
      "NOTICE",
      "handleSocketAccepted",
      "Call accepted"
    );
    DebugLogger.addLog(
      "setuping up",
      "NOTICE",
      "handleSocketAccepted",
      "Waiting for meetingID"
    );
  }

  static handleSocketDeclined(body) {
    DebugLogger.addLog("calling", "NOTICE", "handleSocketDeclined", "Call declined by remote", body);
    console.log("[CallHandler] SOCKET call:declined", body);
    if (!body) {
      console.log("[CallHandler] declined missing body");
      return;
    }
    if (body.callerId === undefined || body.callerId === "") {
      console.log("[CallHandler] declined missing callerId");
      return;
    }
    if (body.calleeId === undefined || body.calleeId === "") {
      console.log("[CallHandler] declined missing calleeId");
      return;
    }
    if (body.reason === undefined || body.reason === "") {
      console.log("[CallHandler] declined missing reason");
      return;
    }
    
    // Clear caller timer
    CallHandler.clearCallerRingTimer();
    
    DebugLogger.addLog(
      "declined",
      "NOTICE",
      "handleSocketDeclined",
      `Call declined - Reason: ${body.reason}`
    );
    console.log("[CallHandler] dispatch call:ended {reason:'declined'}");
    document.dispatchEvent(
      new CustomEvent(CallHandler.FLAGS.CALL_ENDED, {
        detail: {
          reason: "declined",
          callerId: body.callerId,
          calleeId: body.calleeId,
        },
      })
    );
    // 🔔 UI (caller) → declined
    CallHandler.dipatchUI("caller:declined", "none", {
      callerId: body.callerId,
      calleeId: body.calleeId,
      reason: body.reason,
    });
  }

  static handleSocketTimeout(body) {
    DebugLogger.addLog("terminated", "NOTICE", "handleSocketTimeout", "Call timed out", body);
    console.log("[CallHandler] SOCKET call:timeout", body);
    CallHandler.clearCallerRingTimer();
    CallHandler.clearCalleeRingTimer();
    CallHandler._inCallOrConnecting = false; // NEW

    // Clear all call-related state (database IDs, meeting info, etc.)
    CallHandler.clearAllCallState();

    DebugLogger.addLog(
      "terminated",
      "NOTICE",
      "handleSocketTimeout",
      "No answer (timeout)"
    );
    console.log("[CallHandler] dispatch call:ended {reason:'timeout'}");
    document.dispatchEvent(
      new CustomEvent(CallHandler.FLAGS.CALL_ENDED, {
        detail: {
          reason: "timeout",
          callerId: body ? body.callerId : undefined,
          calleeId: body ? body.calleeId : undefined,
        },
      })
    );
    // 🔔 UI (caller) → timeout
    CallHandler.dipatchUI("caller:terminated", CallHandler.TERMINATION_REASONS.NO_ANSWER, {
      callerId: body ? body.callerId : undefined,
      calleeId: body ? body.calleeId : undefined,
    });
  }

  static handleSocketCancelled(body) {
    DebugLogger.addLog("terminated", "NOTICE", "handleSocketCancelled", "Call cancelled by remote", body);
    console.log("[CallHandler] SOCKET call:cancelled", body);
    CallHandler.clearCallerRingTimer();
    CallHandler.clearCalleeRingTimer();
    CallHandler._inCallOrConnecting = false;
    
    // DIRECT CHECK: Determine receiver's role from current UI state
    const isReceiverCaller = CallHandler._currentUIState && CallHandler._currentUIState.startsWith('caller:');
    const isReceiverCallee = CallHandler._currentUIState && CallHandler._currentUIState.startsWith('callee:');
    
    // Get reason from socket message
    const reason = body && body.reason ? body.reason : null;
    
    let substate = 'cancelled';
    let terminatedState = 'callee:terminated';
    
    if (isReceiverCaller) {
      // Caller received cancellation from callee
      terminatedState = 'caller:terminated';
      if (reason === 'declined') {
        // Callee declined before accepting
        substate = 'declined';
      } else if (reason === 'ended') {
        // Callee ended after accepting
        substate = 'cancelled';
      } else {
        // Fallback: check caller's state
        const isCallWaiting = CallHandler._currentUIState === 'caller:callWaiting';
        substate = isCallWaiting ? 'declined' : 'cancelled';
      }
      console.log("[CallHandler] Caller received cancellation from callee", { reason, substate, callerState: CallHandler._currentUIState });
    } else if (isReceiverCallee) {
      // Callee received cancellation from caller
      terminatedState = 'callee:terminated';
      if (reason === 'cancelled') {
        // Caller cancelled before callee answered
        substate = 'cancelled';
      } else if (reason === 'ended') {
        // Caller ended after callee answered
        substate = 'cancelled';
      } else {
        // Fallback: check callee's state
        const isIncomingCall = CallHandler._currentUIState === 'callee:incomingVideoCall' || 
                              CallHandler._currentUIState === 'callee:incomingAudioCall';
        substate = isIncomingCall ? 'cancelled' : 'cancelled';
      }
      console.log("[CallHandler] Callee received cancellation from caller", { reason, substate, calleeState: CallHandler._currentUIState });
    } else {
      // No state detected - use default
      console.warn("[CallHandler] Could not determine receiver role from state", { currentState: CallHandler._currentUIState });
      substate = 'cancelled';
    }
    
    // Clear all call-related state
    CallHandler.clearAllCallState();
    
    // Reset Vue call settings (including cam/mic)
    if (window.vueApp && typeof window.vueApp.resetCallSettings === 'function') {
      window.vueApp.resetCallSettings();
    }
    
    DebugLogger.addLog(
      "terminated",
      "NOTICE",
      "handleSocketCancelled",
      `Call cancelled - receiver: ${isReceiverCaller ? 'caller' : isReceiverCallee ? 'callee' : 'unknown'}, substate: ${substate}`
    );
    document.dispatchEvent(
      new CustomEvent(CallHandler.FLAGS.CALL_ENDED, {
        detail: {
          reason: "hangup",
          callerId: body ? body.callerId : undefined,
          calleeId: body ? body.calleeId : undefined,
        },
      })
    );
    CallHandler.dipatchUI(terminatedState, substate, {
      callerId: body ? body.callerId : undefined,
      calleeId: body ? body.calleeId : undefined,
    });
  }

  static handleSocketSelfStopRinging(body) {
    DebugLogger.addLog("receiving call", "NOTICE", "handleSocketSelfStopRinging", "Stopping ringing on all devices", body);
    console.log("[CallHandler] SOCKET call:self:stopRinging", body);
    CallHandler.clearCallerRingTimer();
    CallHandler.clearCalleeRingTimer();
    console.log("[CallHandler] ring timers cleared due to self-stop");
  }

  static handleSocketMeetingReady(body) {
    DebugLogger.addLog("setuping up", "NOTICE", "handleSocketMeetingReady", "Meeting is ready", body);
    console.log("[CallHandler] SOCKET meeting:ready", body);
    if (!body) {
      console.log("[CallHandler] meeting:ready missing body");
      return;
    }
    if (body.meetingId === undefined || body.meetingId === "") {
      console.log("[CallHandler] meeting:ready missing meetingId");
      return;
    }
    if (body.callerId === undefined || body.callerId === "") {
      console.log("[CallHandler] meeting:ready missing callerId");
      return;
    }
    if (body.calleeId === undefined || body.calleeId === "") {
      console.log("[CallHandler] meeting:ready missing calleeId");
      return;
    }
    if (body.callerRole === undefined || body.callerRole === "") {
      console.log("[CallHandler] meeting:ready missing callerRole");
      return;
    }
    if (body.calleeRole === undefined || body.calleeRole === "") {
      console.log("[CallHandler] meeting:ready missing calleeRole");
      return;
    }

    // Construct a join link (placeholder) and dispatch to UI before joining
    const joinUrl = `https://example.com/join/${encodeURIComponent(
      body.meetingId
    )}?user=${encodeURIComponent(body.callerId)}&role=${encodeURIComponent(
      body.callerRole
    )}`;
    // Guard: Only dispatch if not already in caller:callAccepted state
    if (CallHandler._currentUIState !== 'caller:callAccepted') {
      CallHandler.dipatchUI("caller:callAccepted", "none", {
        side: "caller",
        meetingId: body.meetingId,
        joinUrl,
        callerId: body.callerId,
        calleeId: body.calleeId,
        callerRole: body.callerRole,
        calleeRole: body.calleeRole,
      });
    } else {
      console.log("[CallHandler] Already in caller:callAccepted state, skipping duplicate dispatch");
    }

    // The CALLER joins with callerRole from payload
    DebugLogger.addLog(
      "setuping up",
      "NOTICE",
      "handleSocketMeetingReady",
      "Caller: Meeting ready from callee!"
    );
    DebugLogger.addLog(
      "setuping up",
      "NOTICE",
      "handleSocketMeetingReady",
      `Received: DB ID = ${body.dbMeetingId || body.meetingId}, Chime ID = ${
        body.chimeMeetingId
      }`
    );
    
    // Orchestrate cam/mic permissions for caller based on call type
    console.log('[CallHandler] [Caller] [FIX v1.1] Call accepted - checking cam/mic permissions');
    
    const mediaType = window.mockCallData?.mediaType || 'video';
    const isVideoCall = mediaType === 'video';
    console.log('[CallHandler] [Caller] [FIX v1.1] Media type:', mediaType, 'isVideoCall:', isVideoCall);
    
    // Listen for when permissions are actually needed (ONLY fires if not granted)
    const onShowWaiting = (ev) => {
      console.log('[CallHandler] [Caller] [FIX v1.1] ⏳ CamMic:UI:ShowWaiting received - showing waiting UI NOW');
      console.log('[CallHandler] [Caller] [FIX v1.1] Event detail:', ev.detail);
      CallHandler.dipatchUI("caller:waitingForCamMicPermissions", "none", {
        callerId: body.callerId,
        calleeId: body.calleeId,
        callerRole: body.callerRole,
        calleeRole: body.calleeRole,
      });
      console.log('[CallHandler] [Caller] [FIX v1.1] ✅ UI transitioned to caller:waitingForCamMicPermissions');
    };
    
    // Listen for permissions resolved (returns to callAccepted if we showed waiting)
    const onPermissionsResolved = (ev) => {
      const detail = ev.detail || {};
      console.log('[CallHandler] [Caller] [FIX v1.1] 📺 CamMic:UI:PermissionsResolved received:', detail);
      
      // If we were in waiting state, return to callAccepted
      if (CallHandler._currentUIState === 'caller:waitingForCamMicPermissions') {
        console.log('[CallHandler] [Caller] [FIX v1.1] 📺 Current state is waitingForCamMicPermissions - returning to callAccepted');
        // Guard: Only dispatch if not already in caller:callAccepted state
        if (CallHandler._currentUIState !== 'caller:callAccepted') {
          CallHandler.dipatchUI("caller:callAccepted", "none", {
            callerId: body.callerId,
            calleeId: body.calleeId,
            callerRole: body.callerRole,
            calleeRole: body.calleeRole,
          });
          console.log('[CallHandler] [Caller] [FIX v1.1] ✅ UI transitioned back to caller:callAccepted');
        } else {
          console.log('[CallHandler] [Caller] [FIX v1.1] ⏭️ Already in caller:callAccepted state, skipping duplicate dispatch');
        }
      } else {
        console.log('[CallHandler] [Caller] [FIX v1.1] ⏭️ Current state is NOT waitingForCamMicPermissions, skipping UI change. Current state:', CallHandler._currentUIState);
      }
    };
    
    if (isVideoCall) {
      // Video call: orchestrate both with no preview
      console.log('[CallHandler] [Caller] [FIX v1.1] Video call - orchestrating both (no preview)');
      
      const onCallerComplete = (ev) => {
        console.log('[CallHandler] [Caller] [FIX v1.1] 🔔 CamMic:Orchestrate:Complete received');
        window.removeEventListener('CamMic:Orchestrate:Complete', onCallerComplete);
        window.removeEventListener('CamMic:UI:ShowWaiting', onShowWaiting);
        window.removeEventListener('CamMic:UI:PermissionsResolved', onPermissionsResolved);
        console.log('[CallHandler] [Caller] [FIX v1.1] 🧹 Removed all event listeners');
        
        const detail = ev.detail || {};
        console.log('[CallHandler] [Caller] [FIX v1.1] CamMic orchestration complete:', detail);
        
        // Check permission states
        const camera = detail.permissions?.camera || 'unknown';
        const microphone = detail.permissions?.microphone || 'unknown';
        
        console.log('[CallHandler] [Caller] [FIX v1.1] Permission states:', { camera, microphone });
        console.log('[CallHandler] [Caller] [FIX v1.1] Current UI state:', CallHandler._currentUIState);
        
        // If permissions denied, show error and stay waiting
        if (camera === 'denied' || microphone === 'denied') {
          console.log('[CallHandler] [Caller] [FIX v1.1] ❌ Permissions denied - keeping waiting UI');
          alert('❌ Camera/Microphone access denied. Please enable permissions in browser settings and try again.');
          // Stay in permission waiting state (UI already showing)
          return;
        }
        
        // If permissions granted, proceed
        if (camera === 'granted' && microphone === 'granted') {
          console.log('[CallHandler] [Caller] [FIX v1.1] ✅ Both permissions granted');
          console.log('[CallHandler] [Caller] [FIX v1.1] Current UI state before proceedToJoin:', CallHandler._currentUIState);
          
          // If we never showed waiting UI, we're still in callAccepted - that's correct!
          if (CallHandler._currentUIState === 'caller:waitingForCamMicPermissions') {
            console.log('[CallHandler] [Caller] [FIX v1.1] ⚠️ Still in waitingForCamMicPermissions - onPermissionsResolved should have handled this');
          } else {
            console.log('[CallHandler] [Caller] [FIX v1.1] ✅ Still in callAccepted (never showed waiting UI) - correct behavior!');
          }
          
          // Continue with join flow (stays in callAccepted if we never showed waiting)
          proceedToJoin();
          return;
        }
        
        // Unknown state - show warning but proceed
        console.warn('[CallHandler] [Caller] [FIX v1.1] ⚠️ Unknown permission state - proceeding anyway');
        alert('⚠️ Unable to verify camera/microphone permissions. Call may not work properly.');
        proceedToJoin();
      };
      
      // Listen for UI events (NEW system - same as callee)
      console.log('[CallHandler] [Caller] [FIX v1.1] 📡 Registering listeners: CamMic:UI:ShowWaiting, CamMic:UI:PermissionsResolved, CamMic:Orchestrate:Complete');
      window.addEventListener('CamMic:UI:ShowWaiting', onShowWaiting);
      window.addEventListener('CamMic:UI:PermissionsResolved', onPermissionsResolved);
      
      // Listen for orchestration completion
      window.addEventListener('CamMic:Orchestrate:Complete', onCallerComplete);
      console.log('[CallHandler] [Caller] [FIX v1.1] ✅ All listeners registered');
      
      // Start orchestration
      console.log('[CallHandler] [Caller] [FIX v1.1] 🚀 Dispatching CamMic:Orchestrate:Both:NoPreview');
      window.dispatchEvent(new CustomEvent('CamMic:Orchestrate:Both:NoPreview'));
      console.log('[CallHandler] [Caller] [FIX v1.1] ✅ Orchestration started - waiting for events...');
      
    } else {
      // Audio call: orchestrate microphone only
      console.log('[CallHandler] [Caller] [FIX v1.1] Audio call - orchestrating microphone only');
      
      const onCallerComplete = (ev) => {
        console.log('[CallHandler] [Caller] [FIX v1.1] 🔔 CamMic:Orchestrate:Complete received (audio)');
        window.removeEventListener('CamMic:Orchestrate:Complete', onCallerComplete);
        window.removeEventListener('CamMic:UI:ShowWaiting', onShowWaiting);
        window.removeEventListener('CamMic:UI:PermissionsResolved', onPermissionsResolved);
        console.log('[CallHandler] [Caller] [FIX v1.1] 🧹 Removed all event listeners (audio)');
        
        const detail = ev.detail || {};
        console.log('[CallHandler] [Caller] [FIX v1.1] Mic orchestration complete:', detail);
        
        // Check permission states
        const microphone = detail.permissions?.microphone || 'unknown';
        
        console.log('[CallHandler] [Caller] [FIX v1.1] Microphone permission state:', microphone);
        console.log('[CallHandler] [Caller] [FIX v1.1] Current UI state:', CallHandler._currentUIState);
        
        // If permission denied, show error and stay waiting
        if (microphone === 'denied') {
          console.log('[CallHandler] [Caller] [FIX v1.1] ❌ Microphone denied - keeping waiting UI');
          alert('❌ Microphone access denied. Please enable permissions in browser settings and try again.');
          // Stay in permission waiting state (UI already showing)
          return;
        }
        
        // If permission granted, proceed
        if (microphone === 'granted') {
          console.log('[CallHandler] [Caller] [FIX v1.1] ✅ Microphone permission granted');
          console.log('[CallHandler] [Caller] [FIX v1.1] Current UI state before proceedToJoin:', CallHandler._currentUIState);
          
          // If we never showed waiting UI, we're still in callAccepted - that's correct!
          if (CallHandler._currentUIState === 'caller:waitingForCamMicPermissions') {
            console.log('[CallHandler] [Caller] [FIX v1.1] ⚠️ Still in waitingForCamMicPermissions - onPermissionsResolved should have handled this');
          } else {
            console.log('[CallHandler] [Caller] [FIX v1.1] ✅ Still in callAccepted (never showed waiting UI) - correct behavior!');
          }
          
          // Continue with join flow (stays in callAccepted if we never showed waiting)
          proceedToJoin();
          return;
        }
        
        // Unknown state - show warning but proceed
        console.warn('[CallHandler] [Caller] [FIX v1.1] ⚠️ Unknown microphone permission state - proceeding anyway');
        alert('⚠️ Unable to verify microphone permissions. Call may not work properly.');
        proceedToJoin();
      };
      
      // Listen for UI events (NEW system - same as callee)
      console.log('[CallHandler] [Caller] [FIX v1.1] 📡 Registering listeners (audio): CamMic:UI:ShowWaiting, CamMic:UI:PermissionsResolved, CamMic:Orchestrate:Complete');
      window.addEventListener('CamMic:UI:ShowWaiting', onShowWaiting);
      window.addEventListener('CamMic:UI:PermissionsResolved', onPermissionsResolved);
      
      // Listen for orchestration completion
      window.addEventListener('CamMic:Orchestrate:Complete', onCallerComplete);
      console.log('[CallHandler] [Caller] [FIX v1.1] ✅ All listeners registered (audio)');
      
      // Start orchestration
      console.log('[CallHandler] [Caller] [FIX v1.1] 🚀 Dispatching CamMic:Orchestrate:Microphone');
      window.dispatchEvent(new CustomEvent('CamMic:Orchestrate:Microphone'));
      console.log('[CallHandler] [Caller] [FIX v1.1] ✅ Orchestration started (audio) - waiting for events...');
    }
    
    // Return early - join will happen in proceedToJoin()
    console.log('[CallHandler] [Caller] [FIX v1.1] ⏸️ Returning early - join will happen in proceedToJoin()');
    return;
    
    // Helper function to proceed with join after CamMic orchestration
    function proceedToJoin() {
      console.log('[CallHandler] [Caller] Proceeding with join after CamMic orchestration');
    
    console.log(
      "[CallHandler] caller joinChimeMeeting with role",
      body.callerRole
    );
    CallHandler.joinChimeMeeting(
      body.meetingId,
      body.callerId,
      body.callerRole,
      body.chimeMeetingId,
      CallHandler._invite.callType
    )
      .then((joinData) => {
        console.log("[CallHandler] caller join ok", joinData);
        // 🔔 UI (caller) → connected and joining - will transition to caller:connectedJoined when media starts
        // Note: Don't dispatch here, tile-updated will detect when joined
      })
      .catch((err) => {
        console.error("[CallHandler] caller join failed", err);
        CallHandler.dipatchUI("caller:terminated", "error", {
          message: "caller join failed",
          meetingId: body.meetingId,
        });
        DebugLogger.addLog(
          "terminated",
          "CRITICAL",
          "handleSocketMeetingReady",
          "Problems joining meeting to caller"
        );
        document.dispatchEvent(
          new CustomEvent(CallHandler.FLAGS.MEETING_PROBLEM, {
            detail: {
              meetingId: body.meetingId,
              callerId: body.callerId,
              calleeId: body.calleeId,
              message: "join failed",
            },
          })
        );
      });
    } // End of proceedToJoin function
  }

  static handleSocketMeetingProblem(body) {
    DebugLogger.addLog("terminated", "CRITICAL", "handleSocketMeetingProblem", "Meeting problem from remote", body);
    console.log("[CallHandler] SOCKET meeting:problem", body);
    CallHandler._inCallOrConnecting = false; // Reset so user can try again
    CallHandler.dipatchUI("caller:terminated", "error", {
      message: body && body.message ? body.message : "meeting problem",
    });
    DebugLogger.addLog(
      "terminated",
      "CRITICAL",
      "handleSocketMeetingProblem",
      `Meeting Problem: ${body && body.message ? body.message : "Unknown error"}`
    );
  }

  static handleSocketMeetingStatus(body) {
    DebugLogger.addLog("setuping up", "NOTICE", "handleSocketMeetingStatus", "Meeting status update from remote", body);
    console.log("[CallHandler] SOCKET meeting:status", body);
    if (!body || !body.message) return;
    
    // Show alert to caller about callee's progress
    DebugLogger.addLog(
      "setuping up",
      "NOTICE",
      "handleSocketMeetingStatus",
      `Callee: ${body.message}`
    );
    
    // Update UI status if available
    if (window.chimeHandler && window.chimeHandler._updateStatus) {
      window.chimeHandler._updateStatus(body.message);
    }
  }

  /* ===========================
   * MEETING OPS
   * ========================= */

  static async getMeetingID(userId, role) {
    DebugLogger.addLog("setuping up", "NOTICE", "getMeetingID", "Creating meeting in database", { userId, role });
    console.log("[CallHandler] getMeetingID", { userId, role });
    try {
      const eventId = `event_${Date.now()}`;
      console.log("[CallHandler] Creating Scylla meeting", {
        eventId,
        initiatorId: userId,
      });
      const response = await fetch(
        `${CallHandler._scyllaDatabaseEndpoint}createInstantMeeting`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId,
            initiatorId: userId,
          }),
          mode: "cors",
          redirect: "follow",
        }
      );
      if (!response.ok) {
        const bodyText = await response.text().catch(() => "");
        throw new Error(
          `CreateInstantMeeting failed: ${response.status} ${response.statusText}${
            bodyText ? " | " + bodyText : ""
          }`
        );
      }
      const data = await response.json();
      if (data.success && data.data) {
        console.log("[CallHandler] Scylla meeting created successfully", data);
        DebugLogger.addLog(
          "setuping up",
          "NOTICE",
          "getMeetingID",
          `✅ DB meeting created: ${data.data}`
        );
        return data.data;
      } else {
        throw new Error(
          `Failed to create Scylla meeting: ${data.error || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("[CallHandler] Error creating Scylla meeting:", error);
      DebugLogger.addLog(
        "terminated",
        "CRITICAL",
        "getMeetingID",
        `DB Error: ${error.message}`
      );
      throw error;
    }
  }

  static async createChimeMeeting(meetingId, userId, role) {
    DebugLogger.addLog("setuping up", "NOTICE", "createChimeMeeting", "Creating Chime meeting", { meetingId, userId, role });
    console.log("[CallHandler] createChimeMeeting", {
      meetingId,
      userId,
      role,
    });
    try {
      console.log("[CallHandler] Creating Chime meeting", {
        externalMeetingId: meetingId,
      });
      const response = await fetch(CallHandler._chimeMeetingEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createMeeting",
          externalMeetingId: meetingId,
        }),
        mode: "cors",
      });
      const data = await response.json();
      if (data.meetingId && data.meeting) {
        console.log("[CallHandler] Chime meeting created successfully", data);
        console.log("[CallHandler] Full Meeting object:", data.meeting);
        DebugLogger.addLog(
          "setuping up",
          "NOTICE",
          "createChimeMeeting",
          `✅ Chime meeting created: ${data.meetingId}`
        );
        // Return BOTH meetingId AND full meeting object
        return {
          chimeMeetingId: data.meetingId,
          fullMeeting: data.meeting,
        };
      } else {
        throw new Error(
          `Failed to create Chime meeting: ${data.error || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("[CallHandler] Error creating Chime meeting:", error);
      DebugLogger.addLog(
        "terminated",
        "CRITICAL",
        "createChimeMeeting",
        `Chime Error: ${error.message}`
      );
      throw error;
    }
  }

  static async joinChimeMeeting(meetingId, userId, role, chimeMeetingId, callType, fullMeeting = null) {
    DebugLogger.addLog("connecting", "NOTICE", "joinChimeMeeting", "Joining Chime meeting", { meetingId, userId, role });
    console.log("[CallHandler] joinChimeMeeting", {
      meetingId,
      userId,
      role,
      chimeMeetingId,
      callType,
      hasFullMeeting: !!fullMeeting,
    });

    try {
      const mediaType = callType || "video";
      
      // STEP 1: Call addAttendee to get attendee credentials AND meeting data
      console.log("[CallHandler] Calling addAttendee API", {
        chimeMeetingId,
        userId,
        role,
      });
      
      const response = await fetch(CallHandler._chimeMeetingEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addAttendee",
          meetingId: chimeMeetingId,
          externalUserId: userId,
          role: role,
        }),
        mode: "cors",
      });
      
      if (!response.ok) {
        throw new Error(`addAttendee failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("[CallHandler] 🔍 RAW addAttendee response:", JSON.stringify(data, null, 2));
      
      if (!data.success || !data.attendeeId) {
        throw new Error(`addAttendee failed: ${data.error || "missing attendeeId"}`);
      }
      
      // STEP 2: Extract Meeting and Attendee from response
      let meeting;
      let attendee;
      let currentMeetingId = chimeMeetingId; // Use chimeMeetingId consistently
      
      // Decode base64 meetingInfo FIRST (most common format from API)
      if (data.meetingInfo) {
        try {
          const decoded = atob(data.meetingInfo);
          const meetingInfoDecoded = JSON.parse(decoded);
          console.log("[CallHandler] 🔍 Decoded meetingInfo:", JSON.stringify(meetingInfoDecoded, null, 2));
          
          // Check if decoded info has MediaPlacement
          if (meetingInfoDecoded.MediaPlacement && meetingInfoDecoded.MediaPlacement.AudioHostUrl) {
            console.log("[CallHandler] ✅ Found MediaPlacement in decoded meetingInfo");
            meeting = {
              MeetingId: meetingInfoDecoded.MeetingId || currentMeetingId,
              MediaPlacement: meetingInfoDecoded.MediaPlacement,
              MediaRegion: meetingInfoDecoded.MediaRegion || "ap-northeast-1",
              ExternalMeetingId: meetingInfoDecoded.ExternalMeetingId || currentMeetingId,
            };
          }
          
          // Extract attendee from decoded info
          if (meetingInfoDecoded.Attendee) {
            console.log("[CallHandler] ✅ Found Attendee in decoded meetingInfo");
            attendee = meetingInfoDecoded.Attendee;
          }
        } catch (err) {
          console.error("[CallHandler] Failed to decode meetingInfo:", err);
        }
      }
      
      // Fallback: Check if response has top-level MediaPlacement (alternative API format)
      if (!meeting && data.MediaPlacement && data.MediaPlacement.AudioHostUrl) {
        console.log("[CallHandler] ✅ Found MediaPlacement at top level of response");
        meeting = {
          MeetingId: currentMeetingId,
          MediaPlacement: data.MediaPlacement,
          MediaRegion: data.MediaRegion || "ap-northeast-1",
          ExternalMeetingId: currentMeetingId,
        };
      }
      
      // Fallback: Check if response has separate 'meeting' field
      if (!meeting && data.meeting && data.meeting.MediaPlacement) {
        console.log("[CallHandler] ✅ Found 'meeting' field in response with MediaPlacement");
        meeting = data.meeting;
      }
      
      // Fallback if meeting still not found but we have fullMeeting from callee
      if (!meeting && fullMeeting) {
        console.log("[CallHandler] ⚠️ Using fullMeeting fallback (callee-side)");
        meeting = fullMeeting;
      }
      
      // Validate we have Meeting with MediaPlacement
      if (!meeting || !meeting.MediaPlacement) {
        console.error("[CallHandler] ❌ CRITICAL: No Meeting with MediaPlacement found!");
        console.error("[CallHandler] Available in response:", Object.keys(data));
        console.error("[CallHandler] Meeting object:", meeting);
        throw new Error("addAttendee response missing Meeting with MediaPlacement");
      }
      
      // Fallback attendee if not extracted
      if (!attendee) {
        console.log("[CallHandler] Using fallback attendee construction");
        attendee = {
          AttendeeId: data.attendeeId,
          ExternalUserId: userId,
        };
      }
      
      console.log("[CallHandler] ✅ Final meeting object:", JSON.stringify(meeting, null, 2));
      console.log("[CallHandler] ✅ Final attendee object:", JSON.stringify(attendee, null, 2));
      
      DebugLogger.addLog(
        "connecting",
        "NOTICE",
        "joinChimeMeeting",
        `✅ Added to meeting as ${role}`
      );

      // Update status before joining
      if (window.chimeHandler && window.chimeHandler._updateStatus) {
        window.chimeHandler._updateStatus(`Joining as ${role}... (Meeting: ${meeting.MeetingId})`);
      }
      
      // Dispatch to chimeHandler with FULL meeting/attendee objects
    const joinEvent = new CustomEvent("chime:join:meeting", {
      detail: {
          meetingInfo: { Meeting: meeting },
          attendeeInfo: { Attendee: attendee },
        userId: userId,
        role: role,
          callType: mediaType,
      },
    });
    document.dispatchEvent(joinEvent);
      console.log("[CallHandler] Dispatched chime:join:meeting with full credentials", {
        meeting,
        attendee,
      });

      return true;
    } catch (error) {
      console.error("[CallHandler] joinChimeMeeting error", error);
      DebugLogger.addLog(
        "terminated",
        "CRITICAL",
        "joinChimeMeeting",
        `Join Error: ${error.message}`
      );
      throw error;
    }
  }

  static clearCalleeRingTimer() {
    if (CallHandler._calleeRingTimerId !== null) {
      console.log(
        "[CallHandler] clearing callee ring timer",
        CallHandler._calleeRingTimerId
      );
      clearTimeout(CallHandler._calleeRingTimerId);
      CallHandler._calleeRingTimerId = null;
    } else {
      console.log("[CallHandler] no callee ring timer to clear");
    }
  }

  static clearCallerRingTimer() {
    if (CallHandler._callerRingTimerId !== null) {
      console.log(
        "[CallHandler] clearing caller ring timer",
        CallHandler._callerRingTimerId
      );
      clearTimeout(CallHandler._callerRingTimerId);
      CallHandler._callerRingTimerId = null;
    } else {
      console.log("[CallHandler] no caller ring timer to clear");
    }
  }

  static clearCallerGraceTimer() {
    if (CallHandler._callerGraceTimerId !== null) {
      console.log(
        "[CallHandler] clearing caller grace period timer",
        CallHandler._callerGraceTimerId
      );
      clearTimeout(CallHandler._callerGraceTimerId);
      CallHandler._callerGraceTimerId = null;
    } else {
      console.log("[CallHandler] no caller grace period timer to clear");
    }
  }

  // ----------------------------------------------------------
  // Handle manual callee join button click
  // ----------------------------------------------------------
  static handleManualCalleeJoin() {
    console.log("[CallHandler] handleManualCalleeJoin called", CallHandler._pendingCalleeJoin);
    
    if (!CallHandler._pendingCalleeJoin) {
      console.log("[CallHandler] No pending callee join info");
      return;
    }
    
    // VALIDATE CALL ID - prevent joining old meetings
    const { callId, meetingId, calleeId, calleeRole, chimeId, callType, fullMeeting } = CallHandler._pendingCalleeJoin;
    
    if (callId !== CallHandler._currentCallId) {
      console.error("[CallHandler] Call ID mismatch - cannot join old meeting", {
        pendingCallId: callId,
        currentCallId: CallHandler._currentCallId
      });
      DebugLogger.addLog("connecting", "CRITICAL", "handleManualCalleeJoin", "Call ID mismatch - rejecting join attempt", {
        pendingCallId: callId,
        currentCallId: CallHandler._currentCallId
      });
      CallHandler._pendingCalleeJoin = null;
      return;
    }
    
    console.log("[CallHandler] Call ID validated - proceeding with join", { callId });
    
    // Clear pending join info
    CallHandler._pendingCalleeJoin = null;
    
    // Now join the meeting
    CallHandler.joinChimeMeeting(
      meetingId,
      calleeId,
      calleeRole,
      chimeId,
      callType,
      fullMeeting
    ).then(() => {
      console.log("[CallHandler] dispatch MEETING_CONNECT (callee manual join)");
      document.dispatchEvent(
        new CustomEvent(CallHandler.FLAGS.MEETING_CONNECT, {
          detail: {
            meetingId,
            userId: calleeId,
            role: calleeRole,
            chimeMeetingId: chimeId,
          },
        })
      );
    }).catch((err) => {
      console.error("[CallHandler] Manual callee join error", err);
      CallHandler._inCallOrConnecting = false;
      CallHandler.dipatchUI("callee:terminated", "error", {
        message: err && err.message ? err.message : "Unknown error",
      });
      DebugLogger.addLog(
        "terminated",
        "CRITICAL",
        "handleManualCalleeJoin",
        `Join Error: ${err && err.message ? err.message : "Unknown error"}`
      );
    });
  }

  // ----------------------------------------------------------
  // Step: Check Cam/Mic before connecting
  // NOTE: CamMic permissions are now handled by the new CamMicPermissionsUtility
  // via orchestration events (CamMic:Orchestrate:Both, CamMic:Orchestrate:Microphone)
  // This function is kept for compatibility but simplified
  // ----------------------------------------------------------
  static async ensureCamMicReady(callMode = "video") {
    console.log("[CallHandler] ensureCamMicReady - delegating to new CamMic system", { callMode });
    
    // Set window.callMode for compatibility
    const requiresCamera = callMode !== "audio";
    window.callMode = requiresCamera ? "videoCall" : "audioOnlyCall";
    
    // New CamMic system handles permissions via orchestration events
    // Just resolve immediately - orchestration happens in accept/join flows
    return Promise.resolve(true);
  }

  /* ====================================================================
   * User Data Schema Validation
   * ==================================================================== */
  
  static validateUserData(userData, label) {
    const required = ['userId', 'username', 'displayName', 'initials', 'isCreator', 'isFan'];
    const missing = required.filter(field => !userData || userData[field] === undefined);
    
    if (missing.length > 0) {
      const error = `${label} missing required fields: ${missing.join(', ')}`;
      DebugLogger.addLog("ready", "CRITICAL", "validateUserData", error);
      alert(`❌ Call cannot start: ${error}`);
      
      // End call due to schema error
      this.dipatchUI("ended", "schema-error", { 
        reason: error,
        missingFields: missing 
      });
      
      if (window.chimeHandler) {
        chimeHandler.handleDisconnect();
      }
      
      return false;
    }
    
    // Validate that isCreator and isFan are opposites
    if (userData.isCreator === userData.isFan) {
      const error = `${label} invalid: isCreator and isFan must be opposites (one true, one false)`;
      DebugLogger.addLog("ready", "CRITICAL", "validateUserData", error);
      alert(`❌ Call cannot start: ${error}`);
      return false;
    }
    
    console.log(`[CallHandler] ✅ ${label} validated - ${userData.isCreator ? 'Creator' : 'Fan'}`);
    return true;
  }

  /* ====================================================================
   * Grace Period Handlers
   * ==================================================================== */
  
  static handleGracePeriodStart() {
    if (!window.mockCallData) {
      console.error('[CallHandler] mockCallData not initialized');
      return;
    }
    
    window.mockCallData.isInGrace = true;
    
    DebugLogger.addLog("connected", "NOTICE", "handleGracePeriodStart", 
      "Grace period started - disabling audio/video for ALL USERS in one-on-one call");
    
    alert("⏳ Grace period started! Video and audio disabled for ALL USERS, chat remains available.");
    
    // Broadcast grace period start to ALL participants via socket (CRITICAL: One-on-one = both users affected)
    const meetingId = window.mockCallData.callType || 'current-meeting';
    SocketHandler.sendSocketMessage({
      flag: 'grace:start',
      payload: {
        meetingId: meetingId,
        broadcast: true,
        message: 'Grace period started - all participants media disabled'
      }
    });
    
    // Dispatch grace start event locally
    this.dipatchUI("connected", "grace", { 
      graceActive: true,
      message: "Grace period active for all participants" 
    });
    
    // Force disable audio/video locally (initiator)
    if (window.chimeHandler && typeof chimeHandler.forceControlsOff === 'function') {
      chimeHandler.forceControlsOff();
    }
    
    console.log('[CallHandler] ⏸️ Grace period broadcast sent - ALL participants will be affected (media disabled)');
  }

  static handleGracePeriodResume() {
    if (!window.mockCallData) {
      console.error('[CallHandler] mockCallData not initialized');
      return;
    }
    
    window.mockCallData.isInGrace = false;
    
    DebugLogger.addLog("connected", "NOTICE", "handleGracePeriodResume",
      "Resuming from grace period - re-enabling media for ALL USERS in one-on-one call");
    
    // Broadcast grace period resume to ALL participants via socket (CRITICAL: One-on-one = both users affected)
    const meetingId = window.mockCallData.callType || 'current-meeting';
    SocketHandler.sendSocketMessage({
      flag: 'grace:resume',
      payload: {
        meetingId: meetingId,
        broadcast: true,
        message: 'Grace period resumed - all participants media restored'
      }
    });
    
    // Dispatch resume event locally
    this.dipatchUI("connected", "active", {
      graceActive: false,
      message: "Call resumed for all participants"
    });
    
    // Re-enable audio locally (initiator)
    if (window.chimeHandler && typeof chimeHandler.forceControlsOn === 'function') {
      chimeHandler.forceControlsOn();
    }
    
    // Dispatch timer restart event (applies to all)
    window.dispatchEvent(new CustomEvent("call-timer:restart"));
    
    // Show alert AFTER restoring feeds
    alert("✅ Resumed from grace period! ALL USERS feeds restored and timer restarted.");
    
    console.log('[CallHandler] ▶️ Grace period resume broadcast sent - ALL participants will be affected (media restored)');
  }

  static handleGracePeriodEndFail() {
    if (!window.mockCallData) {
      console.error('[CallHandler] mockCallData not initialized');
      return;
    }
    
    window.mockCallData.isInGrace = false;
    
    DebugLogger.addLog("connected", "CRITICAL", "handleGracePeriodEndFail",
      "Grace period ended - call terminated for ALL users with reason: grace-end");
    
    // Broadcast grace period end to ALL participants via socket (CRITICAL: One-on-one = both users disconnected)
    const meetingId = window.mockCallData.callType || 'current-meeting';
    SocketHandler.sendSocketMessage({
      flag: 'grace:end',
      payload: {
        meetingId: meetingId,
        broadcast: true,
        reason: 'grace-end',
        message: 'Call ended for all participants due to grace period failure'
      }
    });
    
    // Show alert first
    alert("❌ Call ended for ALL USERS - Reason: grace-end");
    
    // End call with reason
    this.dipatchUI("ended", "grace-end", {
      reason: "grace-end",
      message: "Call terminated due to grace period failure"
    });
    
    // Trigger call end/disconnect (local user)
    if (window.chimeHandler && typeof chimeHandler.handleDisconnect === 'function') {
      chimeHandler.handleDisconnect();
    }
    
    console.log('[CallHandler] Grace end broadcast sent - all participants will be disconnected with reason: grace-end');
  }

  /* ====================================================================
   * Socket Handlers for Grace Period (received from other users)
   * ==================================================================== */
  
  static handleSocketGraceStart(data) {
    console.log('[CallHandler] [Socket] ⏸️ Received grace:start - APPLYING TO THIS USER', data);
    
    if (!window.mockCallData) return;
    window.mockCallData.isInGrace = true;
    
    alert("⏳ Grace period started! Video and audio disabled for ALL USERS (including you).");
    
    // Force disable audio/video locally (CRITICAL: This user also affected)
    if (window.chimeHandler && typeof chimeHandler.forceControlsOff === 'function') {
      chimeHandler.forceControlsOff(); // This will also show the grace period UI
    }
    
    console.log('[CallHandler] [Socket] ✅ Grace period applied - local user media disabled + Grace UI shown');
    
    CallHandler.dipatchUI("connected", "grace", { 
      graceActive: true,
      message: "Grace period active for all participants" 
    });
  }

  static handleSocketGraceResume(data) {
    console.log('[CallHandler] [Socket] ▶️ Received grace:resume - APPLYING TO THIS USER', data);
    
    if (!window.mockCallData) return;
    window.mockCallData.isInGrace = false;
    
    // Re-enable audio (CRITICAL: This user also restored)
    if (window.chimeHandler && typeof chimeHandler.forceControlsOn === 'function') {
      chimeHandler.forceControlsOn(); // This will also hide the grace period UI
    }
    
    console.log('[CallHandler] [Socket] ✅ Grace period resumed - local user media restored + Grace UI hidden');
    
    alert("✅ Grace period ended! Feeds restored for ALL USERS (including you).");
    
    CallHandler.dipatchUI("connected", "active", {
      graceActive: false,
      message: "Call resumed for all participants"
    });
  }

  static handleSocketGraceEnd(data) {
    console.log('[CallHandler] [Socket] ❌ Received grace:end - ENDING CALL FOR THIS USER', data);
    
    if (!window.mockCallData) return;
    window.mockCallData.isInGrace = false;
    
    // Hide grace period UI before ending
    if (window.chimeHandler && typeof chimeHandler._hideGracePeriodUI === 'function') {
      chimeHandler._hideGracePeriodUI();
    }
    
    const reason = data.payload?.reason || 'grace-end';
    alert(`❌ Call ended for ALL USERS - Reason: ${reason}`);
    
    // End call with reason
    CallHandler.dipatchUI("ended", "grace-end", {
      reason: reason,
      message: data.payload?.message || "Call terminated due to grace period failure"
    });
    
    // Disconnect this user
    if (window.chimeHandler && typeof chimeHandler.handleDisconnect === 'function') {
      chimeHandler.handleDisconnect();
    }
    
    console.log('[CallHandler] [Socket] Call ended for this user due to grace period failure - Reason:', reason);
  }

  /**
   * Modularized Camera/Microphone Permissions Orchestration Flow
   * 
   * Handles the complete async flow for requesting cam/mic permissions:
   * 1. Transitions to waiting state (freezes UI)
   * 2. Listens for external state changes (call terminated, joined, etc)
   * 3. Dispatches orchestration event
   * 4. Returns to appropriate state based on what happened
   * 
   * @param {string} callerIdVal - Caller ID
   * @param {string} calleeIdVal - Callee ID  
   * @param {string} calleeRole - Role (caller/callee)
   * @param {string} mediaType - Type of call (video/audio)
   * @param {string} returnState - State to return to if orchestration succeeds (e.g. "caller:callAccepted", "callee:callAccepted")
   * @returns {Promise<void>}
   */
  static async orchestrateCamMicPermissionsFlow(callerIdVal, calleeIdVal, calleeRole, mediaType = 'video', returnState = 'caller:callAccepted') {
    console.log('[CallHandler] [CamMicFlow] [Start]', { callerIdVal, calleeIdVal, calleeRole, mediaType, returnState });
    
    const isVideoCall = mediaType === 'video';
    
    // Step 0: Ensure cam/mic init
    console.log('[CallHandler] [CamMicFlow] [STEP 0: INIT] Dispatching CamMic:Init');
    window.dispatchEvent(new CustomEvent('CamMic:Init'));
    
    // Store returnState for later use (will be used when permissions are granted)
    const nextStateAfterCamMicPermissions = returnState;
    
    // Step 1: Guard against multiple transitions to waiting state
    if (CallHandler._isInCamMicWaiting) {
      console.log('[CallHandler] [CamMicFlow] [STEP 1: GUARD] Already in waiting state - skipping transition');
      return;
    }
    
    // Set guard flag BEFORE transitioning
    CallHandler._isInCamMicWaiting = true;
    console.log('[CallHandler] [CamMicFlow] [STEP 1: GUARD] Guard flag set - transitioning to waiting state');
    
    // Step 2: Transition to waiting state (only if guard allows)
    const waitingState = CallHandler._currentSide === 'callee' ? 'callee:waitingForCamMicPermissions' : 'caller:waitingForCamMicPermissions';
    console.log('[CallHandler] [CamMicFlow] [STEP 2: TRANSITION] Transitioning to', waitingState);
    CallHandler.dipatchUI(waitingState, 'none', {
      callerId: callerIdVal,
      calleeId: calleeIdVal,
      role: calleeRole,
    });
    
    // Step 2: Setup listener for external state changes while waiting
    let externalStateChanged = null;
    const stateChangeListener = (event) => {
      const newState = event.detail?.state;
      console.log('[CallHandler] [CamMicFlow] ⚠️ External state change detected:', newState);
      
      // Listen for call termination or other state changes
      if (newState && newState !== waitingState) {
        externalStateChanged = newState;
        console.log('[CallHandler] [CamMicFlow] State will be:', externalStateChanged, 'after permissions complete');
      }
    };
    
    document.addEventListener('chime-ui::state', stateChangeListener);
    
    // Step 3: Setup listener for permissions resolved (from permission watcher)
    const onPermissionsResolved = (ev) => {
      const detail = ev.detail || {};
      console.log('[CallHandler] [CamMicFlow] 🔔 CamMic:UI:PermissionsResolved:', detail);
      
      // Use nextState from event detail if provided, otherwise use stored returnState
      const resolvedNextState = detail.nextState || nextStateAfterCamMicPermissions;
      const finalState = externalStateChanged || resolvedNextState;
      
      console.log('[CallHandler] [CamMicFlow] ✅ Permissions resolved - returning to:', finalState);
      
      // Clear guard flag
      CallHandler._isInCamMicWaiting = false;
      
      CallHandler.dipatchUI(finalState, 'none', {
        callerId: callerIdVal,
        calleeId: calleeIdVal,
        role: calleeRole,
      });
    };
    
    window.addEventListener('CamMic:UI:PermissionsResolved', onPermissionsResolved);
    
    // Step 4: Setup listener for orchestration completion (fallback)
    let orchestrationComplete = false;
    const onOrchestrationComplete = (ev) => {
      orchestrationComplete = true;
      const detail = ev.detail || {};
      console.log('[CallHandler] [CamMicFlow] 🔔 CamMic:Orchestrate:Complete:', detail);
      
      // Check permission states
      const camera = detail.permissions?.camera || 'unknown';
      const microphone = detail.permissions?.microphone || 'unknown';
      
      console.log('[CallHandler] [CamMicFlow] Permissions:', { camera, microphone });
      
      // If permissions denied, stay in waiting state
      if ((isVideoCall && camera === 'denied') || (!isVideoCall && microphone === 'denied')) {
        console.log('[CallHandler] [CamMicFlow] ❌ Required permission denied');
        alert('❌ Permission denied. Please enable in browser settings and try again.');
        // Clear guard flag on denial
        CallHandler._isInCamMicWaiting = false;
        return;
      }
      
      // Permissions granted - return to appropriate state
      const finalState = externalStateChanged || nextStateAfterCamMicPermissions;
      console.log('[CallHandler] [CamMicFlow] ✅ Permissions granted - returning to:', finalState);
      
      // Clear guard flag
      CallHandler._isInCamMicWaiting = false;
      
      CallHandler.dipatchUI(finalState, 'none', {
        callerId: callerIdVal,
        calleeId: calleeIdVal,
        role: calleeRole,
      });
    };
    
    window.addEventListener('CamMic:Orchestrate:Complete', onOrchestrationComplete);
    
    try {
      // Step 5: Dispatch orchestration based on call type (with returnState in detail)
      if (isVideoCall) {
        console.log('[CallHandler] [CamMicFlow] [STEP 5: DISPATCH] Dispatching CamMic:Orchestrate:Both:NoPreview (video call) with returnState:', nextStateAfterCamMicPermissions);
        window.dispatchEvent(new CustomEvent('CamMic:Orchestrate:Both:NoPreview', {
          detail: { returnState: nextStateAfterCamMicPermissions }
        }));
      } else {
        console.log('[CallHandler] [CamMicFlow] [STEP 5: DISPATCH] Dispatching CamMic:Orchestrate:Microphone (audio call) with returnState:', nextStateAfterCamMicPermissions);
        window.dispatchEvent(new CustomEvent('CamMic:Orchestrate:Microphone', {
          detail: { returnState: nextStateAfterCamMicPermissions }
        }));
      }
      
      console.log('[CallHandler] [CamMicFlow] ⏳ Waiting for orchestration to complete...');
      
      // Wait for orchestration to complete (with timeout)
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Orchestration timeout')), 30000)
      );
      const completion = new Promise((resolve) => {
        const checkComplete = setInterval(() => {
          if (orchestrationComplete) {
            clearInterval(checkComplete);
            resolve();
          }
        }, 100);
      });
      
      await Promise.race([completion, timeout]);
      
    } catch (error) {
      console.error('[CallHandler] [CamMicFlow] ❌ Error:', error);
      // Return to previous state on error
      const finalState = externalStateChanged || nextStateAfterCamMicPermissions;
      
      // Clear guard flag on error
      CallHandler._isInCamMicWaiting = false;
      
      CallHandler.dipatchUI(finalState, 'none', {
        callerId: callerIdVal,
        calleeId: calleeIdVal,
        role: calleeRole,
      });
    } finally {
      // Cleanup listeners
      document.removeEventListener('chime-ui::state', stateChangeListener);
      window.removeEventListener('CamMic:UI:PermissionsResolved', onPermissionsResolved);
      window.removeEventListener('CamMic:Orchestrate:Complete', onOrchestrationComplete);
      console.log('[CallHandler] [CamMicFlow] 🧹 Listeners cleaned up');
    }
  }
}

// Expose globally if you want to trigger app-level dispatches elsewhere
window.CallHandler = CallHandler;
