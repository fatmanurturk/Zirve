import SwiftUI

struct EventApplicantsView: View {
    let eventId: String
    @EnvironmentObject var authManager: AuthManager
    
    @State private var applicants: [ApplicationItem] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    
    private let accentGreen = Color(red: 0.05, green: 0.45, blue: 0.3)
    
    var body: some View {
        List {
            if isLoading {
                HStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
                .listRowBackground(Color.clear)
            } else if applicants.isEmpty {
                VStack(spacing: 12) {
                    Spacer()
                    Text("🏜️")
                        .font(.system(size: 50))
                    Text("Henüz başvuru bulunmuyor.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Spacer()
                }
                .frame(maxWidth: .infinity, minHeight: 200)
                .listRowBackground(Color.clear)
            } else {
                ForEach(applicants) { app in
                    NavigationLink(destination: VolunteerView(volunteerId: app.volunteer_id)) {
                        ApplicantRow(app: app) { newStatus in
                            updateStatus(appId: app.id, status: newStatus)
                        }
                    }
                }
            }
        }
        .navigationTitle("Başvurular")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await fetchApplicants()
        }
        .refreshable {
            await fetchApplicants()
        }
    }
    
    private func fetchApplicants() async {
        let baseURL = "http://localhost:8000/api/v1"
        guard let url = URL(string: "\(baseURL)/events/\(eventId)/applications") else { return }
        guard let token = authManager.accessToken else { return }
        
        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                let decoded = try JSONDecoder().decode(ApplicationListResponse.self, from: data)
                self.applicants = decoded.items
            } else {
                errorMessage = "Başvurular yüklenemedi."
            }
        } catch {
            errorMessage = "Bağlantı hatası."
        }
        isLoading = false
    }
    
    private func updateStatus(appId: String, status: String) {
        let baseURL = "http://localhost:8000/api/v1"
        guard let url = URL(string: "\(baseURL)/events/\(eventId)/applications/\(appId)") else { return }
        guard let token = authManager.accessToken else { return }
        
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["status": status]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        Task {
            do {
                let (_, response) = try await URLSession.shared.data(for: request)
                if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                    await fetchApplicants()
                }
            } catch {
                print("Status update error")
            }
        }
    }
}

struct ApplicantRow: View {
    let app: ApplicationItem
    let onAction: (String) -> Void
    
    private let accentGreen = Color(red: 0.05, green: 0.45, blue: 0.3)
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                // Avatar
                ZStack {
                    Circle()
                        .fill(accentGreen.opacity(0.1))
                        .frame(width: 44, height: 44)
                    
                    if let avatarUrl = app.volunteer_avatar_url, let url = URL(string: avatarUrl) {
                        AsyncImage(url: url) { image in
                            image.resizable()
                                .aspectRatio(contentMode: .fill)
                        } placeholder: {
                            ProgressView()
                        }
                        .frame(width: 44, height: 44)
                        .clipShape(Circle())
                    } else {
                        Text(app.volunteer_name?.prefix(1).uppercased() ?? "G")
                            .font(.headline)
                            .foregroundColor(accentGreen)
                    }
                }
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(app.volunteer_name ?? "Gönüllü")
                        .font(.subheadline)
                        .fontWeight(.bold)
                    
                    Text(formatDate(app.applied_at))
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                // Status Badge
                Text(statusLabel)
                    .font(.system(size: 10, weight: .bold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(statusColor.opacity(0.1))
                    .foregroundColor(statusColor)
                    .cornerRadius(8)
            }
            
            if let motivation = app.motivation_letter, !motivation.isEmpty {
                Text(motivation)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(UIColor.secondarySystemBackground))
                    .cornerRadius(10)
            }
            
            if app.status.lowercased() == "pending" {
                HStack(spacing: 12) {
                    Button(action: { onAction("approved") }) {
                        Label("Onayla", systemImage: "checkmark.circle.fill")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .padding(.vertical, 8)
                            .frame(maxWidth: .infinity)
                            .background(accentGreen)
                            .cornerRadius(10)
                    }
                    .buttonStyle(PlainButtonStyle())
                    
                    Button(action: { onAction("rejected") }) {
                        Label("Reddet", systemImage: "xmark.circle.fill")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(.red)
                            .padding(.vertical, 8)
                            .frame(maxWidth: .infinity)
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(10)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
        }
        .padding(.vertical, 8)
    }
    
    private var statusLabel: String {
        switch app.status.lowercased() {
        case "approved": return "ONAYLANDI"
        case "rejected": return "REDDEDİLDİ"
        default: return "BEKLEMEDE"
        }
    }
    
    private var statusColor: Color {
        switch app.status.lowercased() {
        case "approved": return accentGreen
        case "rejected": return .red
        default: return .orange
        }
    }
    
    private func formatDate(_ dateStr: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: dateStr) else { return dateStr }
        
        let df = DateFormatter()
        df.locale = Locale(identifier: "tr_TR")
        df.dateStyle = .medium
        return df.string(from: date)
    }
}

#Preview {
    NavigationStack {
        EventApplicantsView(eventId: "123")
            .environmentObject(AuthManager())
    }
}
