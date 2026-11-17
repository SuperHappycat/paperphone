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

import java.util.Random;

/**
 * The lights under the table tent. Positions are the same fractions of the screen as
 * PP.tentLayout in the web app (js/keypad.js), which prints the tent. The phone lies with
 * its top end at the tent's left, so the tent's long side is the screen's height.
 */
public class TentView extends View {
    interface Host { void endMeal(); }

    private static final int DOTS = 12;
    private static final long FIVE_MINUTES = 5 * 60 * 1000L;

    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Random random = new Random();
    private final float[] px = new float[8], py = new float[8];
    private final float[] dotX = new float[DOTS], dotY = new float[DOTS];
    private float nameR, nextX, nextY, bigR, callX, callY, dotR;
    private int people = 4, litName = -1;
    private long startedAt, nextLitUntil, lastCallTap;
    private boolean spinning, holdFired;
    private ToneGenerator tones;
    private Host host;

    public TentView(Context context) {
        super(context);
        paint.setColor(0xFFFFFFFF);
        setBackgroundColor(0xFF000000);
    }

    void setHost(Host h) { host = h; }

    void start(int count) {
        people = Math.max(2, Math.min(8, count));
        startedAt = SystemClock.elapsedRealtime();
        litName = -1;
        spinning = false;
        place(getWidth(), getHeight());
        handler.removeCallbacksAndMessages(null);
        handler.post(tick);
        invalidate();
    }

    void stop() { handler.removeCallbacksAndMessages(null); spinning = false; }

    long minutes() { return Math.max(1, Math.round((SystemClock.elapsedRealtime() - startedAt) / 60000.0)); }

    private final Runnable tick = new Runnable() {
        @Override public void run() { invalidate(); handler.postDelayed(this, 1000); }
    };

    @Override protected void onSizeChanged(int w, int h, int oldW, int oldH) { place(w, h); }

    /** x along the tent is the screen's y; the tent's near edge is the screen's left edge. */
    private void place(float shortSide, float longSide) {
        float pitch = longSide / people;
        nameR = Math.min(0.1f * shortSide, 0.4f * pitch);
        for (int i = 0; i < people; i++) { px[i] = shortSide - 0.3f * shortSide; py[i] = (i + 0.5f) * pitch; }
        bigR = 0.13f * shortSide;
        nextX = shortSide - 0.76f * shortSide; nextY = 0.13f * longSide;
        callX = nextX; callY = 0.87f * longSide;
        dotR = 0.03f * shortSide;
        for (int i = 0; i < DOTS; i++) { dotX[i] = nextX; dotY[i] = (0.3f + 0.4f * i / 11f) * longSide; }
    }

    private void disc(Canvas c, float x, float y, float r, float alpha) {
        paint.setAlpha((int) (alpha * 255));
        c.drawCircle(x, y, r, paint);
    }

    @Override protected void onDraw(Canvas c) {
        long now = SystemClock.uptimeMillis();
        boolean animating = false;
        for (int i = 0; i < people; i++) disc(c, px[i], py[i], nameR, i == litName ? 1f : 0.22f);
        boolean nextLit = nextLitUntil > now || spinning;
        disc(c, nextX, nextY, bigR, nextLit ? 1f : 0.22f);
        int lit = (int) Math.min(DOTS, (SystemClock.elapsedRealtime() - startedAt) / FIVE_MINUTES);
        for (int i = 0; i < DOTS; i++) disc(c, dotX[i], dotY[i], dotR, i < lit ? 0.95f : 0.1f);
        // the call window is dark unless one of the chosen callers is on the line
        if (CallHub.state == CallHub.RINGING) {
            disc(c, callX, callY, bigR, 0.3f + 0.7f * (float) Math.abs(Math.sin(now / 280.0)));
            animating = true;
        } else if (CallHub.state != CallHub.IDLE) disc(c, callX, callY, bigR, 1f);
        if (animating || nextLitUntil > now) postInvalidateOnAnimation();
    }

    private void tone(int type, int ms) {
        try {
            if (tones == null) tones = new ToneGenerator(AudioManager.STREAM_MUSIC, 60);
            tones.startTone(type, ms);
        } catch (RuntimeException e) { tones = null; }
    }

    /** The light runs along the names, slows, and settles on one. */
    private void spin() {
        if (spinning) return;
        spinning = true;
        final int target = random.nextInt(people), hops = people * 2 + target + 1;
        final int[] i = {-1};
        final float[] delay = {70f};
        handler.post(new Runnable() {
            @Override public void run() {
                i[0]++;
                litName = i[0] % people;
                invalidate();
                if (i[0] + 1 < hops) {
                    tone(ToneGenerator.TONE_PROP_BEEP, 30);
                    delay[0] *= 1.13f;
                    handler.postDelayed(this, (long) delay[0]);
                    return;
                }
                tone(ToneGenerator.TONE_PROP_ACK, 250);
                spinning = false;
                handler.postDelayed(() -> { if (!spinning) { litName = -1; invalidate(); } }, 6000);
            }
        });
    }

    private static boolean near(MotionEvent e, float x, float y, float r) {
        float dx = e.getX() - x, dy = e.getY() - y;
        return dx * dx + dy * dy <= r * r * 2.25f; // generous: the tap comes through paper
    }

    private final Runnable hold = () -> {
        holdFired = true;
        Call call = CallHub.call;
        if (CallHub.state == CallHub.RINGING && call != null) call.disconnect(); // turn the caller away
    };

    @Override public boolean onTouchEvent(MotionEvent e) {
        int action = e.getActionMasked();
        if (action == MotionEvent.ACTION_DOWN) {
            // the corner at the phone's top left ends the meal by hand
            if (e.getX() < getWidth() * 0.2f && e.getY() < getHeight() * 0.06f && CallHub.state == CallHub.IDLE) {
                if (host != null) host.endMeal();
            } else if (near(e, callX, callY, bigR) && CallHub.state != CallHub.IDLE) {
                holdFired = false;
                handler.postDelayed(hold, 650);
            } else if (near(e, nextX, nextY, bigR)) {
                nextLitUntil = SystemClock.uptimeMillis() + 300;
                spin();
            }
            return true;
        }
        if (action == MotionEvent.ACTION_UP || action == MotionEvent.ACTION_CANCEL) {
            handler.removeCallbacks(hold);
            if (action == MotionEvent.ACTION_UP && !holdFired && near(e, callX, callY, bigR)) callTapped();
        }
        return true;
    }

    private void callTapped() {
        Call call = CallHub.call;
        if (call == null) return;
        long now = SystemClock.uptimeMillis();
        if (CallHub.state == CallHub.RINGING) {
            call.answer(VideoProfile.STATE_AUDIO_ONLY);
            handler.postDelayed(CallService::useSpeaker, 600);
        } else if (CallHub.state != CallHub.IDLE) {
            if (now - lastCallTap < 700) call.disconnect(); // two quick taps to hang up
            lastCallTap = now;
        }
        invalidate();
    }

    @Override protected void onDetachedFromWindow() {
        super.onDetachedFromWindow();
        stop();
        if (tones != null) { tones.release(); tones = null; }
    }
}
