import SwiftUI

struct EventApplicationView: View {
    let event: Event
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) private var dismiss
    
    @State private var motivationLetter: String = ""
    @State private var isSubmitting = false
    @State private var showSuccessAlert = false
    @State private var showErrorAlert = false
    @State private var errorMessage = ""
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                
                // Etkinlik Özeti Kartı
                VStack(alignment: .leading, spacing: 12) {
                    HStack(spacing: 10) {
                        Image(systemName: "leaf.fill")
                            .font(.title2)
                            .foregroundColor(.green)
                        
                        Text(event.title)
                            .font(.title3)
                            .fontWeight(.bold)
                            .lineLimit(2)
                    }
                    
                    HStack(spacing: 16) {
                        Label(formatDate(event.start_date), systemImage: "calendar")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        if let location = event.location_name {
                            Label(location, systemImage: "mappin")
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                        }
                    }
                }
                .padding(16)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(UIColor.secondarySystemGroupedBackground))
                .cornerRadius(16)
                
                // Motivasyon Mektubu Bölümü
                VStack(alignment: .leading, spacing: 10) {
                    Text("Motivasyon Mektubunuz")
                        .font(.headline)
                        .fontWeight(.bold)
                    
                    Text("Neden bu etkinliğe katılmak istiyorsunuz? (İsteğe bağlı)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    TextEditor(text: $motivationLetter)
                        .frame(minHeight: 150)
                        .padding(12)
                        .background(Color(UIColor.secondarySystemGroupedBackground))
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.green.opacity(0.3), lineWidth: 1)
                        )
                        .overlay(alignment: .topLeading, content: {
                            if motivationLetter.isEmpty {
                                Text("Bu etkinliğe katılmak isteme nedeninizi yazabilirsiniz...")
                                    .foregroundColor(.gray.opacity(0.5))
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 20)
                                    .allowsHitTesting(false)
                            }
                        })
                    
                    Text("\(motivationLetter.count)/500 karakter")
                        .font(.caption2)
                        .foregroundColor(motivationLetter.count > 500 ? .red : .secondary)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                }
                
                // Bilgilendirme Kutusu
                HStack(alignment: .top, spacing: 10) {
                    Image(systemName: "info.circle.fill")
                        .foregroundColor(.blue)
                        .font(.body)
                    
                    Text("Başvurunuz onaylandığında size bildirim gönderilecektir. Başvuru durumunuzu profil sayfanızdan takip edebilirsiniz.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding(14)
                .background(Color.blue.opacity(0.08))
                .cornerRadius(12)
                
                Spacer(minLength: 20)
                
                // Başvur Butonu
                Button(action: {
                    Task {
                        await submitApplication()
                    }
                }) {
                    HStack(spacing: 8) {
                        if isSubmitting {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Image(systemName: "paperplane.fill")
                        }
                        Text(isSubmitting ? "Gönderiliyor..." : "Başvuruyu Gönder")
                            .fontWeight(.bold)
                    }
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(
                        LinearGradient(
                            colors: [Color.green, Color.mint],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .cornerRadius(16)
                    .shadow(color: .green.opacity(0.3), radius: 8, x: 0, y: 4)
                }
                .disabled(isSubmitting || motivationLetter.count > 500)
                .opacity((isSubmitting || motivationLetter.count > 500) ? 0.6 : 1)
                .padding(.bottom, 30)
            }
            .padding(.horizontal, 20)
            .padding(.top, 20)
        }
        .navigationTitle("Etkinliğe Başvur")
        .navigationBarTitleDisplayMode(.large)
        .alert("Başvurunuz Alındı! 🎉", isPresented: $showSuccessAlert) {
            Button("Tamam") {
                dismiss()
            }
        } message: {
            Text("Başvurunuz başarıyla gönderildi. Durumunuzu profil sayfanızdan takip edebilirsiniz.")
        }
        .alert("Hata", isPresented: $showErrorAlert) {
            Button("Tamam", role: .cancel) {}
        } message: {
            Text(errorMessage)
        }
    }
    
    private func submitApplication() async {
        guard let token = authManager.accessToken else {
            errorMessage = "Başvuru yapmak için giriş yapmanız gerekiyor."
            showErrorAlert = true
            return
        }
        
        isSubmitting = true
        
        let baseURL = "http://127.0.0.1:8000/api/v1"
        guard let url = URL(string: "\(baseURL)/events/\(event.id)/apply") else {
            errorMessage = "Geçersiz URL"
            showErrorAlert = true
            isSubmitting = false
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let body: [String: Any] = [
            "motivation_letter": motivationLetter.isEmpty ? NSNull() : motivationLetter
        ]
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                errorMessage = "Sunucu yanıt vermedi."
                showErrorAlert = true
                isSubmitting = false
                return
            }
            
            switch httpResponse.statusCode {
            case 201:
                showSuccessAlert = true
            case 401:
                errorMessage = "Oturum süreniz dolmuş. Lütfen tekrar giriş yapın."
                showErrorAlert = true
            case 403:
                errorMessage = "Sadece gönüllüler etkinliklere başvurabilir."
                showErrorAlert = true
            case 404:
                errorMessage = "Etkinlik bulunamadı."
                showErrorAlert = true
            case 400:
                errorMessage = "Bu etkinlik başvuruya açık değil."
                showErrorAlert = true
            case 409:
                errorMessage = "Bu etkinliğe zaten başvurdunuz."
                showErrorAlert = true
            default:
                if let errorData = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let detail = errorData["detail"] as? String {
                    errorMessage = detail
                } else {
                    errorMessage = "Bir hata oluştu. (Kod: \(httpResponse.statusCode))"
                }
                showErrorAlert = true
            }
        } catch {
            errorMessage = "Bağlantı hatası: \(error.localizedDescription)"
            showErrorAlert = true
        }
        
        isSubmitting = false
    }
    
    private func formatDate(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: isoString) {
            let displayFormatter = DateFormatter()
            displayFormatter.locale = Locale(identifier: "tr_TR")
            displayFormatter.dateStyle = .medium
            displayFormatter.timeStyle = .short
            return displayFormatter.string(from: date)
        }
        return isoString
    }
}

#Preview {
    NavigationStack {
        EventApplicationView(event: Event(
            id: "1",
            title: "Kışın Zorlu Tırmanışı ve Kamp Eğitimi",
            description: "Katılımcılarımızla birlikte kış koşullarında zirveye tırmanacağız.",
            category: "Doga Yuruyusu",
            difficulty: "Zor",
            location_name: "Uludağ Zirve, Bursa",
            start_date: "2026-03-31T09:00:00Z",
            end_date: "2026-04-01T15:00:00Z",
            max_volunteers: 15
        ))
        .environmentObject(AuthManager())
    }
}
