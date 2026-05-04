import SwiftUI

struct PublicVolunteerProfile: Codable {
    let user_id: String
    let full_name: String
    let avatar_url: String?
    let city: String?
    let experience_level: String
    let total_impact_score: Int
    let badge_count: Int
}

struct VolunteerView: View {
    let volunteerId: String
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) private var dismiss
    
    @State private var profile: PublicVolunteerProfile?
    @State private var isLoading = true
    @State private var errorMessage: String?
    
    private let accentGreen = Color(red: 0.05, green: 0.45, blue: 0.3)
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                if isLoading {
                    ProgressView()
                        .padding(.top, 50)
                } else if let profile = profile {
                    // Profile Header
                    VStack(spacing: 16) {
                        ZStack {
                            Circle()
                                .fill(accentGreen.opacity(0.1))
                                .frame(width: 100, height: 100)
                            
                            if let avatarUrl = profile.avatar_url, let url = URL(string: avatarUrl) {
                                AsyncImage(url: url) { image in
                                    image.resizable()
                                        .aspectRatio(contentMode: .fill)
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
                        
                        VStack(spacing: 4) {
                            Text(profile.full_name)
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
                                
                                if let city = profile.city {
                                    Text("📍 \(city)")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                    }
                    .padding(.top, 20)
                    
                    // Stats
                    HStack(spacing: 16) {
                        StatBox(value: "\(profile.total_impact_score)", label: "Etki Puanı", icon: "bolt.fill")
                        StatBox(value: "\(profile.badge_count)", label: "Rozet", icon: "medal.fill")
                    }
                    .padding(.horizontal, 16)
                    
                    // About Section
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Hakkında")
                            .font(.headline)
                        
                        Text("Bu gönüllü Zirve topluluğunun aktif bir üyesidir. Doğa etkinliklerine katılarak hem toplumsal hem de ekolojik fayda sağlamaktadır.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .lineSpacing(4)
                        
                        HStack {
                            Text("Deneyim Seviyesi:")
                                .font(.subheadline)
                                .fontWeight(.medium)
                            
                            Text(experienceText(profile.experience_level))
                                .font(.subheadline)
                                .foregroundColor(accentGreen)
                                .fontWeight(.bold)
                        }
                        .padding(.top, 4)
                    }
                    .padding(20)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(UIColor.systemBackground))
                    .cornerRadius(20)
                    .shadow(color: Color.black.opacity(0.03), radius: 10, x: 0, y: 5)
                    .padding(.horizontal, 16)
                    
                } else if let error = errorMessage {
                    Text(error)
                        .foregroundColor(.red)
                        .padding(.top, 50)
                }
            }
            .padding(.bottom, 30)
        }
        .background(Color(UIColor.secondarySystemBackground).ignoresSafeArea())
        .navigationTitle("Gönüllü Profili")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await fetchProfile()
        }
    }
    
    private func fetchProfile() async {
        let baseURL = "http://localhost:8000/api/v1"
        guard let url = URL(string: "\(baseURL)/volunteers/\(volunteerId)/profile") else { return }
        
        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                self.profile = try? JSONDecoder().decode(PublicVolunteerProfile.self, from: data)
            } else {
                errorMessage = "Profil yüklenemedi."
            }
        } catch {
            errorMessage = "Bağlantı hatası."
        }
        isLoading = false
    }
    
    private func experienceText(_ level: String) -> String {
        switch level.lowercased() {
        case "beginner": return "Başlangıç"
        case "intermediate": return "Orta"
        case "advanced", "expert": return "Uzman"
        default: return level.capitalized
        }
    }
}

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
    VolunteerView(volunteerId: "123")
        .environmentObject(AuthManager())
}
