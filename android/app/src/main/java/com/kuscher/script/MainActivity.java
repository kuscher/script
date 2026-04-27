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
                WindowInsetsController.APPEARANCE_TRANSPARENT_CAPTION_BAR_BACKGROUND,
                WindowInsetsController.APPEARANCE_TRANSPARENT_CAPTION_BAR_BACKGROUND
            );
        }

        // Native Chevron Injection
        View decorView = getWindow().getDecorView();
        ImageButton chevron = new ImageButton(this);
        chevron.setImageResource(R.drawable.ic_chevron);
        chevron.setBackgroundColor(Color.TRANSPARENT);
        chevron.setPadding(0,0,0,0);
        chevron.setScaleType(android.widget.ImageView.ScaleType.FIT_CENTER);
        
        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                64, 64, Gravity.TOP | Gravity.CENTER_HORIZONTAL
        );
        
        decorView.setOnApplyWindowInsetsListener((v, insets) -> {
            if (android.os.Build.VERSION.SDK_INT >= 35) { // API 35
                java.util.List<android.graphics.Rect> rects = insets.getBoundingRects(WindowInsets.Type.captionBar());
                // The rects usually occupy the far right/left. We render in the safe zone (center).
                int captionBarTop = insets.getInsets(WindowInsets.Type.captionBar()).top;
                if (captionBarTop > 0) {
                    params.topMargin = (captionBarTop - 64) / 2;
                    if (params.topMargin < 0) params.topMargin = 0;
                    chevron.setLayoutParams(params);
                }
            } else if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
                int topInset = insets.getInsets(WindowInsets.Type.systemBars()).top;
                params.topMargin = topInset > 64 ? (topInset - 64) / 2 : 0;
                chevron.setLayoutParams(params);
            }
            return v.onApplyWindowInsets(insets);
        });

        chevron.setLayoutParams(params);
        chevron.setOnClickListener(v -> {
            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().evaluateJavascript(
                        "document.body.classList.toggle('header-collapsed');", null
                );
            }
        });
        
        ((FrameLayout) decorView).addView(chevron);
    }
}
