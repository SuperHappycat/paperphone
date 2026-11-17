package paperphone.envelope;

import android.content.Intent;
import android.net.Uri;
import android.telecom.Call;
import android.telecom.CallAudioState;
import android.telecom.InCallService;
import android.telecom.TelecomManager;

/**
 * Android binds this service for every call while Envelope is the phone app.
 * It replaces the system call screen, so the keypad stays under the paper.
 */
public class CallService extends InCallService {
    static CallService instance;

    private final Call.Callback callback = new Call.Callback() {
        @Override public void onStateChanged(Call call, int state) { CallHub.update(call); }
    };

    @Override public void onCreate() { super.onCreate(); instance = this; }

    @Override public void onDestroy() { if (instance == this) instance = null; super.onDestroy(); }

    @SuppressWarnings("deprecation") // Call.getState() is the only option below Android 12
    @Override public void onCallAdded(Call call) {
        super.onCallAdded(call);
        if (CallHub.call != null && CallHub.call != call) {
            // one call at a time: a second caller hears busy rather than interrupting
            call.disconnect();
            return;
        }
        if (CallHub.tentMode && call.getState() == Call.STATE_RINGING && !CallHub.isImportant(numberOf(call))) {
            // Under the tent, a caller who is not on the list rings in silence and is only
            // counted. The call still appears in the phone's call log afterwards.
            CallHub.waited++;
            try {
                TelecomManager telecom = getSystemService(TelecomManager.class);
                if (telecom != null) telecom.silenceRinger();
            } catch (SecurityException e) { /* not the phone app any more: it will just ring */ }
            return;
        }
        call.registerCallback(callback);
        CallHub.update(call);
        startActivity(new Intent(this, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP)
                .putExtra(MainActivity.EXTRA_KEYPAD, !CallHub.tentMode));
    }

    @Override public void onCallRemoved(Call call) {
        super.onCallRemoved(call);
        call.unregisterCallback(callback);
        CallHub.clear(call);
    }

    private static String numberOf(Call call) {
        Call.Details d = call.getDetails();
        Uri handle = d == null ? null : d.getHandle();
        return handle == null ? "" : handle.getSchemeSpecificPart();
    }

    /** The phone is lying on the table, so an answered call goes to the loudspeaker. */
    @SuppressWarnings("deprecation")
    static void useSpeaker() {
        if (instance != null) instance.setAudioRoute(CallAudioState.ROUTE_SPEAKER);
    }
}
