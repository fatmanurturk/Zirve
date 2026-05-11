import SwiftUI

struct ForgotPasswordView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var authManager: AuthManager
    
    @State private var email = ""
    @State private var showResetPassword = false
    @State private var successMessage: String?
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                
                VStack(spacing: 24) {
                    // Başlık
                    VStack(spacing: 8) {
                        Text("Şifremi Unuttum")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.primary)
                        
                        Text("Hesabına bağlı e-posta adresini gir, sana şifre sıfırlama talimatlarını gönderelim.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    }
                    
                    // Hata veya Başarı Mesajı
                    if let error = authManager.errorMessage {
                        errorMessageView(error)
                    }
                    
                    if let success = successMessage {
                        successMessageView(success)
                    }
                    
                    // Form
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Email Adresi")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(.primary.opacity(0.7))
                        
                        TextField("ornek@mail.com", text: $email)
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)
                            .disableAutocorrection(true)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 12)
                            .background(Color(UIColor.secondarySystemBackground))
                            .cornerRadius(10)
                            .overlay(
                                RoundedRectangle(cornerRadius: 10)
                                    .stroke(Color.gray.opacity(0.15), lineWidth: 1)
                            )
                    }
                    
                    // Gönder Butonu
                    Button(action: {
                        Task {
                            let success = await authManager.forgotPassword(email: email)
                            if success {
                                successMessage = "Sıfırlama linki e-postanıza gönderildi."
                                // Navigate to reset after a short delay
                                DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                                    showResetPassword = true
                                }
                            }
                        }
                    }) {
                        HStack(spacing: 6) {
                            if authManager.isLoading {
                                ProgressView().tint(.white)
                            }
                            Text(authManager.isLoading ? "Gönderiliyor..." : "Sıfırlama Linki Gönder")
                                .fontWeight(.semibold)
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 13)
                        .background(Color(red: 0.2, green: 0.5, blue: 0.2))
                        .cornerRadius(10)
                    }
                    .disabled(email.isEmpty || authManager.isLoading)
                    .opacity(email.isEmpty ? 0.5 : 1.0)
                }
                .padding(28)
                .background(Color(UIColor.systemBackground))
                .cornerRadius(20)
                .shadow(color: Color.black.opacity(0.04), radius: 10, x: 0, y: 2)
                .padding(.horizontal, 24)
                
                Spacer()
                
                Button("Giriş Sayfasına Dön") {
                    dismiss()
                }
                .font(.subheadline)
                .foregroundColor(.secondary)
                .padding(.bottom, 20)
            }
            .background(Color(UIColor.secondarySystemBackground).ignoresSafeArea())
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark")
                            .foregroundColor(.primary)
                    }
                }
            }
            .navigationDestination(isPresented: $showResetPassword) {
                ResetPasswordView().environmentObject(authManager)
            }
        }
    }
    
    private func errorMessageView(_ error: String) -> some View {
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
    
    private func successMessageView(_ success: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundColor(.green.opacity(0.8))
            Text(success)
                .font(.footnote)
                .foregroundColor(.green.opacity(0.8))
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.green.opacity(0.06))
        .cornerRadius(10)
    }
}

#Preview {
    ForgotPasswordView()
        .environmentObject(AuthManager())
}
