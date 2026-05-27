import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "호학식당 | 예약",
  description: "따뜻한 한 끼, 호학식당 예약 페이지",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="min-h-screen bg-cream-50 text-brand-800 antialiased">
        {children}
      </body>
    </html>
  );
}
