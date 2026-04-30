import SwiftUI

// MARK: - Platform İstatistikleri Modeli
struct PlatformStats: Codable {
    let active_volunteers: Int
    let upcoming_events: Int
    let cities_count: Int
}

// MARK: - Başvuru Modeli
struct ApplicationItem: Codable, Identifiable {
    let id: String
    let event_id: String
    let volunteer_id: String
    let motivation_letter: String?
    let status: String
    let applied_at: String
}

struct ApplicationListResponse: Codable {
    let items: [ApplicationItem]
    let total: Int
}

// MARK: - HomeView ViewModel
@MainActor
class HomeViewModel: ObservableObject {
    @Published var platformStats = PlatformStats(active_volunteers: 0, upcoming_events: 0, cities_count: 0)
    @Published var upcomingEvents: [Event] = []
    @Published var applications: [ApplicationItem] = []
    @Published var isLoading = true
    
    private let baseURL = "http://localhost:8000/api/v1"
    
    func loadData(token: String?) async {
        isLoading = true
        
        // 1. Platform istatistikleri (herkese açık)
        if let url = URL(string: "\(baseURL)/stats") {
            if let (data, response) = try? await URLSession.shared.data(from: url),
               let httpResponse = response as? HTTPURLResponse,
               httpResponse.statusCode == 200 {
                if let stats = try? JSONDecoder().decode(PlatformStats.self, from: data) {
                    self.platformStats = stats
                }
            }
        }
        
        // 2. Yaklaşan etkinlikler (herkese açık)
        if let url = URL(string: "\(baseURL)/events/?status=open&limit=3") {
            if let (data, response) = try? await URLSession.shared.data(from: url),
               let httpResponse = response as? HTTPURLResponse,
               httpResponse.statusCode == 200 {
                if let eventsResponse = try? JSONDecoder().decode(EventListResponse.self, from: data) {
                    self.upcomingEvents = eventsResponse.items
                }
            }
        }
        
        // 3. Kullanıcı başvuruları (giriş yapılmışsa)
        if let token = token {
            if let url = URL(string: "\(baseURL)/users/me/applications") {
                var request = URLRequest(url: url)
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                if let (data, response) = try? await URLSession.shared.data(for: request),
                   let httpResponse = response as? HTTPURLResponse,
                   httpResponse.statusCode == 200 {
                    if let appsResponse = try? JSONDecoder().decode(ApplicationListResponse.self, from: data) {
                        self.applications = appsResponse.items
                    }
                }
            }
        }
        
        isLoading = false
    }
}

// MARK: - HomeView
struct HomeView: View {
    @EnvironmentObject var authManager: AuthManager
    @StateObject private var viewModel = HomeViewModel()
    
    private let accentGreen = Color(red: 0.05, green: 0.45, blue: 0.3)
    private let darkGreen = Color(red: 0.04, green: 0.35, blue: 0.22)
    
    // Gönüllü paneli aktif sekme
    @State private var activeTab = "approved"
    
    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 24) {
                    
                    // 1. Hero Bölümü
                    heroSection
                    
                    // 2. Yaklaşan Etkinlikler
                    upcomingEventsSection
                    
                    // 3. Gönüllü Paneli
                    volunteerPanelSection
                    
                    // 4. Etki Puanı & Rozetler
                    impactAndBadgesSection
                    
                }
                .padding(.bottom, 30)
            }
            .background(Color(UIColor.secondarySystemBackground).ignoresSafeArea())
            .navigationBarHidden(true)
            .refreshable {
                await viewModel.loadData(token: authManager.accessToken)
            }
            .task {
                await viewModel.loadData(token: authManager.accessToken)
            }
        }
    }
    
    // MARK: - 1. Hero Bölümü
    private var heroSection: some View {
        ZStack(alignment: .leading) {
            // Arka plan gradient — web'deki from-emerald-800 to-emerald-950
            LinearGradient(
                colors: [
                    Color(red: 0.06, green: 0.48, blue: 0.35),
                    Color(red: 0.03, green: 0.30, blue: 0.18)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            // Dekoratif daire — web'deki bg-emerald-600 rounded-full
            Circle()
                .fill(Color(red: 0.06, green: 0.52, blue: 0.38).opacity(0.25))
                .frame(width: 300, height: 300)
                .blur(radius: 60)
                .offset(x: 150, y: -80)
            
            VStack(alignment: .leading, spacing: 16) {
                // Badge
                Text("Doğa Sporları & Gönüllülük Platformu")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.white.opacity(0.12))
                    .cornerRadius(20)
                    .foregroundColor(.white.opacity(0.9))
                
                // Başlık — web'deki "Açık Havada İyilik Yap!"
                VStack(alignment: .leading, spacing: 4) {
                    Text("Açık Havada")
                        .font(.system(size: 32, weight: .heavy))
                        .foregroundColor(.white)
                    
                    Text("İyilik Yap!")
                        .font(.system(size: 32, weight: .heavy))
                        .foregroundColor(Color(red: 0.4, green: 0.85, blue: 0.65))
                }
                
                // Açıklama
                Text("Doğa sporları etkinliklerini keşfet, harika bir topluluğun parçası ol ve deneyimlerini iyiliğe dönüştür.")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.85))
                    .lineSpacing(3)
                    .padding(.trailing, 20)
                
                // İstatistik satırı — web'deki flex gap-10
                HStack(spacing: 28) {
                    HeroStat(value: "\(viewModel.platformStats.active_volunteers)", label: "Aktif gönüllü")
                    HeroStat(value: "\(viewModel.platformStats.upcoming_events)", label: "Yaklaşan etkinlik")
                    HeroStat(value: "\(viewModel.platformStats.cities_count)", label: "Farklı Şehir")
                }
                .padding(.top, 8)
            }
            .padding(24)
            .padding(.top, 8)
        }
        .frame(minHeight: 300)
        .cornerRadius(28)
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .shadow(color: Color(red: 0.03, green: 0.30, blue: 0.18).opacity(0.3), radius: 15, x: 0, y: 8)
    }
    
    // MARK: - 2. Yaklaşan Etkinlikler
    private var upcomingEventsSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Başlık satırı
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Yaklaşan Etkinlikler")
                        .font(.title3)
                        .fontWeight(.bold)
                    
                    Text("Yeni maceraları keşfedin")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                NavigationLink(destination: ExploreView()) {
                    HStack(spacing: 2) {
                        Text("Tümünü Gör")
                            .font(.caption)
                            .fontWeight(.bold)
                        Image(systemName: "chevron.right")
                            .font(.caption2)
                    }
                    .foregroundColor(accentGreen)
                }
            }
            .padding(.horizontal, 16)
            
            if viewModel.upcomingEvents.isEmpty {
                // Boş durum
                VStack(spacing: 8) {
                    Text("🏕️")
                        .font(.system(size: 36))
                    Text("Yakında yeni etkinlikler oluşturulacak.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 30)
                .background(Color(UIColor.systemBackground))
                .cornerRadius(16)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color.gray.opacity(0.15), style: StrokeStyle(lineWidth: 1, dash: [6]))
                )
                .padding(.horizontal, 16)
            } else {
                // Yatay kaydırılabilir etkinlik kartları
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 14) {
                        ForEach(viewModel.upcomingEvents) { event in
                            NavigationLink(destination: EventDetailView(event: event)) {
                                HomeEventCard(event: event)
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                    }
                    .padding(.horizontal, 16)
                }
            }
        }
    }
    
    // MARK: - 3. Gönüllü Paneli
    private var volunteerPanelSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Gönüllü Paneli")
                    .font(.title3)
                    .fontWeight(.bold)
                
                Text("Başvurularınızı takip edin")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding(.horizontal, 16)
            
            VStack(spacing: 14) {
                // Sekme butonları — web'deki tab yapısı
                HStack(spacing: 6) {
                    TabButton(title: "Onaylı", count: viewModel.applications.filter { $0.status.uppercased() == "APPROVED" }.count, isActive: activeTab == "approved", color: accentGreen) {
                        activeTab = "approved"
                    }
                    TabButton(title: "Bekleyen", count: viewModel.applications.filter { $0.status.uppercased() == "PENDING" }.count, isActive: activeTab == "pending", color: .orange) {
                        activeTab = "pending"
                    }
                    TabButton(title: "Geçmiş", count: viewModel.applications.filter { $0.status.uppercased() == "REJECTED" }.count, isActive: activeTab == "history", color: .gray) {
                        activeTab = "history"
                    }
                }
                .padding(4)
                .background(Color(UIColor.tertiarySystemFill))
                .cornerRadius(14)
                
                // Başvuru listesi
                let filtered = filteredApplications
                if filtered.isEmpty {
                    VStack(spacing: 6) {
                        Text("Bu sekmede kayıt bulunamadı.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 30)
                    .background(Color(UIColor.tertiarySystemFill).opacity(0.5))
                    .cornerRadius(14)
                    .overlay(
                        RoundedRectangle(cornerRadius: 14)
                            .stroke(Color.gray.opacity(0.1), style: StrokeStyle(lineWidth: 1, dash: [6]))
                    )
                } else {
                    VStack(spacing: 8) {
                        ForEach(filtered) { app in
                            ApplicationRow(app: app)
                        }
                    }
                }
            }
            .padding(16)
            .background(Color(UIColor.systemBackground))
            .cornerRadius(20)
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .stroke(Color.gray.opacity(0.08), lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.04), radius: 8, x: 0, y: 3)
            .padding(.horizontal, 16)
        }
    }
    
    // MARK: - 4. Etki Puanı & Rozetler
    private var impactAndBadgesSection: some View {
        VStack(spacing: 14) {
            // Etki Puanı Kartı — web'deki "Etki Puanınız" bölümü
            VStack(alignment: .leading, spacing: 14) {
                Text("Etki Puanınız")
                    .font(.headline)
                    .fontWeight(.bold)
                
                ZStack {
                    // Dekoratif daire
                    Circle()
                        .fill(accentGreen.opacity(0.06))
                        .frame(width: 150, height: 150)
                        .blur(radius: 40)
                        .offset(x: 80, y: -30)
                    
                    VStack(alignment: .leading, spacing: 10) {
                        HStack(spacing: 5) {
                            Image(systemName: "flame.fill")
                                .foregroundColor(.orange)
                                .font(.caption)
                            Text("TOPLAM ZİRVE PUANI")
                                .font(.caption2)
                                .fontWeight(.bold)
                                .foregroundColor(.secondary)
                                .tracking(1)
                        }
                        
                        Text("\(authManager.userStats?.total_impact_score ?? 0)")
                            .font(.system(size: 48, weight: .heavy))
                            .foregroundColor(.primary)
                        
                        // Progress bar
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                RoundedRectangle(cornerRadius: 6)
                                    .fill(Color(UIColor.tertiarySystemFill))
                                    .frame(height: 8)
                                
                                let score = authManager.userStats?.total_impact_score ?? 0
                                let progress = min(1.0, max(0.05, Double(score) / 1000.0))
                                
                                LinearGradient(
                                    colors: [
                                        Color(red: 0.3, green: 0.78, blue: 0.55),
                                        accentGreen
                                    ],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                                .frame(width: geo.size.width * progress, height: 8)
                                .cornerRadius(6)
                            }
                        }
                        .frame(height: 8)
                        
                        Text("Katıldığınız etkinliklerin zorluk derecesine göre (10-100) puan kazanırsınız.")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .padding(18)
            .background(Color(UIColor.systemBackground))
            .cornerRadius(20)
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .stroke(Color.gray.opacity(0.08), lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.04), radius: 8, x: 0, y: 3)
            
            // Rozetler Kartı — web'deki "Kazanılan Rozetler" bölümü
            VStack(alignment: .leading, spacing: 14) {
                Text("Kazanılan Rozetler")
                    .font(.headline)
                    .fontWeight(.bold)
                
                VStack {
                    VStack(spacing: 8) {
                        ZStack {
                            Circle()
                                .stroke(Color.gray.opacity(0.15), style: StrokeStyle(lineWidth: 1, dash: [5]))
                                .frame(width: 64, height: 64)
                            
                            Text("🏅")
                                .font(.system(size: 28))
                                .opacity(0.4)
                                .grayscale(1.0)
                        }
                        
                        Text("Henüz rozet kazanmadınız.\nİlk maceranıza atılın!")
                            .font(.caption)
                            .multilineTextAlignment(.center)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
                }
            }
            .padding(18)
            .background(Color(UIColor.systemBackground))
            .cornerRadius(20)
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .stroke(Color.gray.opacity(0.08), lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.04), radius: 8, x: 0, y: 3)
        }
        .padding(.horizontal, 16)
    }
    
    // MARK: - Helpers
    private var filteredApplications: [ApplicationItem] {
        viewModel.applications.filter { app in
            switch activeTab {
            case "approved": return app.status.uppercased() == "APPROVED"
            case "pending": return app.status.uppercased() == "PENDING"
            case "history": return app.status.uppercased() == "REJECTED"
            default: return true
            }
        }
    }
}

// MARK: - Alt Bileşenler

struct HeroStat: View {
    let value: String
    let label: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value)
                .font(.title2)
                .fontWeight(.heavy)
                .foregroundColor(.white)
            
            Text(label)
                .font(.caption2)
                .foregroundColor(.white.opacity(0.65))
                .fontWeight(.medium)
        }
    }
}

struct HomeEventCard: View {
    let event: Event
    
    private let categoryEmojis: [String: String] = [
        "hiking": "⛰️", "climbing": "🧗", "environment": "🌲",
        "rescue": "🚁", "other": "🔥",
        "Doga Yuruyusu": "⛰️", "Tirmanis": "🧗", "Cevre": "🌲"
    ]
    
    private let categoryLabels: [String: String] = [
        "hiking": "Yürüyüş", "climbing": "Tırmanış", "environment": "Çevre & Doğa",
        "rescue": "Arama Kurtarma", "other": "Diğer",
        "Doga Yuruyusu": "Doğa Yürüyüşü", "Tirmanis": "Tırmanış", "Cevre": "Çevre & Doğa"
    ]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Emoji görsel alanı — web'deki kategori renk alanına sadık
            ZStack {
                Color(red: 0.93, green: 0.97, blue: 0.94)
                
                Text(categoryEmojis[event.category] ?? "🏕️")
                    .font(.system(size: 44))
            }
            .frame(height: 100)
            
            VStack(alignment: .leading, spacing: 8) {
                // Kategori badge
                Text(categoryLabels[event.category] ?? event.category)
                    .font(.caption2)
                    .fontWeight(.bold)
                    .foregroundColor(.secondary)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Color(UIColor.tertiarySystemFill))
                    .cornerRadius(8)
                
                // Başlık
                Text(event.title)
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundColor(.primary)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                
                // Tarih
                HStack(spacing: 4) {
                    Image(systemName: "calendar")
                        .font(.caption2)
                        .foregroundColor(Color(red: 0.05, green: 0.45, blue: 0.3))
                    Text(formatDate(event.start_date))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                // Konum
                HStack(spacing: 4) {
                    Image(systemName: "mappin")
                        .font(.caption2)
                        .foregroundColor(Color(red: 0.05, green: 0.45, blue: 0.3))
                    Text(event.location_name ?? "Konum Gizli")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
                
                // Alt satır
                HStack {
                    if let max = event.max_volunteers {
                        Text("\(max) yer kaldı")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    } else {
                        Text("Sınırsız Katılım")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                    
                    Text("Katıl")
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundColor(Color(red: 0.05, green: 0.45, blue: 0.3))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 6)
                        .background(Color(UIColor.tertiarySystemFill))
                        .cornerRadius(10)
                }
                .padding(.top, 6)
            }
            .padding(14)
        }
        .frame(width: 240)
        .background(Color(UIColor.systemBackground))
        .cornerRadius(18)
        .overlay(
            RoundedRectangle(cornerRadius: 18)
                .stroke(Color.gray.opacity(0.08), lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.04), radius: 6, x: 0, y: 2)
    }
    
    private func formatDate(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: isoString) {
            let displayFormatter = DateFormatter()
            displayFormatter.locale = Locale(identifier: "tr_TR")
            displayFormatter.dateStyle = .medium
            return displayFormatter.string(from: date)
        }
        return isoString
    }
}

struct TabButton: View {
    let title: String
    let count: Int
    let isActive: Bool
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text("\(title) (\(count))")
                .font(.caption)
                .fontWeight(.bold)
                .padding(.horizontal, 14)
                .padding(.vertical, 9)
                .frame(maxWidth: .infinity)
                .background(isActive ? Color(UIColor.systemBackground) : Color.clear)
                .foregroundColor(isActive ? color : .secondary)
                .cornerRadius(10)
                .shadow(color: isActive ? Color.black.opacity(0.04) : .clear, radius: 3, x: 0, y: 1)
        }
    }
}

struct ApplicationRow: View {
    let app: ApplicationItem
    
    private let accentGreen = Color(red: 0.05, green: 0.45, blue: 0.3)
    
    var body: some View {
        HStack(spacing: 12) {
            // Durum ikonu — web'deki renkli kare
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(statusBgColor)
                    .frame(width: 44, height: 44)
                
                Text(statusIcon)
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(statusTextColor)
            }
            
            VStack(alignment: .leading, spacing: 3) {
                Text("Etkinlik Başvurusu")
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundColor(.primary)
                
                Text("\(formatDate(app.applied_at)) tarihinde gönderildi")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            // Durum badge
            Text(statusLabel)
                .font(.caption2)
                .fontWeight(.bold)
                .foregroundColor(statusTextColor)
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(statusBgColor)
                .cornerRadius(20)
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(statusTextColor.opacity(0.2), lineWidth: 1)
                )
        }
        .padding(12)
        .background(Color(UIColor.systemBackground))
        .cornerRadius(14)
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Color.gray.opacity(0.06), lineWidth: 1)
        )
    }
    
    private var statusIcon: String {
        switch app.status.uppercased() {
        case "APPROVED": return "✓"
        case "PENDING": return "?"
        default: return "×"
        }
    }
    
    private var statusLabel: String {
        switch app.status.uppercased() {
        case "APPROVED": return "ONAYLANDI"
        case "PENDING": return "BEKLİYOR"
        case "REJECTED": return "REDDEDİLDİ"
        default: return app.status
        }
    }
    
    private var statusBgColor: Color {
        switch app.status.uppercased() {
        case "APPROVED": return accentGreen.opacity(0.1)
        case "PENDING": return Color.orange.opacity(0.1)
        default: return Color.gray.opacity(0.1)
        }
    }
    
    private var statusTextColor: Color {
        switch app.status.uppercased() {
        case "APPROVED": return accentGreen
        case "PENDING": return .orange
        default: return .gray
        }
    }
    
    private func formatDate(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: isoString) {
            let displayFormatter = DateFormatter()
            displayFormatter.locale = Locale(identifier: "tr_TR")
            displayFormatter.dateStyle = .medium
            return displayFormatter.string(from: date)
        }
        // Fractional seconds olmadan dene
        let formatter2 = ISO8601DateFormatter()
        formatter2.formatOptions = [.withInternetDateTime]
        if let date = formatter2.date(from: isoString) {
            let displayFormatter = DateFormatter()
            displayFormatter.locale = Locale(identifier: "tr_TR")
            displayFormatter.dateStyle = .medium
            return displayFormatter.string(from: date)
        }
        return isoString
    }
}

#Preview {
    HomeView()
        .environmentObject(AuthManager())
}
