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
                WindowInsetsController.APPEARANCE_TRANSPARENT_CAPTION_BAR_BACKGROUND | WindowInsetsController.APPEARANCE_LIGHT_CAPTION_BARS
            );
        }

        // Native Chevron Injection
        View decorView = getWindow().getDecorView();
        ImageButton chevron = new ImageButton(this);
        chevron.setImageResource(R.drawable.ic_chevron);
        chevron.setBackgroundColor(Color.TRANSPARENT);
        chevron.setPadding(32, 32, 32, 32);
        chevron.setScaleType(android.widget.ImageView.ScaleType.FIT_CENTER);
        
        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                128, 128, Gravity.TOP | Gravity.CENTER_HORIZONTAL
        );
        
        decorView.setOnApplyWindowInsetsListener((v, insets) -> {
            if (android.os.Build.VERSION.SDK_INT >= 35) { // API 35
                int captionBarTop = insets.getInsets(WindowInsets.Type.captionBar()).top;
                if (captionBarTop > 0) {
                    params.topMargin = (captionBarTop - 128) / 2;
                    if (params.topMargin < 0) params.topMargin = 0;
                    chevron.setLayoutParams(params);
                }
            } else if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
                int topInset = insets.getInsets(WindowInsets.Type.systemBars()).top;
                params.topMargin = topInset > 128 ? (topInset - 128) / 2 : 0;
                chevron.setLayoutParams(params);
            }
            return v.onApplyWindowInsets(insets);
        });

        chevron.setLayoutParams(params);
        
        final boolean[] isCollapsed = {false};
        View.OnClickListener toggleListener = v -> {
            isCollapsed[0] = !isCollapsed[0];
            v.animate().rotation(isCollapsed[0] ? 180f : 0f).setDuration(300).start();
            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().evaluateJavascript(
                        "document.body.classList.toggle('header-collapsed');", null
                );
            }
        };
        chevron.setOnClickListener(toggleListener);
        chevron.setOnLongClickListener(v -> {
            toggleListener.onClick(v);
            return true;
        });
        
        ((FrameLayout) decorView).addView(chevron);
    }
}
