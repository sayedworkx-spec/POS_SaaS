import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

type Props = {
  children: React.ReactNode;
};

export default function MainLayout({
  children,
}: Props) {
  return (
    <div className="flex min-h-screen bg-slate-100 print:bg-white">
      <div className="print:hidden">
        <Sidebar />
      </div>

      <div className="flex-1">
        <div className="print:hidden">
          <Navbar />
        </div>

        <main className="p-6 print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}