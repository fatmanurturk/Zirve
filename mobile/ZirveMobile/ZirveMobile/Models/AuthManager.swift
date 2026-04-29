import Foundation
import Combine

// MARK: - Kullanıcı Modeli (API: /auth/me)
struct UserInfo: Codable {
    let id: String
    let email: String
    let full_name: String
    let role: String
    let is_active: Bool
}

// MARK: - İstatistik Modeli (API: /volunteers/me/stats)
struct UserStats: Codable {
    let total_applications: Int
    let approved_applications: Int
    let checked_in_count: Int
    let total_impact_score: Int
    let badge_count: Int
}

// MARK: - Gönüllü Profil Modeli (API: /volunteers/me/profile)
struct VolunteerProfile: Codable {
    let id: String
    let user_id: String
    let bio: String?
    let experience_level: String
    let max_altitude_m: Int?
    let total_impact_score: Int
    let city: String?
}

@MainActor
class AuthManager: ObservableObject {
    @Published var isAuthenticated = false
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var currentUser: UserInfo?
    @Published var userStats: UserStats?
    @Published var volunteerProfile: VolunteerProfile?
    
    var accessToken: String? {
        didSet {
            isAuthenticated = accessToken != nil
            if accessToken != nil {
                Task { await fetchUserData() }
            } else {
                currentUser = nil
                userStats = nil
                volunteerProfile = nil
            }
        }
    }
    
    private let baseURL = "http://localhost:8000/api/v1"
    
    // MARK: - Response Modelleri
    struct TokenResponse: Codable {
        let access_token: String
        let token_type: String?
    }
    
    // MARK: - Login
    func login(email: String, password: String) async {
        isLoading = true
        errorMessage = nil
        
        guard let url = URL(string: "\(baseURL)/auth/login") else {
            errorMessage = "Geçersiz URL"
            isLoading = false
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let loginData = ["email": email, "password": password]
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: loginData)
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                errorMessage = "Sunucu yanıt vermedi."
                isLoading = false
                return
            }
            
            if httpResponse.statusCode == 200 {
                let decodedResponse = try JSONDecoder().decode(TokenResponse.self, from: data)
                self.accessToken = decodedResponse.access_token
            } else if httpResponse.statusCode == 401 {
                errorMessage = "E-posta veya şifre hatalı."
            } else {
                if let errorData = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
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
    }
    
    // MARK: - Register
    func register(email: String, password: String, fullName: String, role: String, phone: String?) async {
        isLoading = true
        errorMessage = nil
        
        guard let url = URL(string: "\(baseURL)/auth/register") else {
            errorMessage = "Geçersiz URL"
            isLoading = false
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        var registerData: [String: Any] = [
            "email": email,
            "password": password,
            "full_name": fullName,
            "role": role
        ]
        
        if let phone = phone, !phone.isEmpty {
            registerData["phone"] = phone
        }
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: registerData)
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                errorMessage = "Sunucu yanıt vermedi."
                isLoading = false
                return
            }
            
            if httpResponse.statusCode == 201 {
                let decodedResponse = try JSONDecoder().decode(TokenResponse.self, from: data)
                self.accessToken = decodedResponse.access_token
            } else if httpResponse.statusCode == 400 {
                if let errorData = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let detail = errorData["detail"] as? String {
                    if detail.contains("already registered") {
                        errorMessage = "Bu e-posta adresi zaten kayıtlı."
                    } else {
                        errorMessage = detail
                    }
                } else {
                    errorMessage = "Geçersiz bilgiler girdiniz."
                }
            } else {
                if let errorData = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
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
    }
    
    // MARK: - Fetch User Data (me + stats + profile)
    func fetchUserData() async {
        guard let token = accessToken else { return }
        
        // 1. Kullanıcı bilgileri (/auth/me)
        if let url = URL(string: "\(baseURL)/auth/me") {
            var request = URLRequest(url: url)
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            if let (data, response) = try? await URLSession.shared.data(for: request),
               let httpResponse = response as? HTTPURLResponse,
               httpResponse.statusCode == 200 {
                self.currentUser = try? JSONDecoder().decode(UserInfo.self, from: data)
            }
        }
        
        // 2. İstatistikler (/volunteers/me/stats)
        if let url = URL(string: "\(baseURL)/volunteers/me/stats") {
            var request = URLRequest(url: url)
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            if let (data, response) = try? await URLSession.shared.data(for: request),
               let httpResponse = response as? HTTPURLResponse,
               httpResponse.statusCode == 200 {
                self.userStats = try? JSONDecoder().decode(UserStats.self, from: data)
            }
        }
        
        // 3. Gönüllü profili (/volunteers/me/profile)
        if let url = URL(string: "\(baseURL)/volunteers/me/profile") {
            var request = URLRequest(url: url)
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            if let (data, response) = try? await URLSession.shared.data(for: request),
               let httpResponse = response as? HTTPURLResponse,
               httpResponse.statusCode == 200 {
                self.volunteerProfile = try? JSONDecoder().decode(VolunteerProfile.self, from: data)
            }
        }
    }
    
    // MARK: - Logout
    func logout() {
        self.accessToken = nil
        self.errorMessage = nil
    }
}
