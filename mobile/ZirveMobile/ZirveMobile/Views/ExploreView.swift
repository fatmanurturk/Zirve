import SwiftUI

// MARK: - Network Manager
@MainActor
class NetworkManager: ObservableObject {
    @Published var events: [Event] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let baseURL = "http://localhost:8000/api/v1"
    
    func fetchOpenEvents() async {
        isLoading = true
        errorMessage = nil
        
        guard let url = URL(string: "\(baseURL)/events/?status=open&limit=10") else {
            errorMessage = "Geçersiz URL"
            isLoading = false
            return
        }
        
        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            
            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                errorMessage = "Sunucu Hatası. Bağlantı reddedildi."
                isLoading = false
                return
            }
            
            let decoder = JSONDecoder()
            let decodedResponse = try decoder.decode(EventListResponse.self, from: data)
            self.events = decodedResponse.items
        } catch {
            errorMessage = "Backend sunucusuna ulaşılamadı. (FastAPI çalışıyor mu?)"
            print("Fetch error: \(error)")
        }
        
        isLoading = false
    }
}

// MARK: - ExploreView
struct ExploreView: View {
    @StateObject private var networkManager = NetworkManager()
    
    var body: some View {
        NavigationStack {
            ZStack {
                Color(UIColor.systemGroupedBackground)
                    .ignoresSafeArea()
                
                if networkManager.isLoading && networkManager.events.isEmpty {
                    ProgressView("Zirve'ye Bağlanılıyor...")
                } else if let error = networkManager.errorMessage, networkManager.events.isEmpty {
                    VStack {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.largeTitle)
                            .foregroundColor(.orange)
                        Text(error)
                            .multilineTextAlignment(.center)
                            .padding()
                        Button("Tekrar Dene") {
                            Task {
                                await networkManager.fetchOpenEvents()
                            }
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.green)
                    }
                } else if networkManager.events.isEmpty {
                    Text("Şu an hiç açık etkinlik bulunmuyor.")
                        .foregroundColor(.secondary)
                } else {
                    ScrollView {
                        LazyVStack(spacing: 16) {
                            ForEach(networkManager.events) { event in
                                NavigationLink(destination: EventDetailView(event: event)) {
                                    EventRowView(event: event)
                                }
                                .buttonStyle(PlainButtonStyle())
                            }
                        }
                        .padding()
                    }
                    .refreshable {
                        await networkManager.fetchOpenEvents()
                    }
                }
            }
            .navigationTitle("Keşfet")
            .task {
                await networkManager.fetchOpenEvents()
            }
        }
    }
}

struct EventRowView: View {
    let event: Event
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            
            HStack {
                Text(event.category.uppercased())
                    .font(.caption)
                    .fontWeight(.bold)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(Color.green.opacity(0.15))
                    .foregroundColor(.green)
                    .cornerRadius(8)
                
                Spacer()
                
                Text(event.difficulty.uppercased())
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.secondary)
            }
            
            Text(event.title)
                .font(.headline)
                .fontWeight(.bold)
                .foregroundColor(.primary)
                .lineLimit(2)
            
            HStack(spacing: 15) {
                HStack(spacing: 4) {
                    Image(systemName: "mappin.and.ellipse")
                        .foregroundColor(.green)
                    Text(event.location_name ?? "Gizli")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
                
                HStack(spacing: 4) {
                    Image(systemName: "calendar")
                        .foregroundColor(.green)
                    Text(formatDate(event.start_date))
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(16)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
    }
    
    private func formatDate(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: isoString) {
            let displayFormatter = DateFormatter()
            displayFormatter.dateStyle = .medium
            return displayFormatter.string(from: date)
        }
        return isoString
    }
}

#Preview {
    ExploreView()
}
