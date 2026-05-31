import SwiftUI
import MapKit
import CoreLocation

// MARK: - Volunteer Location Model
struct VolunteerLocationData: Codable, Identifiable {
    let volunteer_id: String
    let lat: Double
    let lng: Double
    let is_active: Bool
    let updated_at: String
    let full_name: String?
    let avatar_url: String?

    var id: String { volunteer_id }
}

// MARK: - Location Manager (konum paylaşımı için)
@MainActor
class LocationSharingManager: NSObject, ObservableObject, CLLocationManagerDelegate {
    @Published var isSharing = false
    @Published var authStatus: CLAuthorizationStatus = .notDetermined
    @Published var lastUpdateTime: Date?
    @Published var errorMessage: String?

    private let clManager = CLLocationManager()
    private var shareTimer: Timer?
    private var currentLocation: CLLocation?
    private var token: String?
    private var baseURL: String = Config.baseURL

    override init() {
        super.init()
        clManager.delegate = self
        clManager.desiredAccuracy = kCLLocationAccuracyBest
        authStatus = clManager.authorizationStatus
    }

    func startSharing(token: String) {
        self.token = token
        if authStatus == .notDetermined {
            clManager.requestWhenInUseAuthorization()
            return
        }
        guard authStatus == .authorizedWhenInUse || authStatus == .authorizedAlways else {
            errorMessage = "Konum iznine ihtiyaç var. Ayarlardan izin veriniz."
            return
        }
        isSharing = true
        clManager.startUpdatingLocation()
        scheduleTimer()
    }

    func stopSharing() {
        isSharing = false
        clManager.stopUpdatingLocation()
        shareTimer?.invalidate()
        shareTimer = nil
        Task { await deactivateLocation() }
    }

    private func scheduleTimer() {
        shareTimer?.invalidate()
        shareTimer = Timer.scheduledTimer(withTimeInterval: 15, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                await self?.sendLocation()
            }
        }
    }

    private func sendLocation() async {
        guard let loc = currentLocation, let token = token else { return }
        guard let url = URL(string: "\(baseURL)/locations/me") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "PUT"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let body = ["lat": loc.coordinate.latitude, "lng": loc.coordinate.longitude, "is_active": true] as [String: Any]
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        if let (_, resp) = try? await URLSession.shared.data(for: req),
           let http = resp as? HTTPURLResponse, http.statusCode == 200 {
            lastUpdateTime = Date()
            errorMessage = nil
        }
    }

    private func deactivateLocation() async {
        guard let token = token,
              let url = URL(string: "\(baseURL)/locations/me") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "DELETE"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        _ = try? await URLSession.shared.data(for: req)
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let loc = locations.last else { return }
        Task { @MainActor in
            self.currentLocation = loc
            if self.isSharing {
                await self.sendLocation()
            }
        }
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        Task { @MainActor in
            self.authStatus = manager.authorizationStatus
            if (self.authStatus == .authorizedWhenInUse || self.authStatus == .authorizedAlways) && self.isSharing {
                manager.startUpdatingLocation()
                self.scheduleTimer()
            }
        }
    }
}

// MARK: - Route Map (waypoints + polyline)
struct EventRouteMapView: View {
    let event: Event

    private var waypoints: [Waypoint] {
        (event.waypoints ?? []).sorted(by: { $0.order < $1.order })
    }

    private var coords: [CLLocationCoordinate2D] {
        waypoints.map { CLLocationCoordinate2D(latitude: $0.lat, longitude: $0.lng) }
    }

    private var initialPosition: MapCameraPosition {
        guard !coords.isEmpty else { return .automatic }
        if coords.count == 1 {
            return .region(MKCoordinateRegion(center: coords[0], span: .init(latitudeDelta: 0.05, longitudeDelta: 0.05)))
        }
        let lats = coords.map(\.latitude); let lngs = coords.map(\.longitude)
        return .region(MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: (lats.min()! + lats.max()!) / 2, longitude: (lngs.min()! + lngs.max()!) / 2),
            span: .init(latitudeDelta: (lats.max()! - lats.min()!) * 1.5 + 0.02, longitudeDelta: (lngs.max()! - lngs.min()!) * 1.5 + 0.02)
        ))
    }

    private let accentGreen = Color(red: 0.1, green: 0.5, blue: 0.3)

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Etkinlik Rotası", systemImage: "map.fill")
                .font(.headline)
                .fontWeight(.semibold)
                .foregroundColor(.primary)

            Map(initialPosition: initialPosition) {
                // Waypoint pinleri
                ForEach(Array(waypoints.enumerated()), id: \.element.id) { idx, wp in
                    let coord = CLLocationCoordinate2D(latitude: wp.lat, longitude: wp.lng)
                    Annotation(wp.label, coordinate: coord, anchor: .bottom) {
                        WaypointPin(order: wp.order, isFirst: idx == 0, isLast: idx == waypoints.count - 1)
                    }
                }
                // Rota çizgisi
                if coords.count > 1 {
                    MapPolyline(coordinates: coords)
                        .stroke(accentGreen, style: StrokeStyle(lineWidth: 3, dash: [8, 4]))
                }
            }
            .frame(height: 260)
            .cornerRadius(16)
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.gray.opacity(0.1), lineWidth: 1))

            // Durak listesi
            if !waypoints.isEmpty {
                VStack(spacing: 0) {
                    ForEach(Array(waypoints.enumerated()), id: \.element.id) { idx, wp in
                        HStack(spacing: 12) {
                            ZStack {
                                Circle()
                                    .fill(idx == 0 ? accentGreen : (idx == waypoints.count - 1 ? .red : .blue))
                                    .frame(width: 24, height: 24)
                                Text("\(wp.order)")
                                    .font(.caption2)
                                    .fontWeight(.bold)
                                    .foregroundColor(.white)
                            }
                            Text(wp.label)
                                .font(.caption)
                                .foregroundColor(.primary)
                                .lineLimit(1)
                            Spacer()
                        }
                        .padding(.vertical, 8)
                        .padding(.horizontal, 12)

                        if idx < waypoints.count - 1 {
                            HStack {
                                Rectangle()
                                    .fill(Color.gray.opacity(0.2))
                                    .frame(width: 1, height: 14)
                                    .padding(.leading, 23)
                                Spacer()
                            }
                        }
                    }
                }
                .background(Color(UIColor.secondarySystemGroupedBackground))
                .cornerRadius(12)
            }
        }
    }
}

// MARK: - Waypoint Pin
struct WaypointPin: View {
    let order: Int
    let isFirst: Bool
    let isLast: Bool

    private var color: Color {
        isFirst ? Color(red: 0.1, green: 0.5, blue: 0.3) : (isLast ? .red : .blue)
    }

    var body: some View {
        ZStack {
            Circle()
                .fill(color)
                .frame(width: 30, height: 30)
                .shadow(color: color.opacity(0.4), radius: 3, x: 0, y: 2)
            Text("\(order)")
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(.white)
        }
    }
}

// MARK: - Location Sharing View (gönüllü)
struct LocationSharingView: View {
    let token: String
    @StateObject private var manager = LocationSharingManager()

    private let accentGreen = Color(red: 0.1, green: 0.5, blue: 0.3)

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Konum Paylaşımı", systemImage: "location.fill")
                .font(.headline)
                .fontWeight(.semibold)
                .foregroundColor(.primary)

            HStack(spacing: 14) {
                ZStack {
                    RoundedRectangle(cornerRadius: 10)
                        .fill((manager.isSharing ? accentGreen : Color.gray).opacity(0.12))
                        .frame(width: 44, height: 44)
                    Image(systemName: manager.isSharing ? "location.fill" : "location.slash.fill")
                        .font(.headline)
                        .foregroundColor(manager.isSharing ? accentGreen : .gray)
                }

                VStack(alignment: .leading, spacing: 3) {
                    Text(manager.isSharing ? "Konum Paylaşılıyor" : "Konum Paylaşımı Kapalı")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.primary)
                    if let t = manager.lastUpdateTime {
                        Text("Son güncelleme: \(t.formatted(.relative(presentation: .named)))")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    } else {
                        Text("Organizatör konumunuzu görebilir")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                Spacer()

                Toggle("", isOn: Binding(
                    get: { manager.isSharing },
                    set: { newVal in
                        if newVal { manager.startSharing(token: token) }
                        else { manager.stopSharing() }
                    }
                ))
                .labelsHidden()
                .tint(accentGreen)
            }
            .padding(14)
            .background(Color(UIColor.secondarySystemGroupedBackground))
            .cornerRadius(14)
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(
                (manager.isSharing ? accentGreen : Color.gray).opacity(0.2), lineWidth: 1
            ))

            if let err = manager.errorMessage {
                HStack(spacing: 8) {
                    Image(systemName: "exclamationmark.circle.fill").foregroundColor(.orange)
                    Text(err).font(.caption).foregroundColor(.orange)
                }
                .padding(.horizontal, 4)
            }
        }
        .onDisappear { manager.stopSharing() }
    }
}

// MARK: - Volunteer Tracking Map (organizatör)
@MainActor
class VolunteerTrackingViewModel: ObservableObject {
    @Published var locations: [VolunteerLocationData] = []
    @Published var isLoading = false

    private var refreshTask: Task<Void, Never>?
    private let baseURL = Config.baseURL

    func startTracking(eventId: String, token: String) {
        refreshTask?.cancel()
        refreshTask = Task {
            while !Task.isCancelled {
                await fetch(eventId: eventId, token: token)
                try? await Task.sleep(for: .seconds(10))
            }
        }
    }

    func stopTracking() { refreshTask?.cancel() }

    private func fetch(eventId: String, token: String) async {
        guard let url = URL(string: "\(baseURL)/locations/event/\(eventId)") else { return }
        var req = URLRequest(url: url)
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        guard let (data, resp) = try? await URLSession.shared.data(for: req),
              let http = resp as? HTTPURLResponse, http.statusCode == 200 else { return }
        locations = (try? JSONDecoder().decode([VolunteerLocationData].self, from: data)) ?? []
    }
}

struct VolunteerTrackingMapView: View {
    let event: Event
    let token: String
    @StateObject private var viewModel = VolunteerTrackingViewModel()

    private var eventCoord: CLLocationCoordinate2D? {
        if let lat = event.latitude, let lng = event.longitude {
            return CLLocationCoordinate2D(latitude: lat, longitude: lng)
        }
        if let wp = event.waypoints?.min(by: { $0.order < $1.order }) {
            return CLLocationCoordinate2D(latitude: wp.lat, longitude: wp.lng)
        }
        return nil
    }

    private let accentGreen = Color(red: 0.1, green: 0.5, blue: 0.3)

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label("Canlı Gönüllü Takibi", systemImage: "sensor.tag.radiowaves.forward.fill")
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(.primary)
                Spacer()
                HStack(spacing: 4) {
                    Circle().fill(.green).frame(width: 7, height: 7)
                    Text("Canlı").font(.caption).fontWeight(.bold).foregroundColor(.green)
                }
            }

            Map(initialPosition: initialCameraPosition) {
                // Etkinlik konumu
                if let coord = eventCoord {
                    Annotation(event.location_name ?? event.title, coordinate: coord, anchor: .bottom) {
                        ZStack {
                            Circle().fill(accentGreen).frame(width: 36, height: 36)
                                .shadow(color: accentGreen.opacity(0.4), radius: 4, x: 0, y: 2)
                            Image(systemName: "flag.fill")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(.white)
                        }
                    }
                    MapCircle(center: coord, radius: 500)
                        .foregroundStyle(accentGreen.opacity(0.1))
                        .stroke(accentGreen.opacity(0.3), lineWidth: 1)
                }
                // Gönüllü pinleri
                ForEach(viewModel.locations) { loc in
                    let coord = CLLocationCoordinate2D(latitude: loc.lat, longitude: loc.lng)
                    Annotation(loc.full_name ?? "Gönüllü", coordinate: coord, anchor: .bottom) {
                        VolunteerTrackingPin(name: loc.full_name ?? "?")
                    }
                }
            }
            .frame(height: 260)
            .cornerRadius(16)
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.gray.opacity(0.1), lineWidth: 1))

            // İstatistik satırı
            HStack(spacing: 16) {
                Label("\(viewModel.locations.count) aktif gönüllü", systemImage: "person.3.fill")
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(accentGreen)
                Spacer()
                Text("Her 10 sn. yenileniyor")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            .padding(.horizontal, 4)

            // Gönüllü listesi
            if !viewModel.locations.isEmpty {
                VStack(spacing: 8) {
                    ForEach(viewModel.locations) { loc in
                        HStack(spacing: 10) {
                            Circle().fill(accentGreen.opacity(0.15)).frame(width: 32, height: 32)
                                .overlay(Image(systemName: "person.fill").font(.caption).foregroundColor(accentGreen))
                            VStack(alignment: .leading, spacing: 1) {
                                Text(loc.full_name ?? "Gönüllü").font(.caption).fontWeight(.semibold)
                                Text(String(format: "%.4f, %.4f", loc.lat, loc.lng))
                                    .font(.caption2).foregroundColor(.secondary)
                            }
                            Spacer()
                            Circle().fill(.green).frame(width: 8, height: 8)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color(UIColor.secondarySystemGroupedBackground))
                        .cornerRadius(10)
                    }
                }
            } else {
                Text("Henüz konum paylaşan gönüllü yok.")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(.horizontal, 4)
            }
        }
        .task { viewModel.startTracking(eventId: event.id, token: token) }
        .onDisappear { viewModel.stopTracking() }
    }

    private var initialCameraPosition: MapCameraPosition {
        if let coord = eventCoord {
            return .region(MKCoordinateRegion(center: coord, span: .init(latitudeDelta: 0.02, longitudeDelta: 0.02)))
        }
        return .automatic
    }
}

// MARK: - Volunteer Tracking Pin
private struct VolunteerTrackingPin: View {
    let name: String

    var body: some View {
        VStack(spacing: 2) {
            ZStack {
                Circle()
                    .fill(Color(red: 0.1, green: 0.5, blue: 0.3))
                    .frame(width: 30, height: 30)
                    .shadow(color: Color(red: 0.1, green: 0.5, blue: 0.3).opacity(0.4), radius: 3, x: 0, y: 2)
                Image(systemName: "person.fill")
                    .font(.caption)
                    .foregroundColor(.white)
            }
            Text(String(name.prefix(8)))
                .font(.system(size: 9, weight: .bold))
                .foregroundColor(.primary)
                .padding(.horizontal, 4)
                .padding(.vertical, 2)
                .background(Color(UIColor.systemBackground).opacity(0.9))
                .cornerRadius(4)
        }
    }
}
