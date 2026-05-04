import SwiftUI

// MARK: - Kulüp Modelleri
struct ClubStats: Codable {
    let followers: Int
    let active_volunteers: Int
    let completed_events: Int
    let total_hours: Int
}

struct ClubProfile: Codable, Identifiable {
    let id: String
    let name: String
    let description: String?
    let logo_url: String?
    let website: String?
    let city: String?
    let category: String?
    let tags: [String]
    let is_verified: Bool
    let stats: ClubStats?
}

// MARK: - ClubProfileViewModel
@MainActor
class ClubProfileViewModel: ObservableObject {
    @Published var club: ClubProfile?
    @Published var events: [Event] = []
    @Published var isLoading = true
    @Published var errorMessage: String?

    private let baseURL = "http://localhost:8000/api/v1"

    func load(clubId: String) async {
        isLoading = true
        errorMessage = nil

        // Kulüp profili
        if let url = URL(string: "\(baseURL)/organizations/\(clubId)") {
            do {
                let (data, response) = try await URLSession.shared.data(from: url)
                if let httpRes = response as? HTTPURLResponse, httpRes.statusCode == 200 {
                    self.club = try JSONDecoder().decode(ClubProfile.self, from: data)
                }
            } catch {
                errorMessage = "Kulüp bilgileri yüklenemedi."
            }
        }

        // Kulüp etkinlikleri
        if let url = URL(string: "\(baseURL)/organizations/\(clubId)/events?app_status=open&limit=20") {
            if let (data, response) = try? await URLSession.shared.data(from: url),
               let httpRes = response as? HTTPURLResponse,
               httpRes.statusCode == 200 {
                if let decoded = try? JSONDecoder().decode(EventListResponse.self, from: data) {
                    self.events = decoded.items
                }
            }
        }

        isLoading = false
    }
}

// MARK: - ClubProfileView
struct ClubProfileView: View {
    let clubId: String
    let clubName: String?

    @StateObject private var viewModel = ClubProfileViewModel()
    @Environment(\.dismiss) private var dismiss

    private let accentGreen = Color(red: 0.05, green: 0.45, blue: 0.3)

    var body: some View {
        ScrollView(showsIndicators: false) {
            if viewModel.isLoading {
                loadingView
            } else if let club = viewModel.club {
                VStack(spacing: 0) {
                    // Header Banner
                    clubHeaderBanner(club: club)

                    VStack(alignment: .leading, spacing: 24) {
                        // Stats
                        if let stats = club.stats {
                            clubStatsGrid(stats: stats)
                        }

                        // Açıklama
                        if let desc = club.description, !desc.isEmpty {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Hakkında")
                                    .font(.headline)
                                    .fontWeight(.bold)
                                Text(desc)
                                    .font(.body)
                                    .foregroundColor(.secondary)
                                    .lineSpacing(4)
                            }
                            .padding(.horizontal, 20)
                        }

                        // Etiketler
                        if !club.tags.isEmpty {
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 8) {
                                    ForEach(club.tags, id: \.self) { tag in
                                        Text(tag)
                                            .font(.caption)
                                            .fontWeight(.semibold)
                                            .padding(.horizontal, 12)
                                            .padding(.vertical, 6)
                                            .background(accentGreen.opacity(0.1))
                                            .foregroundColor(accentGreen)
                                            .cornerRadius(20)
                                            .overlay(
                                                RoundedRectangle(cornerRadius: 20)
                                                    .stroke(accentGreen.opacity(0.2), lineWidth: 1)
                                            )
                                    }
                                }
                                .padding(.horizontal, 20)
                            }
                        }

                        Divider().padding(.horizontal, 20)

                        // Aktif Etkinlikler
                        VStack(alignment: .leading, spacing: 14) {
                            HStack {
                                Text("Aktif Etkinlikler")
                                    .font(.title3)
                                    .fontWeight(.bold)
                                Spacer()
                                Text("\(viewModel.events.count) etkinlik")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            .padding(.horizontal, 20)

                            if viewModel.events.isEmpty {
                                VStack(spacing: 8) {
                                    Text("🏕️")
                                        .font(.system(size: 36))
                                    Text("Şu anda aktif etkinlik bulunmuyor.")
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 30)
                                .background(Color(UIColor.secondarySystemGroupedBackground))
                                .cornerRadius(16)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 16)
                                        .stroke(Color.gray.opacity(0.15), style: StrokeStyle(lineWidth: 1, dash: [6]))
                                )
                                .padding(.horizontal, 20)
                            } else {
                                VStack(spacing: 12) {
                                    ForEach(viewModel.events) { event in
                                        NavigationLink(destination: EventDetailView(event: event)) {
                                            ClubEventCard(event: event)
                                        }
                                        .buttonStyle(PlainButtonStyle())
                                    }
                                }
                                .padding(.horizontal, 20)
                            }
                        }
                    }
                    .padding(.vertical, 24)
                }
            } else {
                errorView
            }
        }
        .background(Color(UIColor.secondarySystemBackground).ignoresSafeArea())
        .navigationTitle(clubName ?? "Kulüp Sayfası")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.load(clubId: clubId)
        }
    }

    // MARK: - Header Banner
    private func clubHeaderBanner(club: ClubProfile) -> some View {
        ZStack(alignment: .bottom) {
            // Gradient banner
            LinearGradient(
                colors: [
                    Color(red: 0.06, green: 0.48, blue: 0.35),
                    Color(red: 0.03, green: 0.30, blue: 0.18)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .frame(height: 160)

            // Dekoratif circle
            Circle()
                .fill(Color.white.opacity(0.08))
                .frame(width: 200, height: 200)
                .offset(x: 80, y: -40)

            // Logo + isim
            VStack(spacing: 0) {
                // Logo dairesi
                ZStack {
                    Circle()
                        .fill(Color.white)
                        .frame(width: 80, height: 80)
                        .shadow(color: Color.black.opacity(0.15), radius: 8, x: 0, y: 4)

                    if let logoUrl = club.logo_url, let url = URL(string: logoUrl) {
                        AsyncImage(url: url) { image in
                            image
                                .resizable()
                                .scaledToFill()
                        } placeholder: {
                            clubInitialsView(name: club.name)
                        }
                        .frame(width: 72, height: 72)
                        .clipShape(Circle())
                    } else {
                        clubInitialsView(name: club.name)
                    }
                }
                .offset(y: 40)
            }
            .frame(maxWidth: .infinity)
            .padding(.bottom, 8)
        }
        .frame(height: 160)
        .padding(.top, 60)
        .background(
            LinearGradient(
                colors: [
                    Color(red: 0.06, green: 0.48, blue: 0.35),
                    Color(red: 0.03, green: 0.30, blue: 0.18)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .overlay(alignment: .bottom) {
            VStack(spacing: 4) {
                Spacer()
                    .frame(height: 50)
                HStack(spacing: 6) {
                    Text(club.name)
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.primary)

                    if club.is_verified {
                        Image(systemName: "checkmark.seal.fill")
                            .foregroundColor(accentGreen)
                            .font(.subheadline)
                    }
                }

                HStack(spacing: 12) {
                    if let city = club.city {
                        Label(city, systemImage: "mappin")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    if let cat = club.category {
                        Label(cat, systemImage: "tag")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 16)
            .background(
                Color(UIColor.secondarySystemBackground)
                    .clipShape(
                        RoundedRectangle(cornerRadius: 0)
                    )
            )
        }
    }

    private func clubInitialsView(name: String) -> some View {
        Text(String(name.prefix(2)).uppercased())
            .font(.title2)
            .fontWeight(.bold)
            .foregroundColor(accentGreen)
            .frame(width: 72, height: 72)
            .background(accentGreen.opacity(0.1))
            .clipShape(Circle())
    }

    // MARK: - Stats Grid
    private func clubStatsGrid(stats: ClubStats) -> some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            ClubStatCard(value: "\(stats.followers)", label: "Takipçi", icon: "heart.fill", color: .pink)
            ClubStatCard(value: "\(stats.active_volunteers)", label: "Aktif Gönüllü", icon: "person.3.fill", color: accentGreen)
            ClubStatCard(value: "\(stats.completed_events)", label: "Tamamlanan", icon: "checkmark.circle.fill", color: .blue)
            ClubStatCard(value: "\(stats.total_hours)s", label: "Toplam Saat", icon: "clock.fill", color: .orange)
        }
        .padding(.horizontal, 20)
    }

    // MARK: - Loading & Error Views
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.5)
                .tint(accentGreen)
            Text("Kulüp Yükleniyor...")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.top, 100)
    }

    private var errorView: some View {
        VStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 40))
                .foregroundColor(.orange)
            Text(viewModel.errorMessage ?? "Kulüp bulunamadı.")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.top, 100)
        .padding(.horizontal, 40)
    }
}

// MARK: - Alt Bileşenler
struct ClubStatCard: View {
    let value: String
    let label: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                ZStack {
                    Circle()
                        .fill(color.opacity(0.12))
                        .frame(width: 34, height: 34)
                    Image(systemName: icon)
                        .font(.caption)
                        .foregroundColor(color)
                }
                Spacer()
            }
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.primary)
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(14)
        .background(Color(UIColor.systemBackground))
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.gray.opacity(0.08), lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.04), radius: 6, x: 0, y: 2)
    }
}

struct ClubEventCard: View {
    let event: Event

    private let categoryEmojis: [String: String] = [
        "hiking": "⛰️", "climbing": "🧗", "environment": "🌲",
        "rescue": "🚁", "other": "🔥"
    ]
    private let difficultyColors: [String: Color] = [
        "easy": .green, "medium": .orange, "hard": .red, "expert": .purple
    ]
    private let difficultyLabels: [String: String] = [
        "easy": "Kolay", "medium": "Orta", "hard": "Zor", "expert": "Uzman"
    ]

    var body: some View {
        HStack(spacing: 14) {
            // Emoji alanı
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color(red: 0.93, green: 0.97, blue: 0.94))
                    .frame(width: 56, height: 56)
                Text(categoryEmojis[event.category] ?? "🏕️")
                    .font(.system(size: 26))
            }

            VStack(alignment: .leading, spacing: 5) {
                Text(event.title)
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundColor(.primary)
                    .lineLimit(2)

                HStack(spacing: 8) {
                    Label(formatDate(event.start_date), systemImage: "calendar")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    if let loc = event.location_name {
                        Label(loc, systemImage: "mappin")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }
                }

                // Zorluk badge
                Text(difficultyLabels[event.difficulty] ?? event.difficulty)
                    .font(.caption2)
                    .fontWeight(.bold)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background((difficultyColors[event.difficulty] ?? .gray).opacity(0.12))
                    .foregroundColor(difficultyColors[event.difficulty] ?? .gray)
                    .cornerRadius(8)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(14)
        .background(Color(UIColor.systemBackground))
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.gray.opacity(0.08), lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.04), radius: 5, x: 0, y: 2)
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
    NavigationStack {
        ClubProfileView(clubId: "some-club-id", clubName: "Zirve Dağcılık Kulübü")
            .environmentObject(AuthManager())
    }
}
