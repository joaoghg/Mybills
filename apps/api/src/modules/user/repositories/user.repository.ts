import { CreateUserData } from '../contracts/create-user-data.contract';
import { UpdateUserData } from '../contracts/update-user-data.contract';
import { User } from '../entities/user.entity';

export interface UserRepository {
  findAll(): Promise<User[]>;
  findById(userId: string): Promise<User | null>;
  updateRefreshToken(userId: string, refreshToken: string | null): Promise<void>;
  findByEmail(email: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
  update(userId: string, data: UpdateUserData): Promise<User>;
  delete(userId: string): Promise<void>;
}
