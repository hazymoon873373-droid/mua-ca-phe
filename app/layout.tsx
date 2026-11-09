import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mùa Cà Phê | Nhịp giá từ vùng trồng",
  description:
    "Theo dõi giá cà phê Robusta theo vùng, lịch sử và biến động theo tháng. Dữ liệu rõ nguồn, ngày ghi nhận riêng biệt.",
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
