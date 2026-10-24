import LoginForm from '../components/pages/login/LoginForm';

export default function Login() {
  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center py-8 px-4 sm:px-6 relative">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  );
}
