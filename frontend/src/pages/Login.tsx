import LoginForm from '../components/pages/login/LoginForm';

export default function Login() {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex flex-col items-center justify-center">
          <div className="bg-slate-950 px-8 py-4 rounded-2xl shadow-xl border border-slate-800 flex items-center justify-center">
            <img 
              src="/logo.webp" 
              alt="Xtreme Mobile Tire" 
              className="h-16 sm:h-20 w-auto object-contain drop-shadow" 
            />
          </div>
          <h2 className="mt-4 text-center text-2xl font-black tracking-tight text-slate-900">
            Xtreme<span className="text-red-600">CRM</span>
          </h2>
          <p className="mt-1 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Roadside Mobile Tire Dispatch & Telematics
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <LoginForm />
      </div>
    </div>
  );
}
