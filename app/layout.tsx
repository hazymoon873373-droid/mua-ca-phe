import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mùa Cà Phê | Theo dõi, cảnh báo và kiểm định dự báo Robusta",
  description:
    "Theo dõi giá Robusta, cảnh báo biến động và đối chiếu mô hình Prophet/XGBoost với dữ liệu thực tế. Nguồn và giới hạn dự báo được trình bày rõ.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}
