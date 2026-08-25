"use client";

import { FileSpreadsheet, FileText } from "lucide-react";
import { useState } from "react";

import { buttonClass } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import type { Profile } from "@/lib/types/database";
import { currentMonth, recentMonths } from "@/lib/utils/period";

/** Filter periode & host, lalu unduh dalam dua format dari route handler yang sama. */
export function ExportPanel({ endpoint, hosts }: { endpoint: string; hosts: Profile[] }) {
  const [month, setMonth] = useState(currentMonth());
  const [hostId, setHostId] = useState("all");

  const hrefFor = (format: "pdf" | "xlsx") =>
    `${endpoint}?format=${format}&bulan=${month}&host=${hostId}`;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Periode" htmlFor={`${endpoint}-bulan`}>
          <Select
            id={`${endpoint}-bulan`}
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          >
            {recentMonths().map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Host" htmlFor={`${endpoint}-host`}>
          <Select
            id={`${endpoint}-host`}
            value={hostId}
            onChange={(event) => setHostId(event.target.value)}
          >
            <option value="all">Semua host</option>
            {hosts.map((host) => (
              <option key={host.id} value={host.id}>
                {host.full_name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="flex flex-wrap gap-2">
        <a href={hrefFor("pdf")} className={buttonClass({ variant: "outline" })} download>
          <FileText className="size-4" aria-hidden />
          Unduh PDF
        </a>
        <a href={hrefFor("xlsx")} className={buttonClass()} download>
          <FileSpreadsheet className="size-4" aria-hidden />
          Unduh Excel
        </a>
      </div>
    </div>
  );
}
