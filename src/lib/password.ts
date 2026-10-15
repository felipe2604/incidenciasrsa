import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const OPCIONES_SCRYPT = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const HASH_FICTICIO = `scrypt$${"00".repeat(16)}$${"00".repeat(64)}`;

function derivarClave(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, OPCIONES_SCRYPT, (error, clave) => {
      if (error) reject(error);
      else resolve(clave);
    });
  });
}

export async function crearHashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const clave = await derivarClave(password, salt);
  return `scrypt$${salt}$${clave.toString("hex")}`;
}

export async function comprobarPassword(password: string, hash: unknown): Promise<boolean> {
  const valido = typeof hash === "string" && /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(hash);
  const [, salt, esperado] = (valido ? hash as string : HASH_FICTICIO).split("$");
  const clave = await derivarClave(password, salt);
  return timingSafeEqual(clave, Buffer.from(esperado, "hex")) && valido;
}