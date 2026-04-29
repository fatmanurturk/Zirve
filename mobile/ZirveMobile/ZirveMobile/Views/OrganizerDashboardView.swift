import SwiftUI

@MainActor
class OrganizerDashboardViewModel: ObservableObject {
    @Published var events: [Event] = []
    @Published var isLoading = true
    @Published var errorMessage: String?
    
    private let baseURL = "http://localhost:8000/api/v1"
    
    func fetchMyEvents(token: String?) async {
        guard let token = token else { return }
        
        isLoading = true
        errorMessage = nil
        
        guard let url = URL(string: "\(baseURL)/events/users/me/events") else {
            errorMessage = "Geçersiz URL"
            isLoading = false
            return
        }
        
        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                errorMessage = "Sunucu Hatası. Etkinlikler alınamadı."
                isLoading = false
                return
            }
            
            let decoder = JSONDecoder()
            let decodedResponse = try decoder.decode(EventListResponse.self, from: data)
            self.events = decodedResponse.items
        } catch {
            errorMessage = "Ağ Hatası: \(error.localizedDescription)"
        }
        
        isLoading = false
    }
    
    var activeEventsCount: Int {
        events.filter { $0.status.uppercased() == "OPEN" }.count
    }
}

struct OrganizerDashboardView: View {
    @EnvironmentObject var authManager: AuthManager
    @StateObject private var viewModel = OrganizerDashboardViewModel()
    
    private let accentGreen = Color(red: 0.05, green: 0.45, blue: 0.3)
    
    var body: some View {
        NavigationStack {
            ZStack {
                Color(UIColor.secondarySystemBackground)
                    .ignoresSafeArea()
                
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 24) {
                        
                        // Header
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Organizatör Paneli")
                                .font(.system(size: 28, weight: .bold))
                                .foregroundColor(.primary)
                            
                            Text("Etkinliklerinizi yönetin ve başvuruları inceleyin.")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 20)
                        .padding(.top, 10)
                        
                        // İstatistik Kartları
                        HStack(spacing: 16) {
                            statCard(title: "Toplam Etkinlik", value: "\(viewModel.events.count)", color: .blue)
                            statCard(title: "Aktif Etkinlik", value: "\(viewModel.activeEventsCount)", color: .green)
                        }
                        .padding(.horizontal, 20)
                        
                        // Etkinlikler Listesi
                        VStack(alignment: .leading, spacing: 16) {
                            HStack {
                                Text("Tüm Etkinlikler")
                                    .font(.title3)
                                    .fontWeight(.bold)
                                Spacer()
                            }
                            .padding(.horizontal, 20)
                            
                            if viewModel.isLoading && viewModel.events.isEmpty {
                                ProgressView("Yükleniyor...")
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 40)
                            } else if let error = viewModel.errorMessage {
                                Text(error)
                                    .foregroundColor(.red)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 40)
                            } else if viewModel.events.isEmpty {
                                VStack(spacing: 12) {
                                    Image(systemName: "inbox")
                                        .font(.system(size: 40))
                                        .foregroundColor(.secondary)
                                    Text("Henüz hiç etkinlik oluşturmadınız.")
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 40)
                                .background(Color(UIColor.systemBackground))
                                .cornerRadius(16)
                                .padding(.horizontal, 20)
                            } else {
                                LazyVStack(spacing: 16) {
                                    ForEach(viewModel.events) { event in
                                        NavigationLink(destination: EventDetailView(event: event)) {
                                            EventRowView(event: event)
                                        }
                                        .buttonStyle(PlainButtonStyle())
                                    }
                                }
                                .padding(.horizontal, 20)
                            }
                        }
                    }
                    .padding(.bottom, 30)
                }
                .refreshable {
                    await viewModel.fetchMyEvents(token: authManager.accessToken)
                }
            }
            .navigationBarHidden(true)
            .task {
                await viewModel.fetchMyEvents(token: authManager.accessToken)
            }
        }
    }
    
    @ViewBuilder
    private func statCard(title: String, value: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundColor(.secondary)
            
            Text(value)
                .font(.system(size: 32, weight: .bold))
                .foregroundColor(color)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .background(Color(UIColor.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.04), radius: 8, x: 0, y: 3)
    }
}

#Preview {
    OrganizerDashboardView()
        .environmentObject(AuthManager())
}
