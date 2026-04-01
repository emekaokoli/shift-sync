import { Button } from '@/components/ui/button';
import { useLogin } from '@/hooks/auth';
import React from 'react';

export function Login() {
  const { login, isPending } = useLogin()

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    login({ email, password })
  };

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">ShiftSync</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              name="email"
              type="email"
              required
              className="w-full px-3 py-2 border rounded-md"
              placeholder="admin@coastaleats.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              name="password"
              type="password"
              required
              className="w-full px-3 py-2 border rounded-md"
              placeholder="password123"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            Sign In
          </Button>
        </form>
        <p className="text-xs text-center text-muted-foreground mt-4">
          Demo: admin@coastaleats.com / password123
        </p>
      </div>
    </div>
  );

}
