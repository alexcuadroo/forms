import { first, pool } from "../database/connection.ts";
import type { Database } from "../database/connection.ts";
import type { User } from "../models/entities.ts";
export async function syncOwner(user: Pick<User, 'id' | 'plan'>, db: Database = pool) {
  await db.query(
    "INSERT INTO owners VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET quota=excluded.quota WHERE owners.quota<>excluded.quota",
    [user.id, ({ pro: 5e9, plus: 1e9 } as Record<string, number>)[user.plan] || 250e6],
  );
}

export function ownerQuota(owner: string) {
  return first<{ quota: string }>(pool, "SELECT quota FROM owners WHERE id=$1", [owner]);
}

export function ownerStorage(owner: string) {
  return first<{ used: number }>(pool, "SELECT COALESCE(sum(files.bytes), 0)::float8 AS used FROM files JOIN forms ON forms.id=files.form WHERE forms.owner=$1", [owner]);
}
