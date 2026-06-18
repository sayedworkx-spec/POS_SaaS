import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";

export type JwtUserPayload = {
  sub: number;
  email: string;
  role: string;
  name: string;
};

const signOptions: SignOptions = {
  expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
};

export function signToken(payload: JwtUserPayload) {
  return jwt.sign({ ...payload }, env.JWT_SECRET, signOptions);
}

export function verifyToken(token: string): JwtUserPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);

  if (typeof decoded === "string") {
    throw new Error("Invalid token payload");
  }

  return {
    sub: Number(decoded.sub ?? 0),
    email: String(decoded.email ?? ""),
    role: String(decoded.role ?? ""),
    name: String(decoded.name ?? ""),
  };
}