import SwiftUI

// MARK: - Models

struct PublicVolunteerProfile: Codable {
    let user_id: String
    let full_name: String
    let avatar_url: String?
    let city: String?
    let experience_level: String
    let total_impact_score: Int
    let badge_count: Int
}

struct OrganizerVolunteerProfile: Codable {
    let user_id: String
    let full_name: String
    let email: String
    let phone: String?
    let avatar_url: String?
    let city: String?
    let experience_level: String?
    let total_impact_score: Int
    let badge_count: Int
    let bio: String?
    let emergency_contact: EmergencyContact?
}

struct EmergencyContact: Codable {
    let name: String?
    let phone: String?
    let relation: String?
}

// MARK: - View

struct VolunteerView: View {
    let volunteerId: String
    @EnvironmentObject var authManager: AuthManager

    @State private var publicProfile: PublicVolunteerProfile?
    @State private var organizerProfile: OrganizerVolunteerProfile?
    @State private var isLoading = true
    @State private var errorMessage: String?

    private let accentGreen = Color(red: 0.05, green: 0.45, blue: 0.3)
    private let baseURL = Config.baseURL

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                if isLoading {
                    ProgressView()
                        .padding(.top, 60)
                } else if let error = errorMessage {
                    Text(error)
                        .foregroundColor(.red)
                        .padding(.top, 60)
                } else {
                    avatarSection
                    statsSection
                    if let org = organizerProfile {
                        contactSection(org)
                    }
                    aboutSection
                }
            }
            .padding(.bottom, 40)
        }
        .background(Color(UIColor.secondarySystemBackground).ignoresSafeArea())
        .navigationTitle("Gönüllü Profili")
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadProfile() }
    }

    // MARK: - Sections

    private var avatarSection: some View {
        VStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(accentGreen.opacity(0.1))
                    .frame(width: 100, height: 100)

                let avatarUrl = organizerProfile?.avatar_url ?? publicProfile?.avatar_url
                if let urlStr = avatarUrl, let url = URL(string: urlStr) {
                    AsyncImage(url: url) { image in
                        image.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: {
                        ProgressView()
                    }
                    .frame(width: 100, height: 100)
                    .clipShape(Circle())
                } else {
                    Image(systemName: "person.fill")
                        .font(.system(size: 40))
                        .foregroundColor(accentGreen)
                }
            }
            .shadow(color: .black.opacity(0.08), radius: 10, x: 0, y: 4)

            let name = organizerProfile?.full_name ?? publicProfile?.full_name ?? ""
            let city = organizerProfile?.city ?? publicProfile?.city
            let level = organizerProfile?.experience_level ?? publicProfile?.experience_level ?? ""

            Text(name)
                .font(.title2)
                .fontWeight(.bold)

            HStack(spacing: 8) {
                Text("Gönüllü")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(accentGreen)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(accentGreen.opacity(0.1))
                    .cornerRadius(20)

                if let city {
                    Text("📍 \(city)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                if !level.isEmpty {
                    Text(experienceText(level))
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(accentGreen.opacity(0.8))
                        .cornerRadius(20)
                }
            }
        }
        .padding(.top, 24)
    }

    private var statsSection: some View {
        let score = organizerProfile?.total_impact_score ?? publicProfile?.total_impact_score ?? 0
        let badges = organizerProfile?.badge_count ?? publicProfile?.badge_count ?? 0

        return HStack(spacing: 16) {
            StatBox(value: "\(score)", label: "Etki Puanı", icon: "bolt.fill")
            StatBox(value: "\(badges)", label: "Rozet", icon: "medal.fill")
        }
        .padding(.horizontal, 16)
    }

    private func contactSection(_ org: OrganizerVolunteerProfile) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("İletişim Bilgileri", systemImage: "person.text.rectangle.fill")
                .font(.headline)
                .fontWeight(.bold)
                .foregroundColor(accentGreen)

            VStack(spacing: 10) {
                // E-posta
                contactRow(
                    icon: "envelope.fill",
                    iconColor: accentGreen,
                    title: "E-posta",
                    value: org.email,
                    linkURL: "mailto:\(org.email)"
                )

                // Telefon
                if let phone = org.phone, !phone.isEmpty {
                    contactRow(
                        icon: "phone.fill",
                        iconColor: accentGreen,
                        title: "Telefon",
                        value: phone,
                        linkURL: "tel:\(phone)"
                    )
                }

                // Acil Durum Kişisi
                if let ec = org.emergency_contact,
                   ec.name != nil || ec.phone != nil {
                    emergencyContactRow(ec)
                }
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(UIColor.systemBackground))
        .cornerRadius(20)
        .shadow(color: Color.black.opacity(0.04), radius: 10, x: 0, y: 5)
        .padding(.horizontal, 16)
    }

    private func contactRow(icon: String, iconColor: Color, title: String, value: String, linkURL: String) -> some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 8)
                    .fill(iconColor.opacity(0.1))
                    .frame(width: 36, height: 36)
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(iconColor)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.caption2)
                    .fontWeight(.bold)
                    .foregroundColor(.secondary)
                    .textCase(.uppercase)

                if let url = URL(string: linkURL) {
                    Link(value, destination: url)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                } else {
                    Text(value)
                        .font(.subheadline)
                        .fontWeight(.medium)
                }
            }

            Spacer()
        }
        .padding(12)
        .background(Color(UIColor.secondarySystemBackground))
        .cornerRadius(12)
    }

    private func emergencyContactRow(_ ec: EmergencyContact) -> some View {
        HStack(alignment: .top, spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color.red.opacity(0.1))
                    .frame(width: 36, height: 36)
                Image(systemName: "staroflife.fill")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.red)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Acil Durum Kişisi")
                    .font(.caption2)
                    .fontWeight(.bold)
                    .foregroundColor(.red.opacity(0.7))
                    .textCase(.uppercase)

                if let name = ec.name {
                    Text(name)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                }
                if let relation = ec.relation {
                    Text(relation)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                if let phone = ec.phone, let url = URL(string: "tel:\(phone)") {
                    Link(phone, destination: url)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.red)
                }
            }

            Spacer()
        }
        .padding(12)
        .background(Color.red.opacity(0.05))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.red.opacity(0.15), lineWidth: 1)
        )
    }

    private var aboutSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Hakkında")
                .font(.headline)
                .fontWeight(.bold)

            let bio = organizerProfile?.bio
            if let bio, !bio.isEmpty {
                Text(bio)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineSpacing(4)
            } else {
                Text("Bu gönüllü Zirve topluluğunun aktif bir üyesidir.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineSpacing(4)
            }

            let level = organizerProfile?.experience_level ?? publicProfile?.experience_level ?? ""
            if !level.isEmpty {
                HStack(spacing: 6) {
                    Text("Deneyim Seviyesi:")
                        .font(.subheadline)
                        .fontWeight(.medium)
                    Text(experienceText(level))
                        .font(.subheadline)
                        .fontWeight(.bold)
                        .foregroundColor(accentGreen)
                }
                .padding(.top, 4)
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(UIColor.systemBackground))
        .cornerRadius(20)
        .shadow(color: Color.black.opacity(0.03), radius: 10, x: 0, y: 5)
        .padding(.horizontal, 16)
    }

    // MARK: - Data Fetching

    private func loadProfile() async {
        isLoading = true

        if authManager.currentUser?.role.lowercased() == "organizer",
           let token = authManager.accessToken {
            if await fetchOrganizerProfile(token: token) {
                isLoading = false
                return
            }
        }

        await fetchPublicProfile()
        isLoading = false
    }

    @discardableResult
    private func fetchOrganizerProfile(token: String) async -> Bool {
        guard let url = URL(string: "\(baseURL)/volunteers/\(volunteerId)/organizer-view") else { return false }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            if let http = response as? HTTPURLResponse, http.statusCode == 200 {
                self.organizerProfile = try? JSONDecoder().decode(OrganizerVolunteerProfile.self, from: data)
                return organizerProfile != nil
            }
        } catch {}
        return false
    }

    private func fetchPublicProfile() async {
        guard let url = URL(string: "\(baseURL)/volunteers/\(volunteerId)/profile") else { return }

        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            if let http = response as? HTTPURLResponse, http.statusCode == 200 {
                self.publicProfile = try? JSONDecoder().decode(PublicVolunteerProfile.self, from: data)
            } else {
                errorMessage = "Profil yüklenemedi."
            }
        } catch {
            errorMessage = "Bağlantı hatası."
        }
    }

    // MARK: - Helpers

    private func experienceText(_ level: String) -> String {
        switch level.lowercased() {
        case "beginner": return "Başlangıç"
        case "intermediate": return "Orta"
        case "advanced", "expert": return "Uzman"
        default: return level.capitalized
        }
    }
}

// MARK: - StatBox

struct StatBox: View {
    let value: String
    let label: String
    let icon: String

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.headline)
                .foregroundColor(Color(red: 0.05, green: 0.45, blue: 0.3))
            Text(value)
                .font(.title3)
                .fontWeight(.bold)
            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
                .fontWeight(.bold)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
        .background(Color(UIColor.systemBackground))
        .cornerRadius(20)
        .shadow(color: Color.black.opacity(0.03), radius: 10, x: 0, y: 5)
    }
}

#Preview {
    NavigationStack {
        VolunteerView(volunteerId: "123")
            .environmentObject(AuthManager())
    }
}
