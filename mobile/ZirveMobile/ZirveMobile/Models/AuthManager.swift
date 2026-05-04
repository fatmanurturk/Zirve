import Foundation
import Combine

// MARK: - Kullanıcı Modeli (API: /auth/me)
struct UserInfo: Codable {
    let id: String
    let email: String
    let full_name: String
    let role: String
    let is_active: Bool
    let phone: String?
}

// MARK: - Organization Model
struct Organization: Codable {
    let id: String
    let name: String
    let description: String?
    let logo_url: String?
    let website: String?
    let city: String?
    let category: String?
    let tags: [String]
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
    @Published var organization: Organization?
    @Published var hasOrganization: Bool = true // Default true to avoid flash
    
    var accessToken: String? {
        didSet {
            isAuthenticated = accessToken != nil
            if accessToken != nil {
                Task { await fetchUserData() }
            } else {
                currentUser = nil
                userStats = nil
                volunteerProfile = nil
                organization = nil
                hasOrganization = true
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
    
    // MARK: - Profile Updates
    func updateUserInfo(fullName: String, phone: String?) async -> Bool {
        guard let token = accessToken else { return false }
        
        guard let url = URL(string: "\(baseURL)/auth/me") else { return false }
        
        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        var updateData: [String: Any] = ["full_name": fullName]
        if let phone = phone { updateData["phone"] = phone }
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: updateData)
            let (data, response) = try await URLSession.shared.data(for: request)
            if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                self.currentUser = try? JSONDecoder().decode(UserInfo.self, from: data)
                return true
            }
        } catch {
            print("Update user info error: \(error)")
        }
        return false
    }
    
    func updateVolunteerProfile(bio: String?, city: String?, experienceLevel: String, maxAltitude: Int?) async -> Bool {
        guard let token = accessToken else { return false }
        guard let url = URL(string: "\(baseURL)/volunteers/me/profile") else { return false }
        
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        var updateData: [String: Any] = ["experience_level": experienceLevel]
        if let bio = bio { updateData["bio"] = bio }
        if let city = city { updateData["city"] = city }
        if let maxAltitude = maxAltitude { updateData["max_altitude_m"] = maxAltitude }
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: updateData)
            let (_, response) = try await URLSession.shared.data(for: request)
            if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                await fetchUserData()
                return true
            }
        } catch {
            print("Update volunteer profile error: \(error)")
        }
        return false
    }
    
    func createOrUpdateOrganization(name: String, description: String?, logoUrl: String?, website: String?, city: String?, category: String?, tags: [String]) async -> Bool {
        guard let token = accessToken else { return false }
        
        let urlString = organization == nil ? "\(baseURL)/organizations/" : "\(baseURL)/organizations/me"
        guard let url = URL(string: urlString) else { return false }
        
        var request = URLRequest(url: url)
        request.httpMethod = organization == nil ? "POST" : "PUT"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        var orgData: [String: Any] = ["name": name]
        if let description = description { orgData["description"] = description }
        if let logoUrl = logoUrl { orgData["logo_url"] = logoUrl }
        if let website = website { orgData["website"] = website }
        if let city = city { orgData["city"] = city }
        if let category = category { orgData["category"] = category }
        orgData["tags"] = tags
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: orgData)
            let (data, response) = try await URLSession.shared.data(for: request)
            if let httpResponse = response as? HTTPURLResponse, (httpResponse.statusCode == 200 || httpResponse.statusCode == 201) {
                self.organization = try? JSONDecoder().decode(Organization.self, from: data)
                self.hasOrganization = true
                return true
            }
        } catch {
            print("Organization action error: \(error)")
        }
        return false
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

        // 4. Organizasyon (/organizations/me)
        if currentUser?.role.lowercased() == "organizer" {
            if let url = URL(string: "\(baseURL)/organizations/me") {
                var request = URLRequest(url: url)
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                if let (data, response) = try? await URLSession.shared.data(for: request),
                   let httpResponse = response as? HTTPURLResponse {
                    if httpResponse.statusCode == 200 {
                        self.organization = try? JSONDecoder().decode(Organization.self, from: data)
                        self.hasOrganization = true
                    } else if httpResponse.statusCode == 404 {
                        self.hasOrganization = false
                    }
                }
            }
        }
    }
    
    // MARK: - Logout
    func logout() {
        self.accessToken = nil
        self.errorMessage = nil
    }
}
