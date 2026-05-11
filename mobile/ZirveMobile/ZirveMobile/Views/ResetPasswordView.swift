import SwiftUI

struct ResetPasswordView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var authManager: AuthManager
    
    @State private var token = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var success = false
    
    var body: some View {
        VStack(spacing: 0) {
            
            VStack(spacing: 24) {
                // Başlık
                VStack(spacing: 8) {
                    Text(success ? "Başarılı!" : "Yeni Şifre Belirle")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.primary)
                    
                    Text(success ? "Şifreniz başarıyla güncellendi." : "Lütfen e-postanıza gelen kodu ve yeni şifrenizi girin.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }
                
                if success {
                    Image(systemName: "checkmark.circle.fill")
                        .resizable()
                        .frame(width: 60, height: 60)
                        .foregroundColor(.green)
                        .padding(.vertical, 20)
                    
                    Button("Giriş Yap") {
                        // In a real app, you'd navigate back to login root
                        dismiss()
                    }
                    .font(.headline)
                    .foregroundColor(Color(red: 0.2, green: 0.5, blue: 0.2))
                } else {
                    // Hata Mesajı
                    if let error = authManager.errorMessage {
                        HStack(spacing: 8) {
                            Image(systemName: "exclamationmark.circle.fill")
                                .foregroundColor(.red.opacity(0.8))
                            Text(error)
                                .font(.footnote)
                                .foregroundColor(.red.opacity(0.8))
                        }
                        .padding(12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.red.opacity(0.06))
                        .cornerRadius(10)
                    }
                    
                    // Form
                    VStack(spacing: 16) {
                        inputField(title: "Doğrulama Kodu (Token)", text: $token, placeholder: "Kodu buraya yapıştırın")
                        
                        inputField(title: "Yeni Şifre", text: $password, placeholder: "••••••••", isSecure: true)
                        
                        inputField(title: "Şifreyi Onayla", text: $confirmPassword, placeholder: "••••••••", isSecure: true)
                    }
                    
                    // Güncelle Butonu
                    Button(action: {
                        if password != confirmPassword {
                            authManager.errorMessage = "Şifreler uyuşmuyor."
                            return
                        }
                        Task {
                            let isSuccess = await authManager.resetPassword(token: token, newPassword: password)
                            if isSuccess {
                                withAnimation {
                                    success = true
                                }
                            }
                        }
                    }) {
                        HStack(spacing: 6) {
                            if authManager.isLoading {
                                ProgressView().tint(.white)
                            }
                            Text(authManager.isLoading ? "Güncelleniyor..." : "Şifreyi Güncelle")
                                .fontWeight(.semibold)
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 13)
                        .background(Color(red: 0.2, green: 0.5, blue: 0.2))
                        .cornerRadius(10)
                    }
                    .disabled(token.isEmpty || password.isEmpty || authManager.isLoading)
                    .opacity(token.isEmpty || password.isEmpty ? 0.5 : 1.0)
                }
            }
            .padding(28)
            .background(Color(UIColor.systemBackground))
            .cornerRadius(20)
            .shadow(color: Color.black.opacity(0.04), radius: 10, x: 0, y: 2)
            .padding(.horizontal, 24)
            
            Spacer()
        }
        .background(Color(UIColor.secondarySystemBackground).ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
    }
    
    private func inputField(title: String, text: Binding<String>, placeholder: String, isSecure: Bool = false) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(.primary.opacity(0.7))
            
            if isSecure {
                SecureField(placeholder, text: text)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 12)
                    .background(Color(UIColor.secondarySystemBackground))
                    .cornerRadius(10)
            } else {
                TextField(placeholder, text: text)
                    .autocapitalization(.none)
                    .disableAutocorrection(true)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 12)
                    .background(Color(UIColor.secondarySystemBackground))
                    .cornerRadius(10)
            }
        }
    }
}

#Preview {
    ResetPasswordView()
        .environmentObject(AuthManager())
}
