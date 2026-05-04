import SwiftUI

struct ContentView: View {
    @StateObject private var authManager = AuthManager()
    
    var body: some View {
        Group {
            if authManager.isAuthenticated {
                // Giriş yapılmışsa ana uygulama
                if authManager.currentUser?.role.uppercased() == "ORGANIZER" {
                    TabView {
                        HomeView()
                            .tabItem {
                                Label("Ana Sayfa", systemImage: "house.fill")
                            }
                            
                        OrganizerDashboardView()
                            .tabItem {
                                Label("Panel", systemImage: "chart.bar.doc.horizontal")
                            }
                        
                        CreateEventView()
                            .tabItem {
                                Label("Yeni Etkinlik", systemImage: "plus.circle.fill")
                            }
                        
                        ProfileView()
                            .tabItem {
                                Label("Profil", systemImage: "person.fill")
                            }
                    }
                    .tint(Color(red: 0.05, green: 0.45, blue: 0.3))
                } else {
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
                }
            } else {
                // Giriş yapılmamışsa login ekranı
                NavigationStack {
                    LoginView()
                }
            }
        }
        .environmentObject(authManager)
        .sheet(isPresented: Binding(
            get: { authManager.isAuthenticated && authManager.currentUser?.role.lowercased() == "organizer" && !authManager.hasOrganization },
            set: { _ in }
        )) {
            ClubSetupView()
                .environmentObject(authManager)
                .interactiveDismissDisabled()
        }
    }
}

#Preview {
    ContentView()
}
