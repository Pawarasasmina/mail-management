export default function Card({ title, children }) {
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm border border-slate-200">
      <h2 className="mb-4 text-lg font-semibold text-slate-800">{title}</h2>
      {children}
    </section>
  );
}
