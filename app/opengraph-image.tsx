import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "TenkiBench — norsk SMB-evaluering for språkmodeller";

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#FAFAFA",
          color: "#0F0F12",
          display: "flex",
          flexDirection: "column",
          padding: "80px",
          fontFamily: "system-ui",
        }}
      >
        <div
          style={{
            fontSize: 18,
            letterSpacing: "0.18em",
            color: "#6E6E76",
            textTransform: "uppercase",
            fontWeight: 500,
          }}
        >
          TenkiBench v0.1
        </div>
        <div
          style={{
            fontSize: 96,
            fontWeight: 500,
            letterSpacing: "-0.04em",
            lineHeight: 0.95,
            marginTop: 40,
            maxWidth: "1040px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "baseline",
          }}
        >
          <span>Vi tester om kunstig intelligens forstår Norge</span>
          <span style={{ color: "#1A4DFF" }}>.</span>
        </div>
        <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: 24, color: "#6E6E76" }}>bench.tenki.no</div>
          <div style={{ width: 64, height: 64, border: "2px solid #1A4DFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, fontWeight: 700, color: "#1A4DFF", letterSpacing: "-0.04em" }}>
            T
          </div>
        </div>
      </div>
    ),
    size,
  );
}
