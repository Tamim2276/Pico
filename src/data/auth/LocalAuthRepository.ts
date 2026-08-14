import * as SecureStore from 'expo-secure-store';
import { IAuthRepository } from '../../domain/repositories/IAuthRepository';
import { User } from '../../domain/entities/User';

const USERS_KEY = 'PICO_LOCAL_USERS';
const SESSION_KEY = 'PICO_CURRENT_SESSION';

export class LocalAuthRepository implements IAuthRepository {
  private async getUsers(): Promise<any[]> {
    const data = await SecureStore.getItemAsync(USERS_KEY);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private async saveUsers(users: any[]): Promise<void> {
    await SecureStore.setItemAsync(USERS_KEY, JSON.stringify(users));
  }

  async register(fullName: string, email: string, password: string): Promise<User> {
    const users = await this.getUsers();
    
    // Check if user already exists
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('User with this email already exists.');
    }

    const newUser = {
      id: Date.now().toString(),
      fullName,
      email,
      password, // In a real app, hash this! Since this is a local-only dummy auth, plain text is securely stored in SecureStore.
    };

    users.push(newUser);
    await this.saveUsers(users);

    const userEntity: User = { id: newUser.id, fullName: newUser.fullName, email: newUser.email };
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(userEntity));

    return userEntity;
  }

  async login(email: string, password: string): Promise<User> {
    const users = await this.getUsers();
    
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) {
      throw new Error('Invalid email or password.');
    }

    const userEntity: User = { id: user.id, fullName: user.fullName, email: user.email };
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(userEntity));

    return userEntity;
  }

  async logout(): Promise<void> {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  }

  async getCurrentUser(): Promise<User | null> {
    const session = await SecureStore.getItemAsync(SESSION_KEY);
    if (!session) return null;
    try {
      return JSON.parse(session) as User;
    } catch {
      return null;
    }
  }
}
