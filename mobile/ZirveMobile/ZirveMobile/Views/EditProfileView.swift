import SwiftUI

struct EditProfileView: View {
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) private var dismiss
    
    @State private var fullName = ""
    @State private var phone = ""
    @State private var city = ""
    @State private var bio = ""
    @State private var experienceLevel = "beginner"
    @State private var maxAltitude = ""
    
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    let levels = [
        ("beginner", "Başlangıç"),
        ("intermediate", "Orta"),
        ("advanced", "Uzman")
    ]
    
    var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("Temel Bilgiler")) {
                    TextField("Ad Soyad", text: $fullName)
                    TextField("Telefon", text: $phone)
                        .keyboardType(.phonePad)
                }
                
                if authManager.currentUser?.role.lowercased() == "volunteer" {
                    Section(header: Text("Gönüllü Detayları")) {
                        TextField("Şehir", text: $city)
                        TextField("Max İrtifa (m)", text: $maxAltitude)
                            .keyboardType(.numberPad)
                        
                        Picker("Deneyim Seviyesi", selection: $experienceLevel) {
                            ForEach(levels, id: \.0) { level in
                                Text(level.1).tag(level.0)
                            }
                        }
                        
                        ZStack(alignment: .topLeading) {
                            if bio.isEmpty {
                                Text("Kendinden bahset...")
                                    .foregroundColor(.gray.opacity(0.5))
                                    .padding(.top, 8)
                                    .padding(.leading, 4)
                            }
                            TextEditor(text: $bio)
                                .frame(minHeight: 100)
                        }
                    }
                }
                
                if let error = errorMessage {
                    Section {
                        Text(error)
                            .foregroundColor(.red)
                            .font(.footnote)
                    }
                }
                
                Section {
                    Button(action: saveAction) {
                        HStack {
                            if isLoading {
                                ProgressView()
                                    .padding(.trailing, 8)
                            }
                            Text("Değişiklikleri Kaydet")
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .disabled(fullName.isEmpty || isLoading)
                    .foregroundColor(.white)
                    .listRowBackground(fullName.isEmpty ? Color.gray : Color(red: 0.2, green: 0.5, blue: 0.2))
                }
            }
            .navigationTitle("Profili Düzenle")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("İptal") { dismiss() }
                }
            }
            .onAppear {
                if let user = authManager.currentUser {
                    fullName = user.full_name
                    phone = user.phone ?? ""
                }
                
                if let profile = authManager.volunteerProfile {
                    city = profile.city ?? ""
                    bio = profile.bio ?? ""
                    experienceLevel = profile.experience_level
                    if let alt = profile.max_altitude_m {
                        maxAltitude = String(alt)
                    }
                }
            }
        }
    }
    
    private func saveAction() {
        isLoading = true
        errorMessage = nil
        
        Task {
            // 1. Update basic info
            let successUser = await authManager.updateUserInfo(
                fullName: fullName,
                phone: phone.isEmpty ? nil : phone
            )
            
            var successProfile = true
            // 2. Update profile if volunteer
            if authManager.currentUser?.role.lowercased() == "volunteer" {
                successProfile = await authManager.updateVolunteerProfile(
                    bio: bio.isEmpty ? nil : bio,
                    city: city.isEmpty ? nil : city,
                    experienceLevel: experienceLevel,
                    maxAltitude: Int(maxAltitude)
                )
            }
            
            isLoading = false
            if successUser && successProfile {
                dismiss()
            } else {
                errorMessage = "Bilgiler güncellenirken bir hata oluştu."
            }
        }
    }
}

#Preview {
    EditProfileView()
        .environmentObject(AuthManager())
}
