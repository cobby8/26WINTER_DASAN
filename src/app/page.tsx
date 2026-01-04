import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">26 Winter Dasan 시스템</h1>
      <p>시스템에 접속하시려면 아래 버튼을 눌러주세요.</p>
      <Link href="/portal" className="px-4 py-2 bg-blue-500 text-white rounded">
        포털 바로가기
      </Link>
    </div>
  );
}
