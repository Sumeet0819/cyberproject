import { supabaseClient } from '../config/supabase';
import { z } from 'zod';
import { RegisterSchema, LoginSchema } from '../validations/auth.schema';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'fallback_secret_key';

type RegisterInput = z.infer<typeof RegisterSchema>;
type LoginInput = z.infer<typeof LoginSchema>;

export const authService = {
  async registerUser({ email, password, name }: RegisterInput) {
    // 1. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 2. Insert user into DB
    const { data: user, error } = await supabaseClient
      .from('users')
      .insert([
        { 
          email, 
          password_hash: hashedPassword, 
          name 
        }
      ])
      .select('id, email, name')
      .single();

    if (error) {
      throw error;
    }

    // 3. Generate JWT
    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    return { user, session: { access_token: token } };
  },

  async loginUser({ email, password }: LoginInput) {
    // 1. Find user by email
    const { data: user, error } = await supabaseClient
      .from('users')
      .select('id, email, name, password_hash')
      .eq('email', email)
      .single();

    if (error || !user) {
      throw new Error('Invalid credentials');
    }

    // 2. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // 3. Generate JWT
    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    return { 
      user: { id: user.id, email: user.email, name: user.name }, 
      session: { access_token: token } 
    };
  },

  async getUserProfile(userId: string) {
    const { data: user, error } = await supabaseClient
      .from('users')
      .select('id, email, name')
      .eq('id', userId)
      .single();
    
    if (error) {
      throw error;
    }

    return user;
  }
};
