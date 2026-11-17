package paperphone.envelope;

import android.telecom.Call;

/** The one call this app knows about, shared between the call service and the keypad. */
final class CallHub {
    static final int IDLE = 0, DIALING = 1, RINGING = 2, ACTIVE = 3;

    interface Listener { void onCallChanged(); }

    static Call call;
    static int state = IDLE;
    static Listener listener;

    private CallHub() {}

    @SuppressWarnings("deprecation") // Call.getState() is the only option below Android 12
    static void update(Call c) {
        int s;
        switch (c.getState()) {
            case Call.STATE_RINGING: s = RINGING; break;
            case Call.STATE_ACTIVE: case Call.STATE_HOLDING: s = ACTIVE; break;
            case Call.STATE_DISCONNECTED: case Call.STATE_DISCONNECTING: s = IDLE; break;
            default: s = DIALING; // new, connecting, dialing, choosing a SIM
        }
        if (s == IDLE) { if (c == call) clear(c); return; }
        call = c;
        state = s;
        if (listener != null) listener.onCallChanged();
    }

    static void clear(Call c) {
        if (c != call) return;
        call = null;
        state = IDLE;
        if (listener != null) listener.onCallChanged();
    }
}
