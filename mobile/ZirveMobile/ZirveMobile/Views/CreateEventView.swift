import SwiftUI

struct EventCreateData: Codable {
    let title: String
    let description: String?
    let category: String
    let difficulty: String
    let location_name: String?
    let latitude: Double?
    let longitude: Double?
    let start_date: String
    let end_date: String
    let max_volunteers: Int?
    let requirements: [String: String]?
}

@MainActor
class CreateEventViewModel: ObservableObject {
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var successMessage: String?
    
    private let baseURL = "http://localhost:8000/api/v1"
    
    func createEvent(token: String?, data: EventCreateData) async -> Bool {
        guard let token = token else { return false }
        
        isLoading = true
        errorMessage = nil
        successMessage = nil
        
        guard let url = URL(string: "\(baseURL)/events/") else {
            errorMessage = "Geçersiz URL"
            isLoading = false
            return false
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
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
            
            if httpResponse.statusCode == 201 {
                successMessage = "Etkinlik başarıyla oluşturuldu!"
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

struct CreateEventView: View {
    @EnvironmentObject var authManager: AuthManager
    @StateObject private var viewModel = CreateEventViewModel()
    
    @State private var title = ""
    @State private var description = ""
    @State private var category = "HIKING"
    @State private var difficulty = "EASY"
    @State private var locationName = ""
    @State private var startDate = Date()
    @State private var endDate = Date().addingTimeInterval(86400) // +1 day
    @State private var maxVolunteersString = ""
    
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
        NavigationStack {
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
                    TextField("Konum (Örn: Kaz Dağları)", text: $locationName)
                    
                    DatePicker("Başlangıç Tarihi", selection: $startDate)
                    DatePicker("Bitiş Tarihi", selection: $endDate)
                }
                
                Section(header: Text("Katılımcı Bilgileri")) {
                    TextField("Maksimum Gönüllü Sayısı (Boş bırakılabilir)", text: $maxVolunteersString)
                        .keyboardType(.numberPad)
                }
                
                Section {
                    Button(action: submitForm) {
                        if viewModel.isLoading {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                        } else {
                            Text("Etkinliği Oluştur")
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
            .navigationTitle("Yeni Etkinlik")
            .alert(isPresented: $showAlert) {
                if let error = viewModel.errorMessage {
                    return Alert(title: Text("Hata"), message: Text(error), dismissButton: .default(Text("Tamam")))
                } else if let success = viewModel.successMessage {
                    return Alert(title: Text("Başarılı"), message: Text(success), dismissButton: .default(Text("Tamam")) {
                        resetForm()
                    })
                }
                return Alert(title: Text("Bilinmeyen Durum"))
            }
        }
    }
    
    private func submitForm() {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        let maxVol = Int(maxVolunteersString)
        
        let eventData = EventCreateData(
            title: title,
            description: description.isEmpty ? nil : description,
            category: category.lowercased(),
            difficulty: difficulty.lowercased(),
            location_name: locationName.isEmpty ? nil : locationName,
            latitude: nil,
            longitude: nil,
            start_date: formatter.string(from: startDate),
            end_date: formatter.string(from: endDate),
            max_volunteers: maxVol,
            requirements: [:]
        )
        
        Task {
            let success = await viewModel.createEvent(token: authManager.accessToken, data: eventData)
            if success || viewModel.errorMessage != nil {
                showAlert = true
            }
        }
    }
    
    private func resetForm() {
        title = ""
        description = ""
        category = "HIKING"
        difficulty = "EASY"
        locationName = ""
        startDate = Date()
        endDate = Date().addingTimeInterval(86400)
        maxVolunteersString = ""
    }
}

#Preview {
    CreateEventView()
        .environmentObject(AuthManager())
}
