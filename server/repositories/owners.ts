import { first, pool } from "../database/connection.ts";
import type { User } from "../models/entities.ts";
export async function syncOwner(user: User) {
  await pool.query(
    "INSERT INTO owners VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET quota=excluded.quota WHERE owners.quota<>excluded.quota",
    [user.id, ({ pro: 5e9, plus: 1e9 } as Record<string, number>)[user.plan] || 250e6],
  );
}

export function ownerQuota(owner: string) {
  return first<{ quota: string }>(pool, "SELECT quota FROM owners WHERE id=$1", [owner]);
}
