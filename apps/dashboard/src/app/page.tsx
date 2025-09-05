'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  ChartBarIcon,
  SparklesIcon,
  UsersIcon,
  DocumentChartBarIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  PlayIcon,
  EyeIcon,
  ArrowRightIcon,
  CpuChipIcon,
  CloudIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [showDemo, setShowDemo] = useState(false);

  // Don't auto-redirect, let user choose to go to dashboard

  const handleLogin = () => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    } else {
      router.push('/auth/signin');
    }
  };

  const handleViewDemo = () => {
    setShowDemo(true);
    setTimeout(() => {
      router.push('/analytics/enhanced');
    }, 500);
  };

  const features = [
    {
      icon: SparklesIcon,
      title: 'AI-Powered Analytics',
      description: 'Advanced analytics with machine learning insights and predictive forecasting',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      icon: ChartBarIcon,
      title: 'Interactive Charts',
      description: 'Real-time dashboards with zoom, pan, fullscreen, and export capabilities',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: UsersIcon,
      title: 'Team Performance',
      description: 'Advanced team comparison with individual metrics and collaboration scoring',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      icon: DocumentChartBarIcon,
      title: 'Project Comparison',
      description: 'Multi-project overlay analysis with burndown charts and risk assessment',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      icon: ArrowTrendingUpIcon,
      title: 'Velocity Tracking',
      description: 'Historical velocity trends with predictive modeling and trend analysis',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      icon: CpuChipIcon,
      title: 'Smart Insights',
      description: 'Automated recommendations and intelligent performance optimization',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  const stats = [
    { label: 'Projects Analyzed', value: '10K+' },
    { label: 'Tasks Tracked', value: '500K+' },
    { label: 'Teams Using', value: '2.5K+' },
    { label: 'Uptime', value: '99.9%' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Navigation */}
      <nav className="relative z-10 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Task Master</span>
              <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                Enhanced Analytics
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleViewDemo}
                disabled={showDemo}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50"
              >
                <EyeIcon className="w-4 h-4 mr-2" />
                {showDemo ? 'Loading Demo...' : 'View Demo'}
              </button>
              <button
                onClick={handleLogin}
                className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
              >
                {status === 'authenticated' ? 'Dashboard' : 'Sign In'}
                <ArrowRightIcon className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full text-sm font-medium text-gray-700 mb-8 border border-gray-200">
              <SparklesIcon className="w-4 h-4 mr-2 text-purple-600" />
              Now with Enhanced AI-Powered Analytics
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-extrabold text-gray-900 mb-6">
              Task Management
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent block">
                Powered by AI
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
              Transform your project management with advanced analytics, real-time insights, 
              and AI-powered predictions that help teams deliver faster and smarter.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <button
                onClick={handleLogin}
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {status === 'authenticated' ? 'Go to Dashboard' : 'Get Started Free'}
                <ArrowRightIcon className="w-5 h-5 ml-3" />
              </button>
              
              <button
                onClick={handleViewDemo}
                disabled={showDemo}
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-gray-700 bg-white hover:bg-gray-50 rounded-xl disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl border border-gray-200"
              >
                {showDemo ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-400 border-t-transparent mr-3"></div>
                    Loading Demo...
                  </>
                ) : (
                  <>
                    <PlayIcon className="w-5 h-5 mr-3" />
                    View Live Demo
                  </>
                )}
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm lg:text-base text-gray-600">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-gradient-to-tr from-green-400/20 to-blue-400/20 blur-3xl"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Enhanced Analytics Features
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Discover powerful insights with our latest AI-driven analytics suite
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative p-6 bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-200"
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${feature.bgColor} mb-4`}>
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Workflow?
          </h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Join thousands of teams already using Task Master to deliver projects faster with AI-powered insights.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleLogin}
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-blue-600 bg-white hover:bg-gray-50 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Start Free Trial
              <CheckCircleIcon className="w-5 h-5 ml-3" />
            </button>
            
            <button
              onClick={handleViewDemo}
              disabled={showDemo}
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white border-2 border-white/30 hover:bg-white/10 rounded-xl disabled:opacity-50 transition-all duration-200"
            >
              {showDemo ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                  Loading Demo...
                </>
              ) : (
                <>
                  Explore Analytics Demo
                  <EyeIcon className="w-5 h-5 ml-3" />
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <ChartBarIcon className="h-6 w-6 text-blue-400" />
              <span className="ml-2 text-lg font-semibold">Task Master</span>
              <span className="ml-2 text-sm text-gray-400">Enhanced Analytics</span>
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-gray-400">
              <div className="flex items-center">
                <CloudIcon className="w-4 h-4 mr-1" />
                Cloud Hosted
              </div>
              <div className="flex items-center">
                <ShieldCheckIcon className="w-4 h-4 mr-1" />
                Enterprise Ready
              </div>
              <div className="flex items-center">
                <SparklesIcon className="w-4 h-4 mr-1" />
                AI Powered
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}