import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 py-10 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-brand-400">
        Hohak Restaurant
      </p>
      <h1 className="mt-2 text-3xl font-bold text-brand-800">호학식당</h1>
      <p className="mt-3 text-sm text-brand-500">
        따뜻한 한 끼, 단정한 시간을 준비합니다.
      </p>

      <div className="mt-8 w-full space-y-3">
        <Link href="/reserve" className="btn-primary">
          예약하기
        </Link>
        <Link href="/confirm" className="btn-secondary">
          예약 확인하기
        </Link>
        <Link
          href="/admin"
          className="block text-center text-xs text-brand-400 underline-offset-2 hover:underline"
        >
          사장님 전용 · 예약 관리
        </Link>
      </div>
    </main>
  );
}
