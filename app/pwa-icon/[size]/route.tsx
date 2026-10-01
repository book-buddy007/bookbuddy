import { ImageResponse } from "next/og"

// PNG app icons rendered from the two-circle mark: /pwa-icon/192, /pwa-icon/512,
// /pwa-icon/180 (apple-touch) and /pwa-icon/maskable-512 (extra padding for OS masks).
const INK = "#0A0F24"

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: raw } = await params
  const maskable = raw.startsWith("maskable-")
  const size = Math.min(1024, Math.max(48, parseInt(raw.replace("maskable-", ""), 10) || 192))

  // The mark is 1.54 diameters wide. Keep it inside the 80% maskable safe zone.
  const d = Math.round(size * (maskable ? 0.27 : 0.34))
  const markW = Math.round(d * 1.54)
  const radius = maskable ? 0 : Math.round(size * 0.22)

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: INK,
          borderRadius: radius,
        }}
      >
        <div style={{ position: "relative", display: "flex", width: markW, height: d }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: d,
              height: d,
              borderRadius: d,
              background: "linear-gradient(160deg,#4C6FFF 0%,#1E3A8A 60%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: Math.round(d * 0.54),
              top: 0,
              width: d,
              height: d,
              borderRadius: d,
              background: "linear-gradient(180deg,#FF8A3D 0%,#FF4D00 55%,#D93A00 100%)",
              opacity: 0.95,
            }}
          />
        </div>
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=604800, immutable" } }
  )
}
