type Props = {
  children: React.ReactNode;
};

function AuthLayout({ children }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      {children}
    </div>
  );
}

export default AuthLayout;