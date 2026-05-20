export default function FullPageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-teal-600"
          aria-hidden
        />
        <p className="text-sm text-slate-600">Loading…</p>
      </div>
    </div>
  )
}
