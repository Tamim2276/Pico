import { User } from '../../entities/User';
import { IAuthRepository } from '../../repositories/IAuthRepository';

export class LoginUseCase {
  constructor(private authRepository: IAuthRepository) {}

  async execute(email: string, password: string): Promise<User> {
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }
    return this.authRepository.login(email, password);
  }
}
