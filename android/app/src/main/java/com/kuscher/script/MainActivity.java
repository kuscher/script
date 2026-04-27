package com.kuscher.script;

import android.os.Bundle;
import android.view.WindowInsetsController;
import android.view.WindowInsets;
import android.view.View;
import android.widget.ImageButton;
import android.graphics.Color;
import android.widget.FrameLayout;
import android.view.Gravity;
import android.app.ActivityManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // App Frame Theme
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
            ActivityManager.TaskDescription taskDesc = new ActivityManager.TaskDescription(
                null, null, Color.parseColor("#A626A4")
            );
            setTaskDescription(taskDesc);
        }

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
            getWindow().getInsetsController().setSystemBarsAppearance(
                WindowInsetsController.APPEARANCE_TRANSPARENT_CAPTION_BAR_BACKGROUND | WindowInsetsController.APPEARANCE_LIGHT_CAPTION_BARS,
                WindowInsetsController.APPEARANCE_TRANSPARENT_CAPTION_BAR_BACKGROUND | WindowInsetsController.APPEARANCE_LIGHT_CAPTION_BARS
            );
        }

        // Native Chevron Injection
        View decorView = getWindow().getDecorView();
        ImageButton chevron = new ImageButton(this);
        chevron.setImageResource(R.drawable.ic_chevron);
        chevron.setBackgroundColor(Color.TRANSPARENT);
        chevron.setPadding(16, 16, 16, 16);
        chevron.setScaleType(android.widget.ImageView.ScaleType.FIT_CENTER);
        
        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                96, 96, Gravity.TOP | Gravity.CENTER_HORIZONTAL
        );
        
        decorView.setOnApplyWindowInsetsListener((v, insets) -> {
            if (android.os.Build.VERSION.SDK_INT >= 35) { // API 35
                int captionBarTop = insets.getInsets(WindowInsets.Type.captionBar()).top;
                if (captionBarTop > 0) {
                    params.topMargin = (captionBarTop - 96) / 2 - 24;
                    if (params.topMargin < 0) params.topMargin = 0;
                    chevron.setLayoutParams(params);
                }
            } else if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
                int topInset = insets.getInsets(WindowInsets.Type.systemBars()).top;
                params.topMargin = topInset > 96 ? (topInset - 96) / 2 - 24 : 0;
                if (params.topMargin < 0) params.topMargin = 0;
                chevron.setLayoutParams(params);
            }
            return v.onApplyWindowInsets(insets);
        });

        chevron.setLayoutParams(params);
        
        final boolean[] isCollapsed = {false};
        Runnable toggleLogic = () -> {
            isCollapsed[0] = !isCollapsed[0];
            chevron.animate().rotation(isCollapsed[0] ? 180f : 0f).setDuration(300).start();
            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().evaluateJavascript(
                        "document.body.classList.toggle('header-collapsed');", null
                );
            }
        };

        View.OnClickListener toggleListener = v -> toggleLogic.run();
        chevron.setOnClickListener(toggleListener);
        chevron.setOnLongClickListener(v -> {
            toggleLogic.run();
            return true;
        });
        chevron.setOnTouchListener((v, event) -> {
            if (event.getAction() == android.view.MotionEvent.ACTION_DOWN) {
                toggleLogic.run();
                return true; // Consume the event to prevent duplicate onClick
            }
            return false;
        });
        
        ((FrameLayout) decorView).addView(chevron);
    }
}
