package paperphone.envelope;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.media.AudioManager;
import android.media.ToneGenerator;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.telecom.Call;
import android.telecom.VideoProfile;
import android.view.MotionEvent;
import android.view.View;

import java.util.Calendar;

/**
 * The glowing keys. Their positions are the same fractions of the screen that the
 * web app (js/keypad.js) uses to print the envelope, so paper and screen line up.
 */
public class KeypadView extends View {
    interface Host {
        void placeCall(String number);
        void wake();          // full brightness
        void leaveKeypad();
    }

    private static final String LABELS = "123456789*0#";
    private static final int CALL = 12, CLOCK = 13, COUNT = 14;
    private static final int[] TONES = {
            ToneGenerator.TONE_DTMF_1, ToneGenerator.TONE_DTMF_2, ToneGenerator.TONE_DTMF_3,
            ToneGenerator.TONE_DTMF_4, ToneGenerator.TONE_DTMF_5, ToneGenerator.TONE_DTMF_6,
            ToneGenerator.TONE_DTMF_7, ToneGenerator.TONE_DTMF_8, ToneGenerator.TONE_DTMF_9,
            ToneGenerator.TONE_DTMF_S, ToneGenerator.TONE_DTMF_0, ToneGenerator.TONE_DTMF_P};

    private final float[] cx = new float[COUNT], cy = new float[COUNT], rad = new float[COUNT];
    private final long[] litUntil = new long[COUNT];
    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final StringBuilder number = new StringBuilder();
    private ToneGenerator tones;
    private Host host;
    private boolean clockBusy, holdFired;
    private long lastCallTap;

    public KeypadView(Context context) {
        super(context);
        paint.setColor(0xFFFFFFFF);
        setBackgroundColor(0xFF000000);
    }

    void setHost(Host h) { host = h; }

    void clearNumber() { number.setLength(0); invalidate(); }

    @Override protected void onSizeChanged(int w, int h, int oldW, int oldH) {
        float r = 0.08f * w, stepX = 0.235f * w, stepY = 0.225f * w, top = 0.28f * h;
        for (int i = 0; i < 12; i++) {
            cx[i] = 0.5f * w + ((i % 3) - 1) * stepX;
            cy[i] = top + (i / 3) * stepY;
            rad[i] = r;
        }
        cx[CALL] = 0.5f * w; cy[CALL] = top + 3 * stepY + 0.26f * w; rad[CALL] = 0.095f * w;
        cx[CLOCK] = 0.5f * w; cy[CLOCK] = cy[CALL] + 0.27f * w; rad[CLOCK] = 0.08f * w;
    }

    @Override protected void onDraw(Canvas canvas) {
        long now = SystemClock.uptimeMillis();
        boolean animating = false;
        for (int i = 0; i < COUNT; i++) {
            float a = 0.3f;
            if (i == CALL) {
                if (CallHub.state == CallHub.RINGING) {
                    a = 0.35f + 0.65f * (float) Math.abs(Math.sin(now / 280.0)); // pulse: someone is calling
                    animating = true;
                } else if (CallHub.state != CallHub.IDLE) a = 1f;
                else if (number.length() >= 3) a = 0.8f;
            }
            if (litUntil[i] > now) { a = 1f; animating = true; }
            paint.setAlpha((int) (a * 255));
            canvas.drawCircle(cx[i], cy[i], rad[i], paint);
        }
        if (animating) postInvalidateOnAnimation();
    }

    private void flash(int key, long ms) {
        litUntil[key] = SystemClock.uptimeMillis() + ms;
        invalidate();
    }

    private void tone(int toneType, int ms) {
        try {
            if (tones == null) tones = new ToneGenerator(AudioManager.STREAM_DTMF, 70);
            tones.startTone(toneType, ms);
        } catch (RuntimeException e) {
            tones = null; // no tone is better than a crash
        }
    }

    private int keyAt(float x, float y) {
        for (int i = 0; i < COUNT; i++) {
            float dx = x - cx[i], dy = y - cy[i], reach = rad[i] * 1.3f;
            if (dx * dx + dy * dy <= reach * reach) return i;
        }
        return -1;
    }

    private final Runnable hold = new Runnable() {
        @Override public void run() {
            holdFired = true;
            Call c = CallHub.call;
            if (CallHub.state == CallHub.RINGING && c != null) c.disconnect(); // turn the caller away
            else if (CallHub.state == CallHub.IDLE) number.setLength(0);
            tone(ToneGenerator.TONE_PROP_NACK, 250);
            flash(CALL, 400);
        }
    };

    @Override public boolean onTouchEvent(MotionEvent e) {
        int action = e.getActionMasked();
        if (action == MotionEvent.ACTION_DOWN) {
            if (host != null) host.wake();
            // the top left corner leaves the keypad, as the close button did in the original app
            if (e.getX() < getWidth() * 0.2f && e.getY() < getHeight() * 0.09f) {
                if (CallHub.state == CallHub.IDLE && host != null) host.leaveKeypad();
                return true;
            }
            int key = keyAt(e.getX(), e.getY());
            if (key < 0 || clockBusy) return true;
            if (key == CALL) {
                holdFired = false;
                handler.postDelayed(hold, 650);
            } else if (key == CLOCK) {
                if (CallHub.state == CallHub.IDLE) showTime();
            } else digit(key);
            return true;
        }
        if (action == MotionEvent.ACTION_UP || action == MotionEvent.ACTION_CANCEL) {
            handler.removeCallbacks(hold);
            if (action == MotionEvent.ACTION_UP && !holdFired && keyAt(e.getX(), e.getY()) == CALL) callTapped();
            return true;
        }
        return true;
    }

    private void digit(int key) {
        flash(key, 180);
        char ch = LABELS.charAt(key);
        Call c = CallHub.call;
        if (CallHub.state == CallHub.ACTIVE && c != null) {
            // during a call the digits go down the line, for phone menus
            c.playDtmfTone(ch);
            handler.postDelayed(c::stopDtmfTone, 200);
            return;
        }
        tone(TONES[key], 150);
        if (CallHub.state == CallHub.IDLE && number.length() < 20) number.append(ch);
    }

    private void callTapped() {
        Call c = CallHub.call;
        long now = SystemClock.uptimeMillis();
        switch (CallHub.state) {
            case CallHub.RINGING:
                if (c != null) c.answer(VideoProfile.STATE_AUDIO_ONLY);
                break;
            case CallHub.DIALING:
            case CallHub.ACTIVE:
                // two quick taps to hang up, so a cheek against the paper does not end the call
                if (now - lastCallTap < 700 && c != null) c.disconnect();
                lastCallTap = now;
                break;
            default:
                if (number.length() >= 3) {
                    flash(CALL, 500);
                    String dial = number.toString();
                    number.setLength(0);
                    if (host != null) host.placeCall(dial);
                } else tone(ToneGenerator.TONE_PROP_NACK, 200);
        }
        invalidate();
    }

    /** Flashes the time on the keypad: two digits for the hour, a pause, two for the minutes. */
    private void showTime() {
        clockBusy = true;
        Calendar now = Calendar.getInstance();
        String digits = String.format(java.util.Locale.US, "%02d%02d", now.get(Calendar.HOUR_OF_DAY), now.get(Calendar.MINUTE));
        litUntil[CLOCK] = SystemClock.uptimeMillis() + 4200;
        for (int i = 0; i < 4; i++) {
            final int key = LABELS.indexOf(digits.charAt(i));
            final int beep = i < 2 ? ToneGenerator.TONE_PROP_BEEP : ToneGenerator.TONE_PROP_BEEP2;
            handler.postDelayed(() -> { flash(key, 420); tone(beep, 150); }, 400 + i * 750L + (i > 1 ? 500 : 0));
        }
        handler.postDelayed(() -> clockBusy = false, 4200);
        invalidate();
    }

    @Override protected void onDetachedFromWindow() {
        super.onDetachedFromWindow();
        handler.removeCallbacksAndMessages(null);
        clockBusy = false;
        if (tones != null) { tones.release(); tones = null; }
    }
}
