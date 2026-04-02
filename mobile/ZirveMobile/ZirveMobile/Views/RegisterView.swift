import SwiftUI

struct RegisterView: View {
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) private var dismiss
    
    @State private var fullName = ""
    @State private var email = ""
    @State private var password = ""
    @State private var phone = ""
    @State private var selectedRole = "volunteer"
    
    let roles = [
        ("volunteer", "Gönüllü"),
        ("organizer", "Organizatör")
    ]
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    
                    Spacer(minLength: 30)
                    
                    // İçerik Kartı — web'deki bg-white rounded-2xl tasarıma sadık
                    VStack(spacing: 24) {
                        
                        // Başlık
                        VStack(spacing: 8) {
                            Text("Kayıt Ol")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.primary)
                            
                            HStack(spacing: 4) {
                                Text("Zaten hesabın var mı?")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                                
                                Button("Giriş Yap") {
                                    dismiss()
                                }
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundColor(Color(red: 0.2, green: 0.5, blue: 0.2))
                            }
                        }
                        
                        // Hata Mesajı
                        if let error = authManager.errorMessage {
                            HStack(spacing: 8) {
                                Image(systemName: "exclamationmark.circle.fill")
                                    .foregroundColor(.red.opacity(0.8))
                                    .font(.footnote)
                                Text(error)
                                    .font(.footnote)
                                    .foregroundColor(.red.opacity(0.8))
                            }
                            .padding(12)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.red.opacity(0.06))
                            .cornerRadius(10)
                        }
                        
                        // Form Alanları — web'deki space-y-5 yapısına sadık
                        VStack(spacing: 16) {
                            // Ad Soyad
                            FormField(label: "Ad Soyad", placeholder: "Ad Soyad") {
                                TextField("Ad Soyad", text: $fullName)
                                    .autocapitalization(.words)
                                    .disableAutocorrection(true)
                            }
                            
                            // Email
                            FormField(label: "Email", placeholder: "ornek@mail.com") {
                                TextField("ornek@mail.com", text: $email)
                                    .keyboardType(.emailAddress)
                                    .autocapitalization(.none)
                                    .disableAutocorrection(true)
                            }
                            
                            // Şifre
                            FormField(label: "Şifre", placeholder: "••••••••") {
                                SecureField("••••••••", text: $password)
                            }
                            
                            // Telefon
                            FormField(label: "Telefon (opsiyonel)", placeholder: "+90 555 000 00 00") {
                                TextField("+90 555 000 00 00", text: $phone)
                                    .keyboardType(.phonePad)
                            }
                            
                            // Hesap Türü — web'deki select elementine sadık
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Hesap Türü")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundColor(.primary.opacity(0.7))
                                
                                HStack(spacing: 10) {
                                    ForEach(roles, id: \.0) { role in
                                        Button(action: {
                                            selectedRole = role.0
                                        }) {
                                            HStack(spacing: 6) {
                                                Image(systemName: role.0 == "volunteer" ? "heart.fill" : "star.fill")
                                                    .font(.caption)
                                                Text(role.1)
                                                    .font(.subheadline)
                                                    .fontWeight(.medium)
                                            }
                                            .padding(.horizontal, 16)
                                            .padding(.vertical, 11)
                                            .frame(maxWidth: .infinity)
                                            .background(
                                                selectedRole == role.0
                                                    ? Color(red: 0.2, green: 0.5, blue: 0.2).opacity(0.1)
                                                    : Color(UIColor.secondarySystemBackground)
                                            )
                                            .foregroundColor(
                                                selectedRole == role.0
                                                    ? Color(red: 0.2, green: 0.5, blue: 0.2)
                                                    : .primary.opacity(0.6)
                                            )
                                            .cornerRadius(10)
                                            .overlay(
                                                RoundedRectangle(cornerRadius: 10)
                                                    .stroke(
                                                        selectedRole == role.0
                                                            ? Color(red: 0.2, green: 0.5, blue: 0.2).opacity(0.4)
                                                            : Color.gray.opacity(0.15),
                                                        lineWidth: 1
                                                    )
                                            )
                                        }
                                    }
                                }
                            }
                        }
                        
                        // Kayıt Ol Butonu — web'deki bg-green-700 butonuna sadık
                        Button(action: {
                            Task {
                                await authManager.register(
                                    email: email,
                                    password: password,
                                    fullName: fullName,
                                    role: selectedRole,
                                    phone: phone.isEmpty ? nil : phone
                                )
                            }
                        }) {
                            HStack(spacing: 6) {
                                if authManager.isLoading {
                                    ProgressView()
                                        .tint(.white)
                                }
                                Text(authManager.isLoading ? "Kayıt yapılıyor..." : "Kayıt Ol")
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 13)
                            .background(Color(red: 0.2, green: 0.5, blue: 0.2))
                            .cornerRadius(10)
                        }
                        .disabled(!isFormValid || authManager.isLoading)
                        .opacity(isFormValid ? 1.0 : 0.5)
                    }
                    .padding(28)
                    .background(Color(UIColor.systemBackground))
                    .cornerRadius(20)
                    .shadow(color: Color.black.opacity(0.04), radius: 10, x: 0, y: 2)
                    .overlay(
                        RoundedRectangle(cornerRadius: 20)
                            .stroke(Color.gray.opacity(0.08), lineWidth: 1)
                    )
                    .padding(.horizontal, 24)
                    
                    Spacer(minLength: 30)
                }
            }
            .background(Color(UIColor.secondarySystemBackground).ignoresSafeArea())
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark")
                            .font(.body)
                            .fontWeight(.medium)
                            .foregroundColor(.primary.opacity(0.6))
                    }
                }
            }
        }
        .onAppear {
            authManager.errorMessage = nil
        }
    }
    
    private var isFormValid: Bool {
        !fullName.isEmpty && !email.isEmpty && !password.isEmpty
    }
}

// MARK: - Yeniden Kullanılabilir Form Alanı Bileşeni
struct FormField<Content: View>: View {
    let label: String
    let placeholder: String
    @ViewBuilder let content: () -> Content
    
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(.primary.opacity(0.7))
            
            content()
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
                .background(Color(UIColor.secondarySystemBackground))
                .cornerRadius(10)
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(Color.gray.opacity(0.15), lineWidth: 1)
                )
        }
    }
}

#Preview {
    RegisterView()
        .environmentObject(AuthManager())
}
