import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#FAFAFA",
          color: "#1A4DFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          fontWeight: 700,
          fontFamily: "system-ui",
          letterSpacing: "-0.04em",
          border: "1px solid #1A4DFF",
        }}
      >
        T
      </div>
    ),
    size,
  );
}
