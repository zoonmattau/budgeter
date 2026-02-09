export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/Seedling.png" alt="Seedling" width={64} height={64} className="w-16 h-16 mx-auto mb-4" />
          <h1 className="font-display text-3xl font-bold text-gray-900">Seedling</h1>
          <p className="text-gray-500 mt-1">Plant your financial future</p>
        </div>
        {children}
      </div>
    </div>
  )
}
