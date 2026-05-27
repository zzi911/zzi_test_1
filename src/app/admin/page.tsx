"use client";

/**
 * /admin — 사장님 예약 관리 페이지
 *
 * 비밀번호 보호:
 *  - AdminGate 컴포넌트로 감싸 NEXT_PUBLIC_ADMIN_PASSWORD 일치 시 접근 허용.
 *  - 통과 후 sessionStorage 에 플래그를 저장하며, 헤더의 [로그아웃] 클릭 시 클리어.
 *  - ⚠️ 학습용 단순 보호. 자세한 보안 한계는 components/AdminGate.tsx 상단 주석 참고.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  supabase,
  type ReservationRow,
  type ReservationStatus,
} from "@/lib/supabaseClient";
import { todayISO } from "@/lib/format";
import AdminGate from "@/components/AdminGate";

type TabKey = "all" | ReservationStatus;

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const TAB_LABELS: Record<TabKey, string> = {
  all: "전체",
  pending: "대기중",
  confirmed: "확정",
  cancelled: "취소",
};

const STATUS_META: Record<
  ReservationStatus,
  { label: string; badge: string }
> = {
  pending: {
    label: "대기중",
    badge: "bg-gray-200 text-gray-700",
  },
  confirmed: {
    label: "확정",
    badge: "bg-green-100 text-green-700",
  },
  cancelled: {
    label: "취소",
    badge: "bg-red-100 text-red-700",
  },
};

function formatTodayHeader(d: Date): string {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${
    WEEKDAYS[d.getDay()]
  })`;
}

function formatTimeHHmm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const last4 = digits.slice(-4) || "****";
  return `***-***-${last4}`;
}

function dayRange(dateStr: string): { from: string; to: string } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
  return { from: start.toISOString(), to: end.toISOString() };
}

export default function AdminPage() {
  return <AdminGate>{(logout) => <AdminDashboard onLogout={logout} />}</AdminGate>;
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [selectedDate, setSelectedDate] = useState<string>(() => todayISO());
  const [statusTab, setStatusTab] = useState<TabKey>("all");
  const [rows, setRows] = useState<ReservationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchRows = useCallback(async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const { from, to } = dayRange(date);
      const { data, error: queryError } = await supabase
        .from("reservations")
        .select("*")
        .gte("reserved_at", from)
        .lt("reserved_at", to)
        .order("reserved_at", { ascending: true });
      if (queryError) throw queryError;
      setRows((data as ReservationRow[]) ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "예약 정보를 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // 날짜 변경 시 재조회
  useEffect(() => {
    fetchRows(selectedDate);
  }, [selectedDate, fetchRows]);

  // Realtime 구독 - 선택된 날짜에 해당하는 변경만 반영
  useEffect(() => {
    const { from, to } = dayRange(selectedDate);
    const channel = supabase
      .channel(`admin-reservations-${selectedDate}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reservations" },
        (payload) => {
          const row = payload.new as ReservationRow;
          if (row.reserved_at >= from && row.reserved_at < to) {
            fetchRows(selectedDate);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "reservations" },
        (payload) => {
          const next = payload.new as ReservationRow;
          const prev = payload.old as Partial<ReservationRow>;
          const inRange = (t?: string) =>
            !!t && t >= from && t < to;
          if (inRange(next.reserved_at) || inRange(prev.reserved_at)) {
            fetchRows(selectedDate);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate, fetchRows]);

  const counts = useMemo(() => {
    const c = { all: rows.length, pending: 0, confirmed: 0, cancelled: 0 };
    for (const r of rows) c[r.status]++;
    return c;
  }, [rows]);

  const totalParty = useMemo(
    () => rows.reduce((sum, r) => sum + (r.party_size ?? 0), 0),
    [rows]
  );

  const filtered = useMemo(() => {
    if (statusTab === "all") return rows;
    return rows.filter((r) => r.status === statusTab);
  }, [rows, statusTab]);

  const updateStatus = async (id: string, status: ReservationStatus) => {
    setUpdatingId(id);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("reservations")
        .update({ status })
        .eq("id", id);
      if (updateError) throw updateError;
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "상태 변경에 실패했습니다."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirm = (id: string) => updateStatus(id, "confirmed");
  const handleCancel = (id: string) => {
    if (typeof window === "undefined") return;
    if (window.confirm("정말 취소하시겠습니까?")) {
      updateStatus(id, "cancelled");
    }
  };

  const todayDate = useMemo(() => new Date(), []);
  const tabKeys: TabKey[] = ["all", "pending", "confirmed", "cancelled"];

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      {/* 헤더 */}
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-brand-400">
            Hohak Admin
          </p>
          <h1 className="mt-1 text-2xl font-bold text-brand-800 sm:text-3xl">
            호학식당 예약 관리
          </h1>
        </div>
        <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
          <p className="text-sm font-medium text-brand-500">
            오늘 · {formatTodayHeader(todayDate)}
          </p>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-600 transition hover:bg-cream-100"
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* 필터 영역 */}
      <section className="mb-5 rounded-2xl bg-white p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="w-full lg:max-w-xs">
            <label htmlFor="filter-date" className="field-label">
              날짜 선택
            </label>
            <input
              id="filter-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="field-input"
            />
          </div>

          <div
            role="tablist"
            aria-label="상태 필터"
            className="flex flex-wrap gap-2"
          >
            {tabKeys.map((key) => {
              const active = statusTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setStatusTab(key)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-brand-500 text-cream-50 shadow-card"
                      : "bg-cream-100 text-brand-600 hover:bg-cream-200"
                  }`}
                >
                  <span>{TAB_LABELS[key]}</span>
                  <span
                    className={`inline-flex min-w-[1.5rem] justify-center rounded-full px-1.5 py-0.5 text-xs ${
                      active
                        ? "bg-cream-50/20 text-cream-50"
                        : "bg-white text-brand-500"
                    }`}
                  >
                    {counts[key]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 요약 카드 */}
      <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard label="총 예약 건수" value={`${rows.length}건`} />
        <SummaryCard label="총 인원 수" value={`${totalParty}명`} />
        <SummaryCard
          label="대기중"
          value={`${counts.pending}건`}
          accent
        />
      </section>

      {/* 에러 */}
      {error ? (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      {/* 예약 목록 */}
      <section className="rounded-2xl bg-white shadow-card">
        {loading ? (
          <p className="px-6 py-12 text-center text-sm text-brand-400">
            불러오는 중...
          </p>
        ) : filtered.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-brand-500">
            {rows.length === 0
              ? "선택한 날짜에 예약이 없습니다."
              : "이 상태에 해당하는 예약이 없습니다."}
          </p>
        ) : (
          <ul className="divide-y divide-cream-100">
            {filtered.map((row) => (
              <ReservationItem
                key={row.id}
                row={row}
                updating={updatingId === row.id}
                onConfirm={() => handleConfirm(row.id)}
                onCancel={() => handleCancel(row.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-5 shadow-card ${
        accent ? "bg-brand-500 text-cream-50" : "bg-white"
      }`}
    >
      <p
        className={`text-xs font-medium ${
          accent ? "text-cream-100" : "text-brand-400"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-1.5 text-2xl font-bold ${
          accent ? "text-cream-50" : "text-brand-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ReservationItem({
  row,
  updating,
  onConfirm,
  onCancel,
}: {
  row: ReservationRow;
  updating: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const meta = STATUS_META[row.status];
  return (
    <li className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-[88px_1fr_auto] sm:items-center sm:gap-5 sm:px-6">
      <div className="text-2xl font-bold tracking-tight text-brand-700">
        {formatTimeHHmm(row.reserved_at)}
      </div>

      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-base font-semibold text-brand-800">
            {row.name}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${meta.badge}`}
          >
            {meta.label}
          </span>
          <span className="text-sm text-brand-500">
            {maskPhone(row.phone)}
          </span>
          <span className="text-sm text-brand-500">·</span>
          <span className="text-sm font-medium text-brand-600">
            {row.party_size}명
          </span>
        </div>
        {row.note ? (
          <p className="text-sm leading-relaxed text-brand-500">
            <span className="mr-1 text-brand-400">비고</span>
            {row.note}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap justify-start gap-2 sm:justify-end">
        {row.status === "pending" ? (
          <>
            <button
              type="button"
              disabled={updating}
              onClick={onConfirm}
              className="rounded-lg bg-green-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              확정
            </button>
            <button
              type="button"
              disabled={updating}
              onClick={onCancel}
              className="rounded-lg border border-red-300 bg-white px-3.5 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              취소
            </button>
          </>
        ) : null}
        {row.status === "confirmed" ? (
          <button
            type="button"
            disabled={updating}
            onClick={onCancel}
            className="rounded-lg border border-red-300 bg-white px-3.5 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            취소
          </button>
        ) : null}
        {row.status === "cancelled" ? (
          <span className="text-sm font-medium text-brand-400">취소됨</span>
        ) : null}
      </div>
    </li>
  );
}
