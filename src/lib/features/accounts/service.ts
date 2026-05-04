import bcrypt from "bcryptjs";
import { db } from "@/lib/core/db";
import { ConflictError, NotFoundError, AppError } from "@/lib/core/errors";
import { generateUsername, generatePassword, UsernamePattern, PasswordOptions } from "@/lib/shared/generators";

async function getActiveDomains(): Promise<string[]> {
  const domains = await db.domain.findMany({
    where: { isActive: true },
    select: { domain: true },
    orderBy: { createdAt: "asc" },
  });
  if (domains.length === 0) {
    throw new AppError("No active domains configured. Add a domain in Settings → Domains.", 503, "NO_DOMAINS");
  }
  return domains.map((d) => d.domain);
}

function pickDomain(domains: string[]): string {
  return domains[Math.floor(Math.random() * domains.length)];
}

async function resolveUniqueUsername(pattern: UsernamePattern): Promise<string> {
  for (let i = 0; i < 15; i++) {
    const candidate = generateUsername(pattern);
    const exists = await db.tempAccount.findUnique({ where: { username: candidate } });
    if (!exists) return candidate;
  }
  throw new Error("Could not generate a unique username after 15 attempts");
}

export interface CreateAccountInput {
  username?: string;
  customPassword?: string;
  displayName?: string;
  ttlHours?: number;
  label?: string;
  notes?: string;
  usernamePattern?: UsernamePattern;
  domain?: string;
}

export async function createAccount(input: CreateAccountInput) {
  const {
    username: rawUsername,
    customPassword,
    displayName,
    ttlHours = 24,
    label,
    notes,
    usernamePattern = "random_word",
    domain: preferredDomain,
  } = input;

  const username = rawUsername ?? (await resolveUniqueUsername(usernamePattern));

  const existing = await db.tempAccount.findUnique({ where: { username } });
  if (existing) throw new ConflictError(`Username "${username}" is already taken`);

  let domain = preferredDomain;
  if (!domain) {
    const domains = await getActiveDomains();
    domain = pickDomain(domains);
  }

  const plainPassword = customPassword ?? generatePassword();
  const passwordHash = await bcrypt.hash(plainPassword, 12);
  const email = `${username}@${domain}`;
  const expiresAt = ttlHours > 0 ? new Date(Date.now() + ttlHours * 3600 * 1000) : null;

  const account = await db.tempAccount.create({
    data: { username, email, passwordHash, displayName, label, notes, ttlHours, expiresAt },
  });

  return { account, plainPassword };
}

export async function getAccountById(id: string) {
  const account = await db.tempAccount.findFirst({
    where: { id, deletedAt: null },
  });
  if (!account) throw new NotFoundError("Account");
  return account;
}

export async function updateAccount(
  id: string,
  data: {
    displayName?: string | null;
    label?: string | null;
    notes?: string | null;
    ttlHours?: number;
    isActive?: boolean;
  }
) {
  await getAccountById(id);

  const updateData: Record<string, unknown> = { ...data };
  if (data.ttlHours !== undefined) {
    updateData.expiresAt =
      data.ttlHours > 0 ? new Date(Date.now() + data.ttlHours * 3600 * 1000) : null;
  }

  return db.tempAccount.update({ where: { id }, data: updateData });
}

export async function softDeleteAccount(id: string): Promise<void> {
  await getAccountById(id);
  await db.tempAccount.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
}

export async function resetAccountPassword(id: string) {
  await getAccountById(id);
  const plainPassword = generatePassword();
  const passwordHash = await bcrypt.hash(plainPassword, 12);
  const account = await db.tempAccount.update({
    where: { id },
    data: { passwordHash },
  });
  return { account, plainPassword };
}

export async function bulkCreateAccounts(
  count: number,
  opts: {
    ttlHours?: number;
    label?: string;
    usernamePattern?: UsernamePattern;
    passwordOptions?: PasswordOptions;
    domain?: string;
  }
) {
  const results: Array<{ account: Awaited<ReturnType<typeof db.tempAccount.create>>; plainPassword: string }> = [];
  const failures: Array<{ index: number; reason: string }> = [];

  for (let i = 0; i < count; i++) {
    try {
      const { account, plainPassword } = await createAccount({
        ttlHours: opts.ttlHours,
        label: opts.label,
        usernamePattern: opts.usernamePattern,
        customPassword: opts.passwordOptions ? generatePassword(opts.passwordOptions) : undefined,
        domain: opts.domain,
      });
      results.push({ account, plainPassword });
    } catch (e) {
      failures.push({ index: i, reason: e instanceof Error ? e.message : "unknown error" });
    }
  }

  return { results, failures };
}
