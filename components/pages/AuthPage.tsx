import React from 'react';
import { motion } from 'motion/react';
import { UserRole } from '../../types';

interface AuthPageProps {
  authMode: 'login' | 'register';
  authError: string;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onToggleMode: () => void;
}

export default function AuthPage({ authMode, authError, onSubmit, onToggleMode }: AuthPageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-[1000px] mx-auto py-8 flex flex-col md:flex-row items-center gap-8 lg:gap-16"
    >
      <div className="flex-1 text-center md:text-left">
        <h2 className="text-6xl font-black text-primary mb-6 tracking-tighter">SmartAgriCraft</h2>
        <p className="text-2xl font-medium text-gray-700 leading-tight">
          Connect with local farmers and artisans in Oriental Mindoro. Authentically local.
        </p>
      </div>

      <div className="w-full max-w-[400px]">
        <div className="bg-white p-6 rounded-xl shadow-2xl border border-gray-100 max-h-[75vh] overflow-y-auto">
          <form onSubmit={onSubmit} className="space-y-4">
            {authMode === 'register' && (
              <>
                <input
                  name="fullName"
                  required
                  placeholder="Full Name"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
                <input
                  name="username"
                  required
                  placeholder="Username"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
                <div className="space-y-2 px-1">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Select your role
                  </p>
                  <div className="flex gap-2">
                    {['buyer', 'farmer', 'artisan'].map((r) => (
                      <label key={r} className="flex-1 cursor-pointer">
                        <input
                          type="radio"
                          name="role"
                          value={r}
                          required
                          defaultChecked={r === 'buyer'}
                          className="peer hidden"
                        />
                        <div className="text-center py-2 border rounded-lg text-xs font-bold capitalize bg-white peer-checked:bg-primary peer-checked:text-white peer-checked:border-primary transition-all text-gray-600">
                          {r}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
            <input
              name="email"
              type={authMode === 'login' ? 'text' : 'email'}
              required
              placeholder={authMode === 'login' ? 'Email or Username' : 'Email Address'}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
            <input
              name="password"
              type="password"
              required
              placeholder="Password"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />

            {authError && (
              <p className="text-red-500 text-xs font-bold pl-1">{authError}</p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary/95 transition-all font-bold text-lg"
            >
              {authMode === 'login' ? 'Log In' : 'Sign Up'}
            </button>

            <div className="text-center py-2">
              <button type="button" className="text-primary text-sm font-medium hover:underline">
                Forgotten password?
              </button>
            </div>

            <div className="border-t border-gray-200 my-4"></div>

            <div className="text-center">
              <button
                type="button"
                onClick={onToggleMode}
                className="bg-secondary/80 hover:bg-secondary text-white px-6 py-3 rounded-lg font-bold transition-all text-sm"
              >
                {authMode === 'login' ? 'Create New Account' : 'Back to Login'}
              </button>
            </div>
          </form>
        </div>
        <p className="text-center text-sm mt-6 text-gray-600">
          <span className="font-bold">Create a Page</span> for a celebrity, brand or business.
        </p>
      </div>
    </motion.div>
  );
}
