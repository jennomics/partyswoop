export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">PartySwoop</h1>
        <p className="text-lg text-gray-600 mb-8">
          Party supply and drink request management made easy.
        </p>
        <a
          href="/party/create"
          className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition-colors"
        >
          Create a Party
        </a>
      </div>
    </main>
  );
}
