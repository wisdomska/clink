import "server-only";
import { argon2id, argon2Verify } from "hash-wasm";
import { randomBytes } from "node:crypto";

/** After Dark PIN: argon2id (OWASP params: 19 MiB, 2 iterations, 1 lane). */
export async function hashPin(pin: string): Promise<string> {
  return argon2id({
    password: pin,
    salt: randomBytes(16),
    parallelism: 1,
    iterations: 2,
    memorySize: 19456,
    hashLength: 32,
    outputType: "encoded",
  });
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  try {
    return await argon2Verify({ password: pin, hash });
  } catch {
    return false;
  }
}

export const PIN_MAX_TRIES = 5;
export const PIN_LOCK_MS = 15 * 60 * 1000;
