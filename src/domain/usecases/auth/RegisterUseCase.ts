import { User } from '../../entities/User';
import { IAuthRepository } from '../../repositories/IAuthRepository';

export class RegisterUseCase {
  constructor(private authRepository: IAuthRepository) {}

  async execute(fullName: string, email: string, password: string): Promise<User> {
    if (!fullName || !email || !password) {
      throw new Error('All fields are required.');
    }
    // simple email validation regex
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      throw new Error('Invalid email format.');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }
    return this.authRepository.register(fullName, email, password);
  }
}
