import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Marka ikonu tek kaynaktan: TopNavbar/login/landing'de kullanılan lucide
// "Hexagon" path'i (bkz. node_modules/lucide-react/dist/esm/icons/hexagon.js) —
// sekme ikonu da dahil her yerde aynı şekil kullanılsın diye burada tekrarlanır.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2563eb",
          borderRadius: 7,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
            fill="white"
            fillOpacity={0.15}
            stroke="white"
            strokeWidth={2}
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
