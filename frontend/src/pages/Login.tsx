import LoginForm from '../components/pages/login/LoginForm';

export default function Login() {
  return (
    <div className="min-h-screen bg-black flex flex-col justify-center items-center py-4 px-4 sm:px-6 relative">
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Logo — larger on black background */}
        <div className="inline-block mb-4">
          <img 
            src="https://res.cloudinary.com/ebjikx52/image/upload/v1792426903/xtreme/frontend/logo-signin_png.png" 
            alt="Xtreme Mobile Tire" 
            className="h-20 sm:h-24 w-auto object-contain drop-shadow-md" 
          />
        </div>

        {/* Login Form Card */}
        <div className="w-full">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
