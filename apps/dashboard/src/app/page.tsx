export default function HomePage() {
  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      <div className='container mx-auto px-4 py-16'>
        <div className='text-center'>
          <h1 className='text-6xl font-bold text-gray-900 mb-4'>
            Task Master
            <span className='text-blue-600'> Dashboard</span>
          </h1>
          <p className='text-xl text-gray-600 mb-8 max-w-2xl mx-auto'>
            Centralized web dashboard for managing tasks across all your Task
            Master projects. Get real-time insights, collaborate with your team,
            and streamline your development workflow.
          </p>
          <div className='bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto'>
            <h2 className='text-2xl font-semibold text-gray-800 mb-4'>
              🚀 Coming Soon
            </h2>
            <div className='space-y-3 text-left'>
              <div className='flex items-center'>
                <span className='text-green-500 mr-2'>✅</span>
                <span>Multi-project management</span>
              </div>
              <div className='flex items-center'>
                <span className='text-green-500 mr-2'>✅</span>
                <span>Git integration & sync</span>
              </div>
              <div className='flex items-center'>
                <span className='text-green-500 mr-2'>✅</span>
                <span>Real-time collaboration</span>
              </div>
              <div className='flex items-center'>
                <span className='text-green-500 mr-2'>✅</span>
                <span>Analytics & insights</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
