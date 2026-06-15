import { useAuth } from '../../context/AuthContext';

export default function Navbar({ title }) {
  const { user } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">Bienvenido, {user?.name}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white">
          {user?.name?.charAt(0)}
        </div>
      </div>
    </header>
  );
}
