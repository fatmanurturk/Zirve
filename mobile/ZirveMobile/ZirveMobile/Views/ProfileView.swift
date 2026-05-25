import SwiftUI

// MARK: - Badge Models
struct BadgeDetail: Codable, Identifiable {
    let id: String
    let name: String
    let description: String?
    let icon_url: String?
    let category: String

    enum CodingKeys: String, CodingKey {
        case id, name, description, icon_url, category
    }
}

struct UserBadgeItem: Codable, Identifiable {
    let id: String
    let badge: BadgeDetail

    enum CodingKeys: String, CodingKey {
        case id, badge
    }
}

// MARK: - Application Model (for history)
struct ApplicationHistory: Codable, Identifiable {
    let id: String
    let event_id: String
    let status: String
    let applied_at: String
}

struct ProfileView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var showEditProfile = false
    @State private var showClubSetup = false
    @State private var userBadges: [UserBadgeItem] = []
    @State private var applications: [ApplicationHistory] = []
    @State private var isLoadingExtras = false

    private let accentGreen = Color(red: 0.2, green: 0.5, blue: 0.2)
    private let baseURL = "http://localhost:8000/api/v1"

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {

                    // MARK: - Kullanıcı Bilgi Kartı
                    userInfoCard

                    // MARK: - Kulüp Yönetimi (Sadece Organizatör)
                    if authManager.currentUser?.role.lowercased() == "organizer" {
                        organizerClubCard
                    }

                    // MARK: - İstatistik Kartları
                    if let stats = authManager.userStats {
                        statsGrid(stats: stats)
                    }

                    // MARK: - Rozetler
                    if !userBadges.isEmpty {
                        badgesCard
                    }

                    // MARK: - Gönüllü Profil Detayları
                    if let profile = authManager.volunteerProfile {
                        volunteerProfileCard(profile: profile)
                    }

                    // MARK: - Başvuru Geçmişi
                    if !applications.isEmpty {
                        applicationsCard
                    }

                    // MARK: - Profil Tamamlama Çağrısı
                    if authManager.volunteerProfile == nil && authManager.currentUser?.role.lowercased() == "volunteer" {
                        profileSetupCard
                    }

                    // MARK: - Çıkış Yap Butonu
                    logoutButton
                        .padding(.top, 8)
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)
                .padding(.bottom, 30)
            }
            .background(Color(UIColor.secondarySystemBackground).ignoresSafeArea())
            .navigationTitle("Profilim")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showEditProfile = true }) {
                        Image(systemName: "pencil.circle.fill")
                            .font(.title3)
                            .foregroundColor(accentGreen)
                    }
                }
            }
            .sheet(isPresented: $showEditProfile) {
                EditProfileView()
                    .environmentObject(authManager)
            }
            .sheet(isPresented: $showClubSetup) {
                ClubSetupView()
                    .environmentObject(authManager)
            }
            .refreshable {
                await authManager.fetchUserData()
                await loadExtras()
            }
            .task {
                await loadExtras()
            }
        }
    }

    // MARK: - Load Badges & Applications
    private func loadExtras() async {
        guard let token = authManager.accessToken,
              authManager.currentUser?.role.lowercased() == "volunteer" else { return }

        isLoadingExtras = true

        async let badgesTask: [UserBadgeItem]? = fetchBadges(token: token)
        async let appsTask: [ApplicationHistory]? = fetchApplications(token: token)

        let (badges, apps) = await (badgesTask, appsTask)
        userBadges = badges ?? []
        applications = apps ?? []
        isLoadingExtras = false
    }

    private func fetchBadges(token: String) async -> [UserBadgeItem]? {
        guard let url = URL(string: "\(baseURL)/volunteers/me/badges") else { return nil }
        var req = URLRequest(url: url)
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        guard let (data, response) = try? await URLSession.shared.data(for: req),
              let httpRes = response as? HTTPURLResponse, httpRes.statusCode == 200 else { return nil }
        return try? JSONDecoder().decode([UserBadgeItem].self, from: data)
    }

    private func fetchApplications(token: String) async -> [ApplicationHistory]? {
        guard let url = URL(string: "\(baseURL)/users/me/applications?limit=5") else { return nil }
        var req = URLRequest(url: url)
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        guard let (data, response) = try? await URLSession.shared.data(for: req),
              let httpRes = response as? HTTPURLResponse, httpRes.statusCode == 200 else { return nil }
        struct Wrapper: Codable { let items: [ApplicationHistory] }
        return (try? JSONDecoder().decode(Wrapper.self, from: data))?.items
    }
    
    // MARK: - Kullanıcı Bilgi Kartı
    private var userInfoCard: some View {
        VStack(spacing: 0) {
            HStack(spacing: 14) {
                // Avatar — web'deki bg-green-100 rounded-full
                ZStack {
                    Circle()
                        .fill(accentGreen.opacity(0.12))
                        .frame(width: 60, height: 60)
                    
                    Image(systemName: "person.fill")
                        .font(.title2)
                        .foregroundColor(accentGreen)
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    // İsim
                    Text(authManager.currentUser?.full_name ?? "Yükleniyor...")
                        .font(.title3)
                        .fontWeight(.semibold)
                        .foregroundColor(.primary)
                    
                    // Email
                    Text(authManager.currentUser?.email ?? "")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    // Telefon
                    if let phone = authManager.currentUser?.phone {
                        Text("📞 \(phone)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    // Rol Badge — web'deki bg-green-100 text-green-700 badge
                    if let role = authManager.currentUser?.role {
                        Text(role.lowercased() == "volunteer" ? "Gönüllü" : "Organizatör")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundColor(accentGreen)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 3)
                            .background(accentGreen.opacity(0.1))
                            .cornerRadius(20)
                    }
                }
                
                Spacer()
            }
            .padding(18)
        }
        .background(Color(UIColor.systemBackground))
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.gray.opacity(0.08), lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.03), radius: 6, x: 0, y: 2)
    }
    
    // MARK: - Organizatör Kulüp Kartı
    private var organizerClubCard: some View {
        Button(action: { showClubSetup = true }) {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Kulüp Ayarlarını Yönet")
                            .font(.headline)
                            .foregroundColor(.white)
                        Text("Kulüp bilgilerini, logosunu ve ayarlarını buradan düzenleyebilirsin.")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.8))
                            .multilineTextAlignment(.leading)
                    }
                    Spacer()
                    Image(systemName: "building.2.fill")
                        .font(.title)
                        .foregroundColor(.white.opacity(0.3))
                }
                
                Text("Düzenlemek İçin Dokun")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(accentGreen)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.white)
                    .cornerRadius(8)
            }
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(accentGreen)
            .cornerRadius(16)
            .shadow(color: accentGreen.opacity(0.3), radius: 8, x: 0, y: 4)
        }
    }
    
    // MARK: - İstatistik Grid
    private func statsGrid(stats: UserStats) -> some View {
        LazyVGrid(columns: [
            GridItem(.flexible(), spacing: 10),
            GridItem(.flexible(), spacing: 10),
            GridItem(.flexible(), spacing: 10)
        ], spacing: 10) {
            StatCard(value: "\(stats.total_applications)", label: "Toplam Başvuru", icon: "doc.text.fill")
            StatCard(value: "\(stats.approved_applications)", label: "Onaylanan", icon: "checkmark.seal.fill")
            StatCard(value: "\(stats.checked_in_count)", label: "Check-in", icon: "mappin.circle.fill")
            StatCard(value: "\(stats.total_impact_score)", label: "Etki Puanı", icon: "bolt.fill")
            StatCard(value: "\(stats.badge_count)", label: "Rozet", icon: "medal.fill")
        }
    }
    
    // MARK: - Gönüllü Profil Kartı
    private func volunteerProfileCard(profile: VolunteerProfile) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Gönüllü Profili")
                .font(.headline)
                .fontWeight(.semibold)
                .foregroundColor(.primary)
            
            // Grid bilgiler — web'deki grid grid-cols-2 yapısına sadık
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], alignment: .leading, spacing: 14) {
                // Deneyim Seviyesi
                ProfileDetailItem(
                    label: "Deneyim Seviyesi",
                    value: experienceLevelText(profile.experience_level),
                    icon: "chart.bar.fill"
                )
                
                // Şehir
                if let city = profile.city {
                    ProfileDetailItem(
                        label: "Şehir",
                        value: city,
                        icon: "building.2.fill"
                    )
                }
                
                // Max İrtifa
                if let altitude = profile.max_altitude_m {
                    ProfileDetailItem(
                        label: "Max İrtifa",
                        value: "\(altitude) m",
                        icon: "mountain.2.fill"
                    )
                }
            }
            
            // Hakkımda
            if let bio = profile.bio, !bio.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Hakkımda")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Text(bio)
                        .font(.subheadline)
                        .foregroundColor(.primary.opacity(0.8))
                        .lineSpacing(3)
                }
            }
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(UIColor.systemBackground))
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.gray.opacity(0.08), lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.03), radius: 6, x: 0, y: 2)
    }
    
    // MARK: - Profil Tamamlama Kartı — web'deki bg-green-50 kartına sadık
    private var profileSetupCard: some View {
        VStack(spacing: 14) {
            Text("⛰️")
                .font(.system(size: 40))
            
            Text("Aramıza Hoş Geldin!")
                .font(.title3)
                .fontWeight(.bold)
                .foregroundColor(Color(red: 0.1, green: 0.35, blue: 0.1))
            
            Text("Gönüllü olarak etkinliklere katılabilmen ve ekiplerle eşleşebilmen için deneyim bilgilerini profiline eklemelisin.")
                .font(.subheadline)
                .multilineTextAlignment(.center)
                .foregroundColor(Color(red: 0.15, green: 0.4, blue: 0.15))
                .padding(.horizontal, 8)
            
            Button(action: {
                // Profil tamamlama ekranı — ileride eklenecek
            }) {
                Text("Profilini Tamamla")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 28)
                    .padding(.vertical, 12)
                    .background(accentGreen)
                    .cornerRadius(12)
                    .shadow(color: accentGreen.opacity(0.2), radius: 4, x: 0, y: 2)
            }
        }
        .padding(24)
        .frame(maxWidth: .infinity)
        .background(accentGreen.opacity(0.06))
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(accentGreen.opacity(0.15), lineWidth: 1)
        )
    }
    
    // MARK: - Rozetler Kartı
    private var badgesCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Label("Rozetlerim", systemImage: "medal.fill")
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(.primary)
                Spacer()
                Text("\(userBadges.count) rozet")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                ForEach(userBadges.prefix(6)) { ub in
                    VStack(spacing: 6) {
                        ZStack {
                            Circle()
                                .fill(accentGreen.opacity(0.1))
                                .frame(width: 48, height: 48)
                            Text(badgeEmoji(category: ub.badge.category))
                                .font(.title2)
                        }
                        Text(ub.badge.name)
                            .font(.caption2)
                            .fontWeight(.medium)
                            .foregroundColor(.primary)
                            .lineLimit(2)
                            .multilineTextAlignment(.center)
                    }
                }
            }
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(UIColor.systemBackground))
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.gray.opacity(0.08), lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.03), radius: 6, x: 0, y: 2)
    }

    private func badgeEmoji(category: String) -> String {
        switch category {
        case "summit": return "🏔️"
        case "nature": return "🌲"
        case "team": return "🤝"
        case "milestone": return "🏆"
        default: return "🎖️"
        }
    }

    // MARK: - Başvuru Geçmişi Kartı
    private var applicationsCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Label("Son Başvurularım", systemImage: "doc.text.fill")
                .font(.headline)
                .fontWeight(.semibold)
                .foregroundColor(.primary)

            VStack(spacing: 10) {
                ForEach(applications) { app in
                    HStack(spacing: 12) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 10)
                                .fill(statusColor(app.status).opacity(0.1))
                                .frame(width: 40, height: 40)
                            Image(systemName: statusIcon(app.status))
                                .font(.subheadline)
                                .foregroundColor(statusColor(app.status))
                        }

                        VStack(alignment: .leading, spacing: 3) {
                            Text("Etkinlik Başvurusu")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(.primary)
                            Text(formatDate(app.applied_at))
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }

                        Spacer()

                        Text(statusLabel(app.status))
                            .font(.caption2)
                            .fontWeight(.bold)
                            .foregroundColor(statusColor(app.status))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(statusColor(app.status).opacity(0.1))
                            .cornerRadius(8)
                    }
                }
            }
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(UIColor.systemBackground))
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.gray.opacity(0.08), lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.03), radius: 6, x: 0, y: 2)
    }

    private func statusColor(_ status: String) -> Color {
        switch status {
        case "approved": return .green
        case "rejected": return .red
        case "checked_in": return .blue
        default: return .orange
        }
    }

    private func statusIcon(_ status: String) -> String {
        switch status {
        case "approved": return "checkmark.circle.fill"
        case "rejected": return "xmark.circle.fill"
        case "checked_in": return "mappin.circle.fill"
        default: return "clock.fill"
        }
    }

    private func statusLabel(_ status: String) -> String {
        switch status {
        case "approved": return "Onaylandı"
        case "rejected": return "Reddedildi"
        case "checked_in": return "Check-in"
        case "pending": return "Bekliyor"
        default: return status.capitalized
        }
    }

    // MARK: - Çıkış Yap Butonu
    private var logoutButton: some View {
        Button(action: {
            authManager.logout()
        }) {
            HStack(spacing: 8) {
                Image(systemName: "rectangle.portrait.and.arrow.right")
                Text("Çıkış Yap")
                    .fontWeight(.semibold)
            }
            .font(.subheadline)
            .foregroundColor(.red.opacity(0.7))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(Color.red.opacity(0.05))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.red.opacity(0.1), lineWidth: 1)
            )
        }
    }
    
    // MARK: - Helpers
    private func formatDate(_ iso: String) -> String {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = f.date(from: iso) {
            let df = DateFormatter()
            df.locale = Locale(identifier: "tr_TR")
            df.dateStyle = .medium
            return df.string(from: d)
        }
        return iso
    }

    private func experienceLevelText(_ level: String) -> String {
        switch level {
        case "beginner": return "Başlangıç"
        case "intermediate": return "Orta"
        case "advanced": return "Uzman"
        default: return level.capitalized
        }
    }
}

// MARK: - İstatistik Kartı Bileşeni
struct StatCard: View {
    let value: String
    let label: String
    let icon: String
    
    private let accentGreen = Color(red: 0.2, green: 0.5, blue: 0.2)
    
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundColor(accentGreen.opacity(0.6))
            
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(accentGreen)
            
            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(Color(UIColor.systemBackground))
        .cornerRadius(14)
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Color.gray.opacity(0.08), lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.03), radius: 4, x: 0, y: 1)
    }
}

// MARK: - Profil Detay Satırı Bileşeni
struct ProfileDetailItem: View {
    let label: String
    let value: String
    let icon: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.caption2)
                    .foregroundColor(.secondary)
                Text(label)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Text(value)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(.primary)
        }
    }
}

#Preview {
    ProfileView()
        .environmentObject(AuthManager())
}
