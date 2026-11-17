package paperphone.envelope;

import android.content.Intent;
import android.telecom.Call;
import android.telecom.InCallService;

/**
 * Android binds this service for every call while Envelope is the phone app.
 * It replaces the system call screen, so the keypad stays under the paper.
 */
public class CallService extends InCallService {
    private final Call.Callback callback = new Call.Callback() {
        @Override public void onStateChanged(Call call, int state) { CallHub.update(call); }
    };

    @Override public void onCallAdded(Call call) {
        super.onCallAdded(call);
        if (CallHub.call != null && CallHub.call != call) {
            // one call at a time: a second caller hears busy rather than interrupting
            call.disconnect();
            return;
        }
        call.registerCallback(callback);
        CallHub.update(call);
        startActivity(new Intent(this, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP)
                .putExtra(MainActivity.EXTRA_KEYPAD, true));
    }

    @Override public void onCallRemoved(Call call) {
        super.onCallRemoved(call);
        call.unregisterCallback(callback);
        CallHub.clear(call);
    }
}
