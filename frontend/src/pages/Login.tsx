import { ArrowLeft } from 'lucide-react';
import LoginForm from '../components/pages/login/LoginForm';

export default function Login() {
  const landingUrl =
    import.meta.env.VITE_LANDING_PAGE_URL ||
    (import.meta.env.PROD || (typeof window !== 'undefined' && !window.location.hostname.includes('localhost'))
      ? 'https://xtrememobiletire.com'
      : 'http://localhost:4000');

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center py-4 px-4 sm:px-6 relative">
      {/* Top Back Navigation to Landing Page */}
      <div className="absolute top-3 left-3 sm:top-5 sm:left-5 z-10">
        <a
          href={landingUrl}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-none text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:text-slate-900 hover:border-slate-300 shadow-2xs hover:shadow-xs transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Landing Page</span>
        </a>
      </div>

      <div className="w-full max-w-md flex flex-col items-center">
        {/* Compact Logo with minimal bottom margin */}
        <a href={landingUrl} title="Return to Landing Page" className="inline-block cursor-pointer mb-2">
          <img 
            src="https://res.cloudinary.com/ebjikx52/image/upload/v1792426903/xtreme/frontend/logo-signin_png.png" 
            alt="Xtreme Mobile Tire" 
            className="h-14 sm:h-16 w-auto object-contain drop-shadow-sm hover:scale-105 transition-transform" 
          />
        </a>

        {/* Login Form Card */}
        <div className="w-full">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
