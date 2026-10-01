export default function RegisterLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="rounded-2xl bg-white/80 shadow-lg px-6 py-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 bg-slate-200 rounded-full animate-pulse mb-4" />
          <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="space-y-4">
          <div className="h-12 w-full bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-12 w-full bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-12 w-full bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-12 w-full bg-blue-200 rounded-lg animate-pulse mt-6" />
        </div>
      </div>
    </div>
  );
}
