import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const groups = sqliteTable('groups', {
  groupId: text('group_id').primaryKey(),
  activeTripId: integer('active_trip_id'),
  createdAt: text('created_at').notNull(),
});

export const trips = sqliteTable('trips', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  groupId: text('group_id').notNull(),
  name: text('name').notNull(),
  status: text('status').notNull().default('PLANNING'), // PLANNING | LOCKED | COMPLETED
  lockedStartDate: text('locked_start_date'),
  lockedEndDate: text('locked_end_date'),
  createdByUserId: text('created_by_user_id'),
  createdAt: text('created_at').notNull(),
});

export const tripMembers = sqliteTable('trip_members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tripId: integer('trip_id').notNull(),
  lineUserId: text('line_user_id'), // null for guest members
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  isGuest: integer('is_guest', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
});

export const datePolls = sqliteTable('date_polls', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tripId: integer('trip_id').notNull(),
  startDate: text('start_date').notNull(), // YYYY-MM-DD
  endDate: text('end_date').notNull(),     // YYYY-MM-DD
  durationDays: integer('duration_days').notNull().default(1),
  createdAt: text('created_at').notNull(),
});

export const availabilities = sqliteTable('availabilities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pollId: integer('poll_id').notNull(),
  memberId: integer('member_id').notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  status: text('status').notNull(), // FREE | MAYBE | BUSY
  updatedAt: text('updated_at').notNull(),
});

export const bills = sqliteTable('bills', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tripId: integer('trip_id').notNull(),
  title: text('title').notNull(),
  payerMemberId: integer('payer_member_id').notNull(),
  splitMode: text('split_mode').notNull(), // EQUAL | BASE_ADDON | ITEMIZED | EXACT
  vatPercent: real('vat_percent').notNull().default(0),
  serviceChargePercent: real('service_charge_percent').notNull().default(0),
  discountAmount: real('discount_amount').notNull().default(0),
  totalAmount: real('total_amount').notNull(),
  createdAt: text('created_at').notNull(),
});

export const billItems = sqliteTable('bill_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  billId: integer('bill_id').notNull(),
  name: text('name').notNull(),
  amount: real('amount').notNull(),
  isAddon: integer('is_addon', { mode: 'boolean' }).notNull().default(false),
});

export const billItemShares = sqliteTable('bill_item_shares', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  billItemId: integer('bill_item_id').notNull(),
  memberId: integer('member_id').notNull(),
  exactAmount: real('exact_amount'), // used in EXACT mode
  weight: real('weight').notNull().default(1),
});

export const settlements = sqliteTable('settlements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tripId: integer('trip_id').notNull(),
  fromMemberId: integer('from_member_id').notNull(),
  toMemberId: integer('to_member_id').notNull(),
  amount: real('amount').notNull(),
  status: text('status').notNull().default('PENDING'), // PENDING | WAITING_CONFIRM | CONFIRMED
  updatedAt: text('updated_at').notNull(),
});

export const tripReminders = sqliteTable('trip_reminders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tripId: integer('trip_id').notNull(),
  reminderKey: text('reminder_key').notNull(), // D-3 | D-1 | D-0
  sentAt: text('sent_at').notNull(),
});
