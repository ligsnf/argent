import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// --- Better Auth (see https://www.better-auth.com/docs/adapters/drizzle) ---

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
      mode: "date",
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
      mode: "date",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

// --- Ledger (double-entry, hierarchical account names) ---

export const ledgerAccountTypeEnum = pgEnum("ledger_account_type", [
  "asset",
  "liability",
  "equity",
  "income",
  "expense",
]);

export const transactionStatusEnum = pgEnum("transaction_status", [
  "unmarked",
  "pending",
  "cleared",
]);

export const ledgerAccount = pgTable(
  "ledger_account",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: ledgerAccountTypeEnum("type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("ledger_account_user_id_name_uidx").on(t.userId, t.name)],
);

export const ledgerTransaction = pgTable(
  "ledger_transaction",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    postedOn: date("posted_on", { mode: "date" }).notNull(),
    description: text("description").notNull(),
    status: transactionStatusEnum("status").notNull().default("unmarked"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("ledger_transaction_user_posted_on_idx").on(t.userId, t.postedOn)],
);

export const ledgerPosting = pgTable(
  "ledger_posting",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => ledgerTransaction.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => ledgerAccount.id, { onDelete: "restrict" }),
    amount: numeric("amount", { precision: 19, scale: 4 }).notNull(),
    commodity: text("commodity").notNull().default("USD"),
    note: text("note"),
  },
  (t) => [
    index("ledger_posting_transaction_id_idx").on(t.transactionId),
    index("ledger_posting_account_id_idx").on(t.accountId),
  ],
);

// --- Relations (optional; enables Better Auth experimental.joins later) ---

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  ledgerAccounts: many(ledgerAccount),
  ledgerTransactions: many(ledgerTransaction),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const ledgerAccountRelations = relations(ledgerAccount, ({ one, many }) => ({
  user: one(user, { fields: [ledgerAccount.userId], references: [user.id] }),
  postings: many(ledgerPosting),
}));

export const ledgerTransactionRelations = relations(ledgerTransaction, ({ one, many }) => ({
  user: one(user, { fields: [ledgerTransaction.userId], references: [user.id] }),
  postings: many(ledgerPosting),
}));

export const ledgerPostingRelations = relations(ledgerPosting, ({ one }) => ({
  transaction: one(ledgerTransaction, {
    fields: [ledgerPosting.transactionId],
    references: [ledgerTransaction.id],
  }),
  account: one(ledgerAccount, {
    fields: [ledgerPosting.accountId],
    references: [ledgerAccount.id],
  }),
}));
