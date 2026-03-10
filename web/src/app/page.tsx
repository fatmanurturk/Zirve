import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-24 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Doğayla Buluş,{" "}
          <span className="text-green-700">Fark Yarat</span>
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Zirve, doğa sporları etkinliklerine gönüllü olabileceğin,
          organizatörlerle buluşabileceğin bir platform.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/register"
            className="bg-green-700 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-green-800 transition"
          >
            Hemen Başla
          </Link>
          <Link
            href="/events"
            className="border border-green-700 text-green-700 px-8 py-3 rounded-lg text-lg font-medium hover:bg-green-50 transition"
          >
            Etkinlikleri Gör
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <div className="text-4xl mb-4">🏔</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Etkinlikleri Keşfet
            </h3>
            <p className="text-gray-600">
              Hiking, tırmanma, kayak ve daha fazlası. Seviyene uygun etkinlikleri bul.
            </p>
          </div>
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <div className="text-4xl mb-4">🤝</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Gönüllü Ol
            </h3>
            <p className="text-gray-600">
              Etkinliklere başvur, onay al ve doğayla iç içe gönüllü çalışmalar yap.
            </p>
          </div>
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <div className="text-4xl mb-4">🏅</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Rozet Kazan
            </h3>
            <p className="text-gray-600">
              Katıldığın etkinliklerden puan ve rozetler kazan, profilini zenginleştir.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}