import SwiftUI

struct ContentView: View {
    @StateObject private var authManager = AuthManager()
    
    var body: some View {
        Group {
            if authManager.isAuthenticated {
                // Giriş yapılmışsa ana uygulama
                TabView {
                    HomeView()
                        .tabItem {
                            Label("Ana Sayfa", systemImage: "house.fill")
                        }
                    
                    ExploreView()
                        .tabItem {
                            Label("Keşfet", systemImage: "map.fill")
                        }
                    
                    ProfileView()
                        .tabItem {
                            Label("Profil", systemImage: "person.fill")
                        }
                }
                .tint(Color(red: 0.05, green: 0.45, blue: 0.3))
            } else {
                // Giriş yapılmamışsa login ekranı
                NavigationStack {
                    LoginView()
                }
            }
        }
        .environmentObject(authManager)
    }
}

#Preview {
    ContentView()
}
