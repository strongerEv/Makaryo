/**
 * Menggabungkan seluruh berkas di supabase/migrations/ menjadi satu berkas setup
 * yang aman dijalankan berulang kali (idempoten), lalu menuliskannya ke
 * supabase/setup-lengkap.sql.
 *
 * Jalankan dengan: node scripts/build-setup-sql.mjs
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const MIGRATIONS_DIR = "supabase/migrations";
const OUTPUT = "supabase/setup-lengkap.sql";

/** Memecah SQL menjadi pernyataan, dengan menghormati string dan blok $$…$$. */
function splitStatements(sql) {
  const statements = [];
  let current = "";
  let index = 0;

  while (index < sql.length) {
    const rest = sql.slice(index);

    const lineComment = rest.match(/^--[^\n]*/);
    if (lineComment) {
      current += lineComment[0];
      index += lineComment[0].length;
      continue;
    }

    const dollarTag = rest.match(/^\$[A-Za-z_]*\$/);
    if (dollarTag) {
      const tag = dollarTag[0];
      const end = sql.indexOf(tag, index + tag.length);
      const stop = end === -1 ? sql.length : end + tag.length;
      current += sql.slice(index, stop);
      index = stop;
      continue;
    }

    if (rest[0] === "'") {
      const end = sql.indexOf("'", index + 1);
      const stop = end === -1 ? sql.length : end + 1;
      current += sql.slice(index, stop);
      index = stop;
      continue;
    }

    if (rest[0] === ";") {
      statements.push(current + ";");
      current = "";
      index += 1;
      continue;
    }

    current += rest[0];
    index += 1;
  }

  if (current.trim()) statements.push(current);
  return statements;
}

/** Memisahkan komentar pembuka dari badan pernyataan. */
function splitLeadingComments(statement) {
  const lines = statement.split("\n");
  const comments = [];

  while (lines.length > 0 && (lines[0].trim().startsWith("--") || lines[0].trim() === "")) {
    comments.push(lines.shift());
  }

  return { comments: comments.join("\n"), body: lines.join("\n").trim() };
}

function makeIdempotent(body) {
  // Enum: abaikan bila tipenya sudah ada.
  if (/^create type\s/i.test(body)) {
    return `do $guard$ begin\n  ${body.replace(/;\s*$/, ";")}\nexception when duplicate_object then null;\nend $guard$;`;
  }

  if (/^create table\s+(?!if not exists)/i.test(body)) {
    return body.replace(/^create table\s+/i, "create table if not exists ");
  }

  if (/^create (unique )?index\s+(?!if not exists)/i.test(body)) {
    return body.replace(/^create (unique )?index\s+/i, (match) => `${match.trimEnd()} if not exists `);
  }

  const policy = body.match(/^create policy\s+("(?:[^"]+)"|\S+)\s+on\s+([\w.]+)/i);
  if (policy) {
    return `drop policy if exists ${policy[1]} on ${policy[2]};\n\n${body}`;
  }

  const trigger = body.match(/^create trigger\s+(\S+)[\s\S]*?\son\s+([\w.]+)/i);
  if (trigger) {
    return `drop trigger if exists ${trigger[1]} on ${trigger[2]};\n\n${body}`;
  }

  const constraint = body.match(/^alter table\s+([\w.]+)\s+add constraint\s+(\S+)/i);
  if (constraint) {
    return `alter table ${constraint[1]} drop constraint if exists ${constraint[2]};\n\n${body}`;
  }

  return body;
}

const header = `-- =====================================================================
-- Makaryo — setup database sekali jalan
--
-- Gabungan seluruh berkas di supabase/migrations/ dalam urutan yang benar.
-- Salin SELURUH isi berkas ini, tempel ke Supabase SQL Editor, lalu klik Run.
--
-- Berkas ini AMAN dijalankan berulang kali: bagian yang sudah ada dilewati,
-- bagian yang belum ada dibuatkan. Jadi bila sebelumnya gagal di tengah jalan,
-- cukup jalankan ulang berkas ini.
--
-- Dihasilkan oleh scripts/build-setup-sql.mjs — jangan diubah manual.
-- =====================================================================

`;

const footer = `
-- =====================================================================
-- Selesai. Yang seharusnya terbentuk:
--   • 12 tabel (profiles, shifts, app_settings, attendances, schedule_periods,
--     schedule_assignments, leave_requests, revenue_reports, audit_logs,
--     push_subscriptions, notifications, notification_deliveries)
--   • 3 shift bawaan pukul 06.00-21.00 di tabel shifts
--   • 3 bucket Storage privat: avatars, attendance, revenue
--
-- Langkah berikutnya: daftar lewat halaman /daftar aplikasi, lalu jadikan
-- akun itu admin dengan menjalankan perintah berikut (ganti emailnya):
--
--   update public.profiles
--   set role = 'admin', account_status = 'active'
--   where email = 'email-kamu@contoh.com';
-- =====================================================================
`;

const files = readdirSync(MIGRATIONS_DIR).filter((file) => file.endsWith(".sql")).sort();
const chunks = [header];

for (const file of files) {
  const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
  const transformed = splitStatements(sql)
    .map((statement) => {
      const { comments, body } = splitLeadingComments(statement);
      if (!body) return comments;
      return [comments, makeIdempotent(body)].filter(Boolean).join("\n");
    })
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  chunks.push(
    `-- ---------------------------------------------------------------------\n` +
      `-- ${basename(file)}\n` +
      `-- ---------------------------------------------------------------------\n\n${transformed}\n\n`,
  );
}

chunks.push(footer);
writeFileSync(OUTPUT, chunks.join(""));
console.log(`${OUTPUT} ditulis dari ${files.length} migrasi.`);
