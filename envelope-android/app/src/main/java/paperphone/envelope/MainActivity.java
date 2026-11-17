package paperphone.envelope;

import android.Manifest;
import android.app.Activity;
import android.app.role.RoleManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.telecom.TelecomManager;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

/**
 * One screen with two faces: a setup list (done before the paper goes on) and the keypad.
 */
public class MainActivity extends Activity implements KeypadView.Host, CallHub.Listener {
    static final String EXTRA_KEYPAD = "keypad";
    private static final int REQUEST_CALL = 1, REQUEST_ROLE = 2;
    private static final long DIM_AFTER_MS = 20_000;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable dim = () -> setBrightness(0.01f);
    private ScrollView setup;
    private KeypadView keypad;
    private Button callButton, roleButton, startButton;
    private TextView callStatus, roleStatus;
    private boolean keypadShown;

    @Override protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        FrameLayout root = new FrameLayout(this);
        keypad = new KeypadView(this);
        keypad.setHost(this);
        keypad.setVisibility(View.GONE);
        root.addView(keypad, new FrameLayout.LayoutParams(-1, -1));
        setup = buildSetup();
        root.addView(setup, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        handleIntent(getIntent());
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent != null && intent.getBooleanExtra(EXTRA_KEYPAD, false)) showKeypad();
    }

    // ---- setup list ----------------------------------------------------------------

    private int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    private TextView text(String s, int sp, int color) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextSize(sp);
        t.setTextColor(color);
        t.setLineSpacing(0, 1.25f);
        t.setPadding(0, dp(10), 0, 0);
        return t;
    }

    private Button button(String s, View.OnClickListener l) {
        Button b = new Button(this);
        b.setText(s);
        b.setAllCaps(false);
        b.setOnClickListener(l);
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-2, -2);
        p.topMargin = dp(8);
        b.setLayoutParams(p);
        return b;
    }

    private ScrollView buildSetup() {
        LinearLayout col = new LinearLayout(this);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setPadding(dp(28), dp(64), dp(28), dp(48));

        TextView title = text("Envelope", 30, 0xFFFFFFFF);
        title.setTypeface(Typeface.DEFAULT, Typeface.NORMAL);
        col.addView(title);
        col.addView(text("Do these two things before the paper goes on. After that nothing will ask you anything.", 16, 0xFFCCCCCC));

        col.addView(text("1. Let Envelope make phone calls", 18, 0xFFFFFFFF));
        callStatus = text("", 14, 0xFFAAAAAA);
        col.addView(callStatus);
        callButton = button("Allow calls", v -> requestPermissions(new String[]{Manifest.permission.CALL_PHONE}, REQUEST_CALL));
        col.addView(callButton);

        col.addView(text("2. Make Envelope the phone app", 18, 0xFFFFFFFF));
        roleStatus = text("", 14, 0xFFAAAAAA);
        col.addView(roleStatus);
        roleButton = button("Make it the phone app", v -> requestRole());
        col.addView(roleButton);

        startButton = button("Show the keypad", v -> showKeypad());
        ((LinearLayout.LayoutParams) startButton.getLayoutParams()).topMargin = dp(28);
        col.addView(startButton);
        col.addView(text("Then slide the phone into the envelope. Tap digits and the large circle to call; hold the large circle to clear. "
                + "When the large circle pulses, someone is calling: tap to answer, hold to refuse. Tap it twice to hang up. "
                + "The screen dims after 20 seconds to save battery and wakes on any tap. "
                + "To leave the keypad, tap the top left corner of the screen.", 14, 0xFFAAAAAA));

        col.addView(text("When you take the phone out", 18, 0xFFFFFFFF));
        col.addView(text("Give calls back to your normal phone app, or every call will keep arriving on this keypad.", 14, 0xFFAAAAAA));
        col.addView(button("Choose the phone app", v -> startActivity(new Intent(Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS))));

        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(0xFF000000);
        scroll.setFillViewport(true);
        scroll.addView(col);
        return scroll;
    }

    private boolean canCall() { return checkSelfPermission(Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED; }

    private boolean isPhoneApp() {
        RoleManager roles = getSystemService(RoleManager.class);
        return roles != null && roles.isRoleHeld(RoleManager.ROLE_DIALER);
    }

    private void requestRole() {
        RoleManager roles = getSystemService(RoleManager.class);
        if (roles == null || !roles.isRoleAvailable(RoleManager.ROLE_DIALER)) {
            roleStatus.setText("This phone does not let another app handle calls.");
            return;
        }
        startActivityForResult(roles.createRequestRoleIntent(RoleManager.ROLE_DIALER), REQUEST_ROLE);
    }

    private void refreshSetup() {
        boolean call = canCall(), role = isPhoneApp();
        callStatus.setText(call ? "Done." : "Needed so the call key can dial without another screen appearing.");
        callButton.setVisibility(call ? View.GONE : View.VISIBLE);
        roleStatus.setText(role ? "Done. Calls now arrive on the keypad instead of the usual call screen."
                : "Without this, the phone's own call screen covers the keypad during every call.");
        roleButton.setVisibility(role ? View.GONE : View.VISIBLE);
        startButton.setEnabled(call);
    }

    @Override public void onRequestPermissionsResult(int code, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(code, permissions, results);
        refreshSetup();
    }

    @Override protected void onActivityResult(int code, int result, Intent data) {
        super.onActivityResult(code, result, data);
        refreshSetup();
    }

    // ---- keypad ----------------------------------------------------------------------

    private void showKeypad() {
        keypadShown = true;
        setup.setVisibility(View.GONE);
        keypad.setVisibility(View.VISIBLE);
        // stay usable over the lock screen: the phone itself can remain locked in the envelope
        setShowWhenLocked(true);
        setTurnScreenOn(true);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideBars();
        wake();
    }

    @Override public void leaveKeypad() {
        keypadShown = false;
        handler.removeCallbacks(dim);
        setBrightness(WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE);
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setShowWhenLocked(false);
        showBars();
        keypad.clearNumber();
        keypad.setVisibility(View.GONE);
        setup.setVisibility(View.VISIBLE);
        refreshSetup();
    }

    @SuppressWarnings("deprecation")
    private void hideBars() {
        if (android.os.Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.systemBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        }
    }

    @SuppressWarnings("deprecation")
    private void showBars() {
        if (android.os.Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) c.show(WindowInsets.Type.systemBars());
        } else getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
    }

    private void setBrightness(float value) {
        WindowManager.LayoutParams p = getWindow().getAttributes();
        p.screenBrightness = value;
        getWindow().setAttributes(p);
    }

    /** Full brightness now; dim again after a while unless a call is in progress. */
    @Override public void wake() {
        if (!keypadShown) return;
        setBrightness(1f);
        handler.removeCallbacks(dim);
        if (CallHub.state == CallHub.IDLE) handler.postDelayed(dim, DIM_AFTER_MS);
    }

    @Override public void placeCall(String number) {
        if (!canCall()) { leaveKeypad(); return; }
        TelecomManager telecom = getSystemService(TelecomManager.class);
        try {
            telecom.placeCall(Uri.fromParts("tel", number, null), new Bundle());
        } catch (SecurityException e) {
            leaveKeypad();
        }
    }

    @Override public void onCallChanged() {
        if (CallHub.state != CallHub.IDLE && !keypadShown) showKeypad();
        wake();
        keypad.invalidate();
    }

    @Override protected void onResume() {
        super.onResume();
        CallHub.listener = this;
        refreshSetup();
        if (keypadShown) { hideBars(); wake(); }
        if (CallHub.state != CallHub.IDLE) onCallChanged();
    }

    @Override protected void onPause() {
        super.onPause();
        handler.removeCallbacks(dim);
    }

    @Override protected void onDestroy() {
        super.onDestroy();
        if (CallHub.listener == this) CallHub.listener = null;
    }

    @Override public void onWindowFocusChanged(boolean focus) {
        super.onWindowFocusChanged(focus);
        if (focus && keypadShown) hideBars();
    }

    @SuppressWarnings("deprecation")
    @Override public void onBackPressed() {
        if (keypadShown && CallHub.state == CallHub.IDLE) leaveKeypad();
        else if (!keypadShown) super.onBackPressed();
    }
}
