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

        // Native Header Controls Injection
        View decorView = getWindow().getDecorView();
        
        int sizePx = (int) (40 * getResources().getDisplayMetrics().density);
        int paddingPx = (int) (10 * getResources().getDisplayMetrics().density);
        int marginPx = (int) (8 * getResources().getDisplayMetrics().density);

        android.widget.LinearLayout container = new android.widget.LinearLayout(this);
        container.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        container.setGravity(Gravity.CENTER_VERTICAL);
        
        FrameLayout.LayoutParams containerParams = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT, FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.TOP | Gravity.START
        );

        ImageButton menuBtn = new ImageButton(this);
        menuBtn.setImageResource(R.drawable.ic_menu);
        menuBtn.setBackgroundResource(R.drawable.bg_circular);
        menuBtn.setPadding(paddingPx, paddingPx, paddingPx, paddingPx);
        menuBtn.setScaleType(android.widget.ImageView.ScaleType.FIT_CENTER);
        menuBtn.setColorFilter(android.graphics.Color.parseColor("#A626A4"));
        android.widget.LinearLayout.LayoutParams menuParams = new android.widget.LinearLayout.LayoutParams(sizePx, sizePx);
        menuParams.setMarginEnd(marginPx);
        menuBtn.setLayoutParams(menuParams);

        ImageButton chevron = new ImageButton(this);
        chevron.setImageResource(R.drawable.ic_chevron);
        chevron.setBackgroundResource(R.drawable.bg_circular);
        chevron.setPadding(paddingPx, paddingPx, paddingPx, paddingPx);
        chevron.setScaleType(android.widget.ImageView.ScaleType.FIT_CENTER);
        chevron.setColorFilter(android.graphics.Color.parseColor("#A626A4"));
        chevron.setLayoutParams(new android.widget.LinearLayout.LayoutParams(sizePx, sizePx));

        container.addView(menuBtn);
        container.addView(chevron);

        decorView.setOnApplyWindowInsetsListener((v, insets) -> {
            int leftSafeMargin = marginPx;
            int topSafeMargin = marginPx;
            
            if (android.os.Build.VERSION.SDK_INT >= 35) { // API 35
                int captionBarTop = insets.getInsets(WindowInsets.Type.captionBar()).top;
                if (captionBarTop > 0) topSafeMargin = (captionBarTop - sizePx) / 2;
                for (android.graphics.Rect rect : insets.getBoundingRects(WindowInsets.Type.captionBar())) {
                    if (rect.left < 200) { // controls are on the left
                        leftSafeMargin = Math.max(leftSafeMargin, rect.right + marginPx);
                    }
                }
            } else if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
                int topInset = insets.getInsets(WindowInsets.Type.systemBars()).top;
                if (topInset > 0) topSafeMargin = (topInset - sizePx) / 2;
            }
            containerParams.topMargin = topSafeMargin;
            containerParams.leftMargin = leftSafeMargin;
            container.setLayoutParams(containerParams);
            return v.onApplyWindowInsets(insets);
        });

        container.setLayoutParams(containerParams);
        
        final boolean[] isCollapsed = {false};
        Runnable toggleHeaderLogic = () -> {
            isCollapsed[0] = !isCollapsed[0];
            chevron.animate().rotation(isCollapsed[0] ? 180f : 0f).setDuration(300).start();
            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().evaluateJavascript(
                        "document.body.classList.toggle('header-collapsed');", null
                );
            }
        };

        chevron.setOnClickListener(v -> toggleHeaderLogic.run());
        chevron.setOnLongClickListener(v -> { toggleHeaderLogic.run(); return true; });
        chevron.setOnTouchListener((v, event) -> {
            if (event.getAction() == android.view.MotionEvent.ACTION_DOWN) {
                toggleHeaderLogic.run(); return true;
            } return false;
        });

        Runnable toggleSidebarLogic = () -> {
            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().evaluateJavascript(
                        "document.body.classList.toggle('sidebar-collapsed');", null
                );
            }
        };

        menuBtn.setOnClickListener(v -> toggleSidebarLogic.run());
        menuBtn.setOnLongClickListener(v -> { toggleSidebarLogic.run(); return true; });
        menuBtn.setOnTouchListener((v, event) -> {
            if (event.getAction() == android.view.MotionEvent.ACTION_DOWN) {
                toggleSidebarLogic.run(); return true;
            } return false;
        });
        
        ((FrameLayout) decorView).addView(container);
    }
}
