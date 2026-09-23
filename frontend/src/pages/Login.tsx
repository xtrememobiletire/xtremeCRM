import LoginForm from '../components/pages/login/LoginForm';

export default function Login() {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex flex-col items-center justify-center mb-4">
          <img 
            src="/logo-signin.png" 
            alt="Xtreme Mobile Tire" 
            className="h-28 sm:h-36 w-auto object-contain drop-shadow-md hover:scale-105 transition-transform" 
          />
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <LoginForm />
      </div>
    </div>
  );
}
