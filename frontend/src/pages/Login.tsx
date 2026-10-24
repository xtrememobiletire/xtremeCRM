import LoginForm from '../components/pages/login/LoginForm';

export default function Login() {
  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center py-6 px-4 sm:px-6 relative">
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Logo — crisp black text on white background */}
        <div className="inline-block mb-5">
          <img 
            src="/logo-black.png" 
            alt="Xtreme Mobile Tire" 
            className="h-20 sm:h-24 w-auto object-contain drop-shadow-sm" 
          />
        </div>

        {/* Login Form Card — Black */}
        <div className="w-full">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
