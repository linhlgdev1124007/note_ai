declare global {
  namespace App { interface Locals { user: { id: string; username: string; displayName: string; role: string; colorCode: string } | null; } }
}
export {};
