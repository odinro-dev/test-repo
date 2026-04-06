export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: "admin" | "member" | "viewer";
  createdAt: string;
}

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role?: "admin" | "member" | "viewer";
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UserPublic {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

export function toPublicUser(user: User): UserPublic {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
  };
}
