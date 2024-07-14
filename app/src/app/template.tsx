import "../App.css";
import "../index.css";
import { ToastContainer } from "react-toastify";
import { CustomThemeProvider } from "@context/ThemeContext/Provider";
import "react-toastify/dist/ReactToastify.css";

export default function Template({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <CustomThemeProvider>
      <div className="h-full min-w-full max-w-full">{children}</div>
      <ToastContainer />
    </CustomThemeProvider>
  );
}
