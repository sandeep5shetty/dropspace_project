"use client";

import Script from "next/script";

export function FeedbackWidget() {
  return (
    <>
      <div style={{ position: "fixed", bottom: "15px", right: "15px", zIndex: 150 }}>
        <widget-web-component
          theme="midnightMystery"
          website-name="DropSpace"
          projectid="cmav8nzen0001d77zy2e4ejmh"
        />
      </div>
      <Script
        src="https://widget.opinify.in/widget.umd.js"
        strategy="afterInteractive"
      />
    </>
  );
}
