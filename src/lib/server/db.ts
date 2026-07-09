import "server-only";

import { Pool } from "pg";

let pool: Pool | null = null;

export function isPostgresConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 4,
    ssl: { rejectUnauthorized: false },
  });

  return pool;
}

function quoteIdentifier(identifier: string) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(identifier)) {
    throw new Error(`Unsafe SQL identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

function normalizeValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  return value;
}

function normalizeRow<T>(row: Record<string, unknown>): T {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, normalizeValue(value)]),
  ) as T;
}

export async function dbQuery<T = Record<string, unknown>>(
  text: string,
  values: unknown[] = [],
) {
  const result = await getPool().query(text, values);
  return result.rows.map((row) => normalizeRow<T>(row));
}

export async function dbQueryOne<T = Record<string, unknown>>(
  text: string,
  values: unknown[] = [],
) {
  const rows = await dbQuery<T>(text, values);
  return rows[0] ?? null;
}

export async function selectRows<T = Record<string, unknown>>(
  table: string,
  orderColumn = "created_at",
  ascending = false,
) {
  return dbQuery<T>(
    `select * from public.${quoteIdentifier(table)} order by ${quoteIdentifier(
      orderColumn,
    )} ${ascending ? "asc" : "desc"}`,
  );
}

export async function insertRow<T = Record<string, unknown>>(
  table: string,
  values: Record<string, unknown>,
) {
  const entries = Object.entries(values).filter(([, value]) => value !== undefined);
  const columns = entries.map(([key]) => quoteIdentifier(key)).join(", ");
  const placeholders = entries.map((_, index) => `$${index + 1}`).join(", ");

  return dbQueryOne<T>(
    `insert into public.${quoteIdentifier(table)} (${columns}) values (${placeholders}) returning *`,
    entries.map(([, value]) => value),
  );
}

export async function upsertRow<T = Record<string, unknown>>(
  table: string,
  values: Record<string, unknown>,
  conflictColumns: string[],
) {
  const entries = Object.entries(values).filter(([, value]) => value !== undefined);
  const columns = entries.map(([key]) => quoteIdentifier(key));
  const placeholders = entries.map((_, index) => `$${index + 1}`);
  const conflicts = conflictColumns.map(quoteIdentifier).join(", ");
  const updates = columns
    .filter((column) => !conflictColumns.map(quoteIdentifier).includes(column))
    .map((column) => `${column} = excluded.${column}`)
    .join(", ");

  return dbQueryOne<T>(
    `insert into public.${quoteIdentifier(table)} (${columns.join(
      ", ",
    )}) values (${placeholders.join(", ")}) on conflict (${conflicts}) do update set ${updates} returning *`,
    entries.map(([, value]) => value),
  );
}

export async function updateRows<T = Record<string, unknown>>(
  table: string,
  values: Record<string, unknown>,
  whereSql: string,
  whereValues: unknown[],
) {
  const entries = Object.entries(values).filter(([, value]) => value !== undefined);
  if (!entries.length) return [];

  const assignments = entries
    .map(([key], index) => `${quoteIdentifier(key)} = $${index + 1}`)
    .join(", ");
  const valuesOnly = entries.map(([, value]) => value);
  const shiftedWhereSql = whereSql.replace(/\$(\d+)/g, (_, index: string) => {
    return `$${Number(index) + entries.length}`;
  });

  return dbQuery<T>(
    `update public.${quoteIdentifier(table)} set ${assignments} where ${shiftedWhereSql} returning *`,
    [...valuesOnly, ...whereValues],
  );
}
