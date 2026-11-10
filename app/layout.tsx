import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mùa Cà Phê | Giá Robusta, cảnh báo và công cụ lô hàng",
  description:
    "Theo dõi giá Robusta theo vùng, đặt cảnh báo, tính giá trị lô hàng và lưu sổ mua bán trên thiết bị. Dữ liệu có nguồn và ngày ghi nhận.",
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
