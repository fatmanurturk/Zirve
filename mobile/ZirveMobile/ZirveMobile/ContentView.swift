import SwiftUI

// MARK: - GuestHomeView
struct GuestHomeView: View {
    @EnvironmentObject var authManager: AuthManager
    @StateObject private var networkManager = NetworkManager()

    @State private var showLogin = false
    @State private var showRegister = false

    private let accentGreen = Color(red: 0.05, green: 0.45, blue: 0.3)
    private let darkGreen   = Color(red: 0.03, green: 0.28, blue: 0.17)

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    heroSection

                    VStack(spacing: 16) {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Etkinlikleri Keşfet")
                                    .font(.title3).fontWeight(.bold)
                                Text("Giriş yapmadan tüm etkinlikleri görüntüleyin")
                                    .font(.caption).foregroundColor(.secondary)
                            }
                            Spacer()
                        }
                        .padding(.horizontal, 20)
                        .padding(.top, 24)

                        if networkManager.isLoading && networkManager.events.isEmpty {
                            ProgressView("Etkinlikler yükleniyor…").padding(.vertical, 40)
                        } else if let error = networkManager.errorMessage, networkManager.events.isEmpty {
                            VStack(spacing: 10) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .font(.largeTitle).foregroundColor(.orange)
                                Text(error).multilineTextAlignment(.center).foregroundColor(.secondary)
                                Button("Tekrar Dene") { Task { await networkManager.fetchOpenEvents() } }
                                    .buttonStyle(.borderedProminent).tint(accentGreen)
                            }
                            .padding(.horizontal, 20).padding(.vertical, 40)
                        } else {
                            LazyVStack(spacing: 14) {
                                ForEach(networkManager.events) { event in
                                    NavigationLink(destination:
                                        EventDetailView(event: event).environmentObject(authManager)
                                    ) {
                                        EventRowView(event: event)
                                    }
                                    .buttonStyle(PlainButtonStyle())
                                }
                            }
                            .padding(.horizontal, 16)
                        }
                    }
                    .padding(.bottom, 40)
                }
            }
            .background(Color(UIColor.secondarySystemGroupedBackground).ignoresSafeArea())
            .navigationBarHidden(true)
            .refreshable { await networkManager.fetchOpenEvents() }
            .task { await networkManager.fetchOpenEvents() }
        }
        .sheet(isPresented: $showLogin) {
            NavigationStack {
                LoginView().environmentObject(authManager)
                    .toolbar {
                        ToolbarItem(placement: .navigationBarLeading) {
                            Button("Kapat") { showLogin = false }.foregroundColor(accentGreen)
                        }
                    }
            }
        }
        .sheet(isPresented: $showRegister) {
            NavigationStack {
                RegisterView().environmentObject(authManager)
                    .toolbar {
                        ToolbarItem(placement: .navigationBarLeading) {
                            Button("Kapat") { showRegister = false }.foregroundColor(accentGreen)
                        }
                    }
            }
        }
    }

    private var heroSection: some View {
        ZStack(alignment: .bottomLeading) {
            LinearGradient(
                colors: [Color(red: 0.06, green: 0.48, blue: 0.35), darkGreen],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
            Circle()
                .fill(Color(red: 0.06, green: 0.52, blue: 0.38).opacity(0.2))
                .frame(width: 280, height: 280).blur(radius: 50)
                .offset(x: 150, y: -60)

            VStack(alignment: .leading, spacing: 18) {
                HStack(spacing: 10) {
                    Image(systemName: "mountain.2.fill")
                        .font(.title).foregroundColor(.white.opacity(0.9))
                    Text("Zirve")
                        .font(.system(size: 28, weight: .black)).foregroundColor(.white)
                }
                VStack(alignment: .leading, spacing: 6) {
                    Text("Açık Havada")
                        .font(.system(size: 30, weight: .heavy)).foregroundColor(.white)
                    Text("İyilik Yap!")
                        .font(.system(size: 30, weight: .heavy))
                        .foregroundColor(Color(red: 0.4, green: 0.9, blue: 0.7))
                }
                Text("Doğa sporları etkinliklerini keşfet,\ngönüllü topluluğun parçası ol.")
                    .font(.subheadline).foregroundColor(.white.opacity(0.85)).lineSpacing(3)

                HStack(spacing: 12) {
                    Button { showLogin = true } label: {
                        Text("Giriş Yap")
                            .font(.subheadline).fontWeight(.bold).foregroundColor(accentGreen)
                            .frame(maxWidth: .infinity).padding(.vertical, 13)
                            .background(Color.white).cornerRadius(12)
                    }
                    Button { showRegister = true } label: {
                        Text("Kayıt Ol")
                            .font(.subheadline).fontWeight(.bold).foregroundColor(.white)
                            .frame(maxWidth: .infinity).padding(.vertical, 13)
                            .background(Color.white.opacity(0.2)).cornerRadius(12)
                            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.white.opacity(0.5), lineWidth: 1))
                    }
                }
                .padding(.top, 4)
            }
            .padding(24).padding(.top, 12)
        }
        .cornerRadius(24)
        .padding(.horizontal, 16).padding(.top, 16)
        .shadow(color: darkGreen.opacity(0.3), radius: 15, x: 0, y: 8)
    }
}

// MARK: - ContentView
struct ContentView: View {
    @StateObject private var authManager = AuthManager()

    var body: some View {
        Group {
            if authManager.isAuthenticated {
                if authManager.currentUser?.role.uppercased() == "ORGANIZER" {
                    TabView {
                        HomeView()
                            .tabItem { Label("Ana Sayfa", systemImage: "house.fill") }
                        OrganizerDashboardView()
                            .tabItem { Label("Panel", systemImage: "chart.bar.doc.horizontal") }
                        CreateEventView()
                            .tabItem { Label("Yeni Etkinlik", systemImage: "plus.circle.fill") }
                        AIChatView()
                            .tabItem { Label("AI Asistan", systemImage: "sparkles") }
                        ProfileView()
                            .tabItem { Label("Profil", systemImage: "person.fill") }
                    }
                    .tint(Color(red: 0.05, green: 0.45, blue: 0.3))
                } else {
                    TabView {
                        HomeView()
                            .tabItem { Label("Ana Sayfa", systemImage: "house.fill") }
                        ExploreView()
                            .tabItem { Label("Keşfet", systemImage: "map.fill") }
                        AIChatView()
                            .tabItem { Label("AI Asistan", systemImage: "sparkles") }
                        ProfileView()
                            .tabItem { Label("Profil", systemImage: "person.fill") }
                    }
                    .tint(Color(red: 0.05, green: 0.45, blue: 0.3))
                }
            } else {
                GuestHomeView()
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
