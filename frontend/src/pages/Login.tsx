import LoginForm from '../components/pages/login/LoginForm';

export default function Login() {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex flex-col items-center justify-center mb-2">
          <div className="bg-slate-950 px-10 py-6 rounded-2xl shadow-2xl border border-slate-800 flex items-center justify-center">
            <img 
              src="/logo.webp" 
              alt="Xtreme Mobile Tire" 
              className="h-24 sm:h-32 w-auto object-contain drop-shadow-xl" 
            />
          </div>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <LoginForm />
      </div>
    </div>
  );
}
