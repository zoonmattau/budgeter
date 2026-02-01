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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-bloom-400 to-bloom-600 mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19V6m0 0c-2 0-4 1.5-4 4s2 4 4 4m0-8c2 0 4 1.5 4 4s-2 4-4 4"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 22c-1 0-2-.5-2-1.5S11 19 12 19s2 .5 2 1.5-1 1.5-2 1.5z"
              />
            </svg>
          </div>
          <h1 className="font-display text-3xl font-bold text-gray-900">Seedling</h1>
          <p className="text-gray-500 mt-1">Plant your financial future</p>
        </div>
        {children}
      </div>
    </div>
  )
}
