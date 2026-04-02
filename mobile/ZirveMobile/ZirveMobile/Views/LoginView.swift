import SwiftUI

struct LoginView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var showRegister = false
    
    @State private var email = ""
    @State private var password = ""
    
    var body: some View {
        VStack(spacing: 0) {
            
            Spacer()
            
            // İçerik Kartı — web'deki bg-white rounded-2xl shadow kartına sadık
            VStack(spacing: 24) {
                
                // Başlık
                VStack(spacing: 8) {
                    Text("Giriş Yap")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.primary)
                    
                    HStack(spacing: 4) {
                        Text("Hesabın yok mu?")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        
                        Button("Kayıt Ol") {
                            showRegister = true
                        }
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(Color(red: 0.2, green: 0.5, blue: 0.2))
                    }
                }
                
                // Hata Mesajı — web'deki bg-red-50 text-red-600 kutusuna sadık
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
                
                // Form Alanları
                VStack(spacing: 16) {
                    // Email
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Email")
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
                    
                    // Şifre
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Şifre")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(.primary.opacity(0.7))
                        
                        SecureField("••••••••", text: $password)
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
                
                // Giriş Yap Butonu — web'deki bg-green-700 butonuna sadık
                Button(action: {
                    Task {
                        await authManager.login(email: email, password: password)
                    }
                }) {
                    HStack(spacing: 6) {
                        if authManager.isLoading {
                            ProgressView()
                                .tint(.white)
                        }
                        Text(authManager.isLoading ? "Giriş yapılıyor..." : "Giriş Yap")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 13)
                    .background(Color(red: 0.2, green: 0.5, blue: 0.2))
                    .cornerRadius(10)
                }
                .disabled(email.isEmpty || password.isEmpty || authManager.isLoading)
                .opacity((email.isEmpty || password.isEmpty) ? 0.5 : 1.0)
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
            
            Spacer()
        }
        .background(Color(UIColor.secondarySystemBackground).ignoresSafeArea())
        .navigationBarHidden(true)
        .fullScreenCover(isPresented: $showRegister) {
            RegisterView()
                .environmentObject(authManager)
        }
        .onAppear {
            authManager.errorMessage = nil
        }
    }
}

#Preview {
    LoginView()
        .environmentObject(AuthManager())
}
