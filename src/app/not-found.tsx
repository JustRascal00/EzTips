import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">That page isn’t here</h1>
        <p className="text-muted mt-2">The tutorial or hub may have moved.</p>
        <Link href="/home" className="inline-block mt-6 text-sm text-accent hover:text-accent-hover">
          Back to feed
        </Link>
      </div>
    </div>
  );
}
