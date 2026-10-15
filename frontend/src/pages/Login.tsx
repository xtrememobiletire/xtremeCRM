import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import LoginForm from '../components/pages/login/LoginForm';

export default function Login() {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
      {/* Top Back Navigation to Landing Page */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:text-slate-900 hover:border-slate-300 shadow-2xs hover:shadow-xs transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Landing Page</span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex flex-col items-center justify-center mb-4">
          <Link to="/" title="Return to Landing Page" className="inline-block cursor-pointer">
            <img 
              src="/logo-signin.png" 
              alt="Xtreme Mobile Tire" 
              className="h-28 sm:h-36 w-auto object-contain drop-shadow-md hover:scale-105 transition-transform" 
            />
          </Link>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <LoginForm />
      </div>
    </div>
  );
}
