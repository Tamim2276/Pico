import { User } from '../entities/User';

export interface IAuthRepository {
  /**
   * Registers a new user and logs them in.
   */
  register(fullName: string, email: string, password: string): Promise<User>;

  /**
   * Logs a user in with their credentials.
   */
  login(email: string, password: string): Promise<User>;

  /**
   * Logs the current user out.
   */
  logout(): Promise<void>;

  /**
   * Retrieves the currently logged-in user session if it exists.
   */
  getCurrentUser(): Promise<User | null>;
}
