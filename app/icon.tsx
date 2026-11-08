import { ImageResponse } from "next/og";
import { toolConfig } from "@/tool.config";

// ה-favicon של הכלי: ניצוץ (AI) גדול ועוד אחד קטן, על ריבוע בצבע המותג.
// הצבע מגיע מ-tool.config.ts בלבד.
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// כוכב ארבע קצוות: מרכז (cx, cy), רדיוס r, ועומק הקימור k (קטן יותר = דק יותר)
function sparkle(cx: number, cy: number, r: number, k = 0.22) {
  const i = r * k;
  return [
    `M ${cx} ${cy - r}`,
    `Q ${cx + i} ${cy - i} ${cx + r} ${cy}`,
    `Q ${cx + i} ${cy + i} ${cx} ${cy + r}`,
    `Q ${cx - i} ${cy + i} ${cx - r} ${cy}`,
    `Q ${cx - i} ${cy - i} ${cx} ${cy - r}`,
    "Z",
  ].join(" ");
}

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: toolConfig.brandColor,
          borderRadius: 16,
        }}
      >
        <svg width="64" height="64" viewBox="0 0 64 64">
          <path d={sparkle(27, 36, 22)} fill="white" />
          <path d={sparkle(48, 15, 9)} fill="white" />
        </svg>
      </div>
    ),
    size
  );
}
