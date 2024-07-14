import { Inter } from "next/font/google";
import "../App.css";
import "../index.css";
import { ToastContainer } from "react-toastify";
import { CustomThemeProvider } from "@context/ThemeContext/Provider";
import "react-toastify/dist/ReactToastify.css";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
