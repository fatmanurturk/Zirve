import SwiftUI

// MARK: - ViewModel
@MainActor
class MyApplicationsViewModel: ObservableObject {
    @Published var applications: [ApplicationItem] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var selectedFilter: String = "all"

    private let baseURL = Config.baseURL

    var filtered: [ApplicationItem] {
        guard selectedFilter != "all" else { return applications }
        return applications.filter { $0.status == selectedFilter }
    }

    func load(token: String) async {
        isLoading = true
        errorMessage = nil
        guard let url = URL(string: "\(baseURL)/users/me/applications?limit=100") else { return }
        var req = URLRequest(url: url)
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        do {
            let (data, response) = try await URLSession.shared.data(for: req)
            guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
                errorMessage = "Başvurular yüklenemedi."
                isLoading = false
                return
            }
            let decoded = try JSONDecoder().decode(ApplicationListResponse.self, from: data)
            self.applications = decoded.items
        } catch {
            errorMessage = "Bağlantı hatası: \(error.localizedDescription)"
        }
        isLoading = false
    }

    func fetchEvent(eventId: String, token: String) async -> Event? {
        guard let url = URL(string: "\(baseURL)/events/\(eventId)") else { return nil }
        var req = URLRequest(url: url)
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        guard let (data, response) = try? await URLSession.shared.data(for: req),
              let http = response as? HTTPURLResponse, http.statusCode == 200 else { return nil }
        return try? JSONDecoder().decode(Event.self, from: data)
    }
}

// MARK: - Filter Tab
private struct FilterTab: View {
    let label: String
    let value: String
    let count: Int
    @Binding var selected: String

    var isActive: Bool { selected == value }
    private let accentGreen = Color(red: 0.2, green: 0.5, blue: 0.2)

    var body: some View {
        Button(action: { selected = value }) {
            VStack(spacing: 4) {
                Text(label)
                    .font(.caption)
                    .fontWeight(isActive ? .bold : .regular)
                    .foregroundColor(isActive ? accentGreen : .secondary)
                if count > 0 {
                    Text("\(count)")
                        .font(.caption2)
                        .fontWeight(.bold)
                        .foregroundColor(isActive ? .white : .secondary)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(isActive ? accentGreen : Color.gray.opacity(0.2))
                        .cornerRadius(10)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(isActive ? accentGreen.opacity(0.08) : Color.clear)
            .cornerRadius(10)
        }
    }
}

// MARK: - Application Card
private struct ApplicationCard: View {
    let app: ApplicationItem
    let onTap: () -> Void

    private let accentGreen = Color(red: 0.2, green: 0.5, blue: 0.2)

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 0) {
                // Status Banner
                HStack(spacing: 8) {
                    Image(systemName: statusIcon(app.status))
                        .font(.caption)
                    Text(statusLabel(app.status).uppercased())
                        .font(.caption2)
                        .fontWeight(.bold)
                    Spacer()
                    Text(formatDate(app.applied_at))
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.8))
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .foregroundColor(.white)
                .background(statusColor(app.status))

                // İçerik
                VStack(alignment: .leading, spacing: 10) {
                    // Etkinlik başlığı
                    Text(app.event_title ?? "Etkinlik")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.primary)
                        .lineLimit(2)

                    // Kategori & Zorluk
                    HStack(spacing: 8) {
                        if let cat = app.event_category {
                            Text(categoryLabel(cat).uppercased())
                                .font(.caption2)
                                .fontWeight(.bold)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(accentGreen.opacity(0.1))
                                .foregroundColor(accentGreen)
                                .cornerRadius(6)
                        }
                        if let diff = app.event_difficulty {
                            Text(difficultyLabel(diff).uppercased())
                                .font(.caption2)
                                .fontWeight(.bold)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.orange.opacity(0.1))
                                .foregroundColor(.orange)
                                .cornerRadius(6)
                        }
                    }

                    Divider()

                    // Tarih & Konum
                    HStack(spacing: 16) {
                        if let startDate = app.event_start_date {
                            Label(formatEventDate(startDate), systemImage: "calendar")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        if let loc = app.event_location_name {
                            Label(loc, systemImage: "mappin")
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                        }
                    }

                    // Check-in badge
                    if app.checked_in == true {
                        Label("Check-in Yapıldı", systemImage: "checkmark.seal.fill")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundColor(.blue)
                    }
                }
                .padding(14)
            }
            .background(Color(UIColor.systemBackground))
            .cornerRadius(16)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(statusColor(app.status).opacity(0.2), lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.04), radius: 6, x: 0, y: 2)
        }
        .buttonStyle(PlainButtonStyle())
    }

    private func statusColor(_ s: String) -> Color {
        switch s {
        case "approved": return .green
        case "rejected": return .red
        case "checked_in": return .blue
        default: return .orange
        }
    }
    private func statusIcon(_ s: String) -> String {
        switch s {
        case "approved": return "checkmark.circle.fill"
        case "rejected": return "xmark.circle.fill"
        case "checked_in": return "mappin.circle.fill"
        default: return "clock.fill"
        }
    }
    private func statusLabel(_ s: String) -> String {
        switch s {
        case "approved": return "Onaylandı"
        case "rejected": return "Reddedildi"
        case "checked_in": return "Check-in"
        default: return "Bekliyor"
        }
    }
    private func categoryLabel(_ c: String) -> String {
        switch c {
        case "hiking": return "Yürüyüş"
        case "climbing": return "Tırmanış"
        case "camping": return "Kamp"
        case "cycling": return "Bisiklet"
        case "kayaking": return "Kayak"
        default: return c.capitalized
        }
    }
    private func difficultyLabel(_ d: String) -> String {
        switch d {
        case "easy": return "Kolay"
        case "medium": return "Orta"
        case "hard": return "Zor"
        case "expert": return "Uzman"
        default: return d.capitalized
        }
    }
    private func formatDate(_ iso: String) -> String {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = f.date(from: iso) {
            let df = DateFormatter()
            df.locale = Locale(identifier: "tr_TR")
            df.dateStyle = .medium
            return df.string(from: d)
        }
        return iso
    }
    private func formatEventDate(_ iso: String) -> String {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = f.date(from: iso) {
            let df = DateFormatter()
            df.locale = Locale(identifier: "tr_TR")
            df.dateFormat = "d MMM yyyy"
            return df.string(from: d)
        }
        return iso
    }
}

// MARK: - Application Detail Sheet
struct ApplicationDetailView: View {
    let app: ApplicationItem
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) private var dismiss
    @State private var navigateToEvent = false
    @State private var fetchedEvent: Event?
    @State private var isFetchingEvent = false

    private let accentGreen = Color(red: 0.2, green: 0.5, blue: 0.2)
    private let baseURL = Config.baseURL

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    // Status Banner
                    VStack(spacing: 8) {
                        Image(systemName: statusIcon(app.status))
                            .font(.system(size: 40))
                            .foregroundColor(.white)
                        Text(statusLabel(app.status))
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                        Text(statusDescription(app.status))
                            .font(.subheadline)
                            .foregroundColor(.white.opacity(0.85))
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 32)
                    .padding(.horizontal, 24)
                    .background(statusColor(app.status))

                    VStack(spacing: 16) {
                        // Etkinlik Bilgileri
                        infoCard(title: "Etkinlik") {
                            VStack(alignment: .leading, spacing: 10) {
                                Text(app.event_title ?? "Bilinmiyor")
                                    .font(.headline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.primary)

                                if let cat = app.event_category {
                                    Label(categoryLabel(cat), systemImage: "tag.fill")
                                        .font(.subheadline)
                                        .foregroundColor(accentGreen)
                                }
                                if let startDate = app.event_start_date {
                                    Label(formatEventDate(startDate), systemImage: "calendar")
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                }
                                if let loc = app.event_location_name {
                                    Label(loc, systemImage: "mappin.and.ellipse")
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                }

                                Button(action: { Task { await fetchAndNavigate() } }) {
                                    HStack(spacing: 6) {
                                        if isFetchingEvent {
                                            ProgressView().tint(accentGreen)
                                        } else {
                                            Image(systemName: "arrow.up.right.circle")
                                        }
                                        Text("Etkinlik Detaylarına Git")
                                            .fontWeight(.medium)
                                    }
                                    .font(.subheadline)
                                    .foregroundColor(accentGreen)
                                }
                                .disabled(isFetchingEvent)
                                .padding(.top, 4)
                            }
                        }

                        // Başvuru Bilgileri
                        infoCard(title: "Başvuru Bilgileri") {
                            VStack(alignment: .leading, spacing: 8) {
                                detailRow(label: "Başvuru Tarihi", value: formatDate(app.applied_at), icon: "clock")
                                if app.checked_in == true {
                                    detailRow(label: "Durum", value: "Check-in Yapıldı ✓", icon: "checkmark.seal.fill")
                                }
                            }
                        }

                        // Motivasyon Mektubu
                        if let letter = app.motivation_letter, !letter.isEmpty {
                            infoCard(title: "Motivasyon Mektubum") {
                                Text(letter)
                                    .font(.subheadline)
                                    .foregroundColor(.primary.opacity(0.85))
                                    .lineSpacing(4)
                            }
                        }

                        // Değerlendirici Notu
                        if let note = app.reviewer_note, !note.isEmpty {
                            infoCard(title: "Organizatör Notu") {
                                HStack(alignment: .top, spacing: 10) {
                                    Image(systemName: "info.circle.fill")
                                        .foregroundColor(.blue)
                                    Text(note)
                                        .font(.subheadline)
                                        .foregroundColor(.primary.opacity(0.85))
                                        .lineSpacing(4)
                                }
                            }
                        }
                    }
                    .padding(16)
                }
            }
            .background(Color(UIColor.secondarySystemGroupedBackground).ignoresSafeArea())
            .navigationTitle("Başvuru Detayı")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Kapat") { dismiss() }
                        .foregroundColor(accentGreen)
                }
            }
            .navigationDestination(isPresented: $navigateToEvent) {
                if let event = fetchedEvent {
                    EventDetailView(event: event)
                        .environmentObject(authManager)
                }
            }
        }
    }

    private func infoCard<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title.uppercased())
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(.secondary)
            content()
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(UIColor.systemBackground))
        .cornerRadius(16)
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.gray.opacity(0.08), lineWidth: 1))
        .shadow(color: Color.black.opacity(0.03), radius: 6, x: 0, y: 2)
    }

    private func detailRow(label: String, value: String, icon: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundColor(.secondary)
                .frame(width: 16)
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundColor(.primary)
        }
    }

    private func fetchAndNavigate() async {
        guard let token = authManager.accessToken else { return }
        isFetchingEvent = true
        guard let url = URL(string: "\(baseURL)/events/\(app.event_id)") else {
            isFetchingEvent = false
            return
        }
        var req = URLRequest(url: url)
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        if let (data, response) = try? await URLSession.shared.data(for: req),
           let http = response as? HTTPURLResponse, http.statusCode == 200,
           let event = try? JSONDecoder().decode(Event.self, from: data) {
            fetchedEvent = event
            navigateToEvent = true
        }
        isFetchingEvent = false
    }

    private func statusColor(_ s: String) -> Color {
        switch s {
        case "approved": return .green
        case "rejected": return .red
        case "checked_in": return .blue
        default: return .orange
        }
    }
    private func statusIcon(_ s: String) -> String {
        switch s {
        case "approved": return "checkmark.circle.fill"
        case "rejected": return "xmark.circle.fill"
        case "checked_in": return "mappin.circle.fill"
        default: return "clock.fill"
        }
    }
    private func statusLabel(_ s: String) -> String {
        switch s {
        case "approved": return "Onaylandı"
        case "rejected": return "Reddedildi"
        case "checked_in": return "Check-in Yapıldı"
        default: return "Beklemede"
        }
    }
    private func statusDescription(_ s: String) -> String {
        switch s {
        case "approved": return "Başvurunuz onaylandı. Etkinlikte görüşmek üzere!"
        case "rejected": return "Başvurunuz bu sefer kabul edilmedi."
        case "checked_in": return "Etkinliğe katıldınız ve check-in yaptınız."
        default: return "Başvurunuz değerlendiriliyor."
        }
    }
    private func categoryLabel(_ c: String) -> String {
        switch c {
        case "hiking": return "Doğa Yürüyüşü"
        case "climbing": return "Tırmanış"
        case "camping": return "Kamp"
        case "cycling": return "Bisiklet"
        case "kayaking": return "Kayak"
        default: return c.capitalized
        }
    }
    private func formatDate(_ iso: String) -> String {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = f.date(from: iso) {
            let df = DateFormatter()
            df.locale = Locale(identifier: "tr_TR")
            df.dateStyle = .medium
            return df.string(from: d)
        }
        return iso
    }
    private func formatEventDate(_ iso: String) -> String {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = f.date(from: iso) {
            let df = DateFormatter()
            df.locale = Locale(identifier: "tr_TR")
            df.dateFormat = "d MMM yyyy"
            return df.string(from: d)
        }
        return iso
    }
}

// MARK: - Main View
struct MyApplicationsView: View {
    @EnvironmentObject var authManager: AuthManager
    @StateObject private var viewModel = MyApplicationsViewModel()
    @State private var selectedApp: ApplicationItem?

    private let accentGreen = Color(red: 0.2, green: 0.5, blue: 0.2)

    private let filters: [(label: String, value: String)] = [
        ("Tümü", "all"),
        ("Bekliyor", "pending"),
        ("Onaylandı", "approved"),
        ("Reddedildi", "rejected"),
        ("Check-in", "checked_in"),
    ]

    private func count(for status: String) -> Int {
        status == "all"
            ? viewModel.applications.count
            : viewModel.applications.filter { $0.status == status }.count
    }

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.applications.isEmpty {
                ProgressView("Başvurular yükleniyor...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = viewModel.errorMessage {
                VStack(spacing: 16) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.largeTitle)
                        .foregroundColor(.orange)
                    Text(error)
                        .multilineTextAlignment(.center)
                        .foregroundColor(.secondary)
                    Button("Tekrar Dene") {
                        Task {
                            if let token = authManager.accessToken {
                                await viewModel.load(token: token)
                            }
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(accentGreen)
                }
                .padding()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                VStack(spacing: 0) {
                    // Filter Tabs
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 4) {
                            ForEach(filters, id: \.value) { f in
                                FilterTab(
                                    label: f.label,
                                    value: f.value,
                                    count: count(for: f.value),
                                    selected: $viewModel.selectedFilter
                                )
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                    }
                    .background(Color(UIColor.systemBackground))
                    .overlay(alignment: .bottom) {
                        Divider()
                    }

                    if viewModel.filtered.isEmpty {
                        VStack(spacing: 12) {
                            Image(systemName: "doc.text.magnifyingglass")
                                .font(.system(size: 44))
                                .foregroundColor(.secondary.opacity(0.5))
                            Text("Bu kategoride başvuru yok")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .padding()
                    } else {
                        ScrollView {
                            LazyVStack(spacing: 12) {
                                ForEach(viewModel.filtered) { app in
                                    ApplicationCard(app: app) {
                                        selectedApp = app
                                    }
                                }
                            }
                            .padding(16)
                        }
                        .refreshable {
                            if let token = authManager.accessToken {
                                await viewModel.load(token: token)
                            }
                        }
                    }
                }
            }
        }
        .background(Color(UIColor.secondarySystemGroupedBackground).ignoresSafeArea())
        .navigationTitle("Başvurularım")
        .navigationBarTitleDisplayMode(.large)
        .task {
            if let token = authManager.accessToken {
                await viewModel.load(token: token)
            }
        }
        .sheet(item: $selectedApp) { app in
            ApplicationDetailView(app: app)
                .environmentObject(authManager)
        }
    }
}
