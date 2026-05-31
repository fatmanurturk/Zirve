import SwiftUI
import MapKit

@MainActor
class EditEventViewModel: ObservableObject {
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var successMessage: String?
    
    private let baseURL = Config.baseURL
    
    func updateEvent(eventId: String, token: String?, data: EventCreateData) async -> Bool {
        guard let token = token else { return false }
        
        isLoading = true
        errorMessage = nil
        successMessage = nil
        
        guard let url = URL(string: "\(baseURL)/events/\(eventId)") else {
            errorMessage = "Geçersiz URL"
            isLoading = false
            return false
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        do {
            request.httpBody = try JSONEncoder().encode(data)
            let (responseData, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                errorMessage = "Sunucu yanıt vermedi."
                isLoading = false
                return false
            }
            
            if httpResponse.statusCode == 200 {
                successMessage = "Etkinlik başarıyla güncellendi!"
                isLoading = false
                return true
            } else {
                if let errorData = try? JSONSerialization.jsonObject(with: responseData) as? [String: Any],
                   let detail = errorData["detail"] as? String {
                    errorMessage = detail
                } else {
                    errorMessage = "Bir hata oluştu. (Kod: \(httpResponse.statusCode))"
                }
            }
        } catch {
            errorMessage = "Bağlantı hatası: \(error.localizedDescription)"
        }
        
        isLoading = false
        return false
    }
}

struct EditEventView: View {
    let event: Event
    
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.presentationMode) var presentationMode
    
    @StateObject private var viewModel = EditEventViewModel()
    
    @State private var title: String = ""
    @State private var description: String = ""
    @State private var category: String = "HIKING"
    @State private var difficulty: String = "EASY"
    @State private var locationName: String = ""
    @State private var startDate: Date = Date()
    @State private var endDate: Date = Date()
    @State private var maxVolunteersString: String = ""
    @State private var waypoints: [Waypoint] = []
    @State private var showRouteEditor = false
    @State private var showAlert = false
    
    let categories = [
        ("Doğa Yürüyüşü", "HIKING"),
        ("Tırmanış", "CLIMBING"),
        ("Çevre & Doğa", "ENVIRONMENT"),
        ("Arama Kurtarma", "RESCUE"),
        ("Diğer", "OTHER")
    ]
    
    let difficulties = [
        ("Kolay", "EASY"),
        ("Orta", "MEDIUM"),
        ("Zor", "HARD"),
        ("Uzman", "EXPERT")
    ]
    
    var body: some View {
        Form {
            Section(header: Text("Temel Bilgiler")) {
                TextField("Etkinlik Başlığı", text: $title)
                
                Picker("Kategori", selection: $category) {
                    ForEach(categories, id: \.1) { cat in
                        Text(cat.0).tag(cat.1)
                    }
                }
                
                Picker("Zorluk Seviyesi", selection: $difficulty) {
                    ForEach(difficulties, id: \.1) { diff in
                        Text(diff.0).tag(diff.1)
                    }
                }
                
                TextField("Kısa Açıklama", text: $description, axis: .vertical)
                    .lineLimit(3...6)
            }
            
            Section(header: Text("Zaman ve Mekan")) {
                TextField("Konum", text: $locationName)
                
                DatePicker("Başlangıç Tarihi", selection: $startDate)
                DatePicker("Bitiş Tarihi", selection: $endDate)
            }
            
            Section(header: Text("Katılımcı Bilgileri")) {
                TextField("Maksimum Gönüllü Sayısı (Boş bırakılabilir)", text: $maxVolunteersString)
                    .keyboardType(.numberPad)
            }

            Section(header: Text("Etkinlik Rotası")) {
                if waypoints.isEmpty {
                    Button {
                        showRouteEditor = true
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: "map.fill")
                                .foregroundColor(Color(red: 0.1, green: 0.5, blue: 0.3))
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Rota Ekle")
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.primary)
                                Text("Gönüllüler için güzergah oluşturun")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                } else {
                    Button {
                        showRouteEditor = true
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(Color(red: 0.1, green: 0.5, blue: 0.3))
                                .font(.title3)
                            VStack(alignment: .leading, spacing: 3) {
                                Text("\(waypoints.count) durak")
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.primary)
                                Text(waypoints.prefix(2).map(\.label).joined(separator: " → ") + (waypoints.count > 2 ? " →…" : ""))
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                    .lineLimit(1)
                            }
                            Spacer()
                            Text("Düzenle")
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundColor(Color(red: 0.1, green: 0.5, blue: 0.3))
                        }
                    }

                    RoutePreviewMap(waypoints: waypoints)
                        .frame(height: 160)
                        .cornerRadius(12)
                        .listRowInsets(EdgeInsets(top: 8, leading: 8, bottom: 8, trailing: 8))

                    Button(role: .destructive) {
                        waypoints = []
                    } label: {
                        Label("Rotayı Kaldır", systemImage: "trash")
                            .font(.subheadline)
                    }
                }
            }

            Section {
                Button(action: submitForm) {
                    if viewModel.isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                    } else {
                        Text("Değişiklikleri Kaydet")
                            .fontWeight(.bold)
                            .frame(maxWidth: .infinity)
                            .foregroundColor(.white)
                    }
                }
                .padding(.vertical, 8)
                .listRowBackground(Color(red: 0.05, green: 0.45, blue: 0.3))
                .disabled(title.isEmpty || viewModel.isLoading)
            }
        }
        .navigationTitle("Etkinliği Düzenle")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { loadEventData() }
        .sheet(isPresented: $showRouteEditor) {
            RouteEditorView(savedWaypoints: $waypoints)
        }
        .alert(isPresented: $showAlert) {
            if let error = viewModel.errorMessage {
                return Alert(title: Text("Hata"), message: Text(error), dismissButton: .default(Text("Tamam")))
            } else if let success = viewModel.successMessage {
                return Alert(title: Text("Başarılı"), message: Text(success), dismissButton: .default(Text("Tamam")) {
                    presentationMode.wrappedValue.dismiss()
                })
            }
            return Alert(title: Text("Bilinmeyen Durum"))
        }
    }
    
    private func loadEventData() {
        title = event.title
        description = event.description ?? ""
        
        let upperCategory = event.category.uppercased()
        if categories.contains(where: { $0.1 == upperCategory }) {
            category = upperCategory
        }
        
        let upperDifficulty = event.difficulty.uppercased()
        if difficulties.contains(where: { $0.1 == upperDifficulty }) {
            difficulty = upperDifficulty
        }
        
        locationName = event.location_name ?? ""
        
        if let maxVol = event.max_volunteers {
            maxVolunteersString = "\(maxVol)"
        }
        
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        if let start = formatter.date(from: event.start_date) {
            startDate = start
        }
        
        if let end = formatter.date(from: event.end_date) {
            endDate = end
        }

        waypoints = event.waypoints ?? []
    }
    
    private func submitForm() {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        let maxVol = Int(maxVolunteersString)
        
        let firstWp = waypoints.first
        let wpCreate = waypoints.isEmpty ? nil : waypoints.map {
            WaypointCreate(order: $0.order, lat: $0.lat, lng: $0.lng, label: $0.label)
        }

        let eventData = EventCreateData(
            title: title,
            description: description.isEmpty ? nil : description,
            category: category.lowercased(),
            difficulty: difficulty.lowercased(),
            location_name: locationName.isEmpty ? nil : locationName,
            latitude: firstWp?.lat ?? event.latitude,
            longitude: firstWp?.lng ?? event.longitude,
            start_date: formatter.string(from: startDate),
            end_date: formatter.string(from: endDate),
            max_volunteers: maxVol,
            requirements: [:],
            waypoints: wpCreate
        )
        
        Task {
            let success = await viewModel.updateEvent(eventId: event.id, token: authManager.accessToken, data: eventData)
            if success || viewModel.errorMessage != nil {
                showAlert = true
            }
        }
    }
}
