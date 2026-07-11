export default function Loading() {
  return (
    <main className="mx-auto grid min-h-screen max-w-[460px] gap-3 px-4 py-10">
      <div className="h-10 w-40 animate-pulse rounded-2xl bg-muted" />
      <div className="h-28 animate-pulse rounded-[1.4rem] bg-muted" />
      <div className="h-28 animate-pulse rounded-[1.4rem] bg-muted" />
      <div className="h-28 animate-pulse rounded-[1.4rem] bg-muted" />
    </main>
  );
}
