import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../../domain/entities/User';
import { LocalAuthRepository } from '../../data/auth/LocalAuthRepository';
import { LoginUseCase } from '../../domain/usecases/auth/LoginUseCase';
import { RegisterUseCase } from '../../domain/usecases/auth/RegisterUseCase';
import { LogoutUseCase } from '../../domain/usecases/auth/LogoutUseCase';
import { GetCurrentUserUseCase } from '../../domain/usecases/auth/GetCurrentUserUseCase';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Instantiate dependencies once
const authRepo = new LocalAuthRepository();
const loginUseCase = new LoginUseCase(authRepo);
const registerUseCase = new RegisterUseCase(authRepo);
const logoutUseCase = new LogoutUseCase(authRepo);
const getCurrentUserUseCase = new GetCurrentUserUseCase(authRepo);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const currentUser = await getCurrentUserUseCase.execute();
        setUser(currentUser);
      } catch (error) {
        console.error("Failed to load session", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSession();
  }, []);

  const login = async (email: string, password: string) => {
    const loggedInUser = await loginUseCase.execute(email, password);
    setUser(loggedInUser);
  };

  const register = async (fullName: string, email: string, password: string) => {
    const newUser = await registerUseCase.execute(fullName, email, password);
    setUser(newUser);
  };

  const logout = async () => {
    await logoutUseCase.execute();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
