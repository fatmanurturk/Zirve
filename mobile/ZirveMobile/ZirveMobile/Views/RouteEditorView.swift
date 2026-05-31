import SwiftUI
import MapKit

// MARK: - Editor Mode
private enum EditorMode: String, CaseIterable {
    case tap     = "Haritaya Tıkla"
    case address = "Adres Ara"
}

// MARK: - Route Editor ViewModel
@MainActor
class RouteEditorViewModel: ObservableObject {
    @Published var waypoints: [Waypoint] = []
    @Published var isReverseGeocoding = false
    @Published var isGeocoding = false
    @Published var addressQuery = ""
    @Published var geocodeError: String?
    @Published var cameraPosition: MapCameraPosition = .region(
        MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 39.0, longitude: 35.0),
            span: MKCoordinateSpan(latitudeDelta: 8, longitudeDelta: 8)
        )
    )

    private let baseURL = Config.baseURL

    // MARK: - Tap Mode: haritaya tıklayınca durak ekle
    func addWaypointAt(coordinate: CLLocationCoordinate2D) {
        let order = waypoints.count + 1
        let placeholder = "\(coordinate.latitude.formatted(.number.precision(.fractionLength(4)))), \(coordinate.longitude.formatted(.number.precision(.fractionLength(4))))"
        let wp = Waypoint(order: order, lat: coordinate.latitude, lng: coordinate.longitude, label: placeholder)
        waypoints.append(wp)
        moveCameraTo(coordinate)
        Task { await reverseGeocode(for: waypoints.count - 1, coord: coordinate) }
    }

    private func reverseGeocode(for index: Int, coord: CLLocationCoordinate2D) async {
        guard waypoints.indices.contains(index) else { return }
        guard let url = URL(string: "https://nominatim.openstreetmap.org/reverse?lat=\(coord.latitude)&lon=\(coord.longitude)&format=json") else { return }
        var req = URLRequest(url: url)
        req.setValue("ZirveApp/1.0 contact@zirve.com", forHTTPHeaderField: "User-Agent")
        guard let (data, _) = try? await URLSession.shared.data(for: req),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let displayName = json["display_name"] as? String else { return }
        let short = displayName.split(separator: ",").prefix(2).joined(separator: ",").trimmingCharacters(in: .whitespaces)
        guard waypoints.indices.contains(index) else { return }
        waypoints[index] = Waypoint(order: waypoints[index].order, lat: waypoints[index].lat, lng: waypoints[index].lng, label: short)
    }

    // MARK: - Address Mode: adres arayıp geocode et
    func geocodeAndAdd() async {
        let query = addressQuery.trimmingCharacters(in: .whitespaces)
        guard !query.isEmpty else { return }
        isGeocoding = true
        geocodeError = nil
        guard let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let url = URL(string: "\(baseURL)/locations/geocode?address=\(encoded)") else {
            geocodeError = "Geçersiz adres."
            isGeocoding = false
            return
        }
        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            if let http = response as? HTTPURLResponse, http.statusCode == 200,
               let json = try? JSONDecoder().decode(GeocodeResult.self, from: data) {
                let order = waypoints.count + 1
                let wp = Waypoint(order: order, lat: json.lat, lng: json.lng, label: json.display_name.split(separator: ",").prefix(2).joined(separator: ",").trimmingCharacters(in: .whitespaces))
                waypoints.append(wp)
                moveCameraTo(CLLocationCoordinate2D(latitude: json.lat, longitude: json.lng))
                addressQuery = ""
            } else {
                geocodeError = "Adres bulunamadı."
            }
        } catch {
            geocodeError = "Bağlantı hatası."
        }
        isGeocoding = false
    }

    // MARK: - Waypoint operations
    func updateLabel(at index: Int, label: String) {
        guard waypoints.indices.contains(index) else { return }
        waypoints[index] = Waypoint(order: waypoints[index].order, lat: waypoints[index].lat, lng: waypoints[index].lng, label: label)
    }

    func removeWaypoint(at index: Int) {
        waypoints.remove(at: index)
        for i in waypoints.indices {
            waypoints[i] = Waypoint(order: i + 1, lat: waypoints[i].lat, lng: waypoints[i].lng, label: waypoints[i].label)
        }
        fitCamera()
    }

    func clearAll() {
        waypoints.removeAll()
        cameraPosition = .region(MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 39.0, longitude: 35.0),
            span: MKCoordinateSpan(latitudeDelta: 8, longitudeDelta: 8)
        ))
    }

    // MARK: - Camera helpers
    func moveCameraTo(_ coord: CLLocationCoordinate2D) {
        withAnimation {
            cameraPosition = .region(MKCoordinateRegion(center: coord, span: .init(latitudeDelta: 0.05, longitudeDelta: 0.05)))
        }
    }

    func fitCamera() {
        let valid = waypoints
        guard !valid.isEmpty else { return }
        if valid.count == 1 {
            moveCameraTo(CLLocationCoordinate2D(latitude: valid[0].lat, longitude: valid[0].lng))
            return
        }
        let lats = valid.map(\.lat); let lngs = valid.map(\.lng)
        let center = CLLocationCoordinate2D(latitude: (lats.min()! + lats.max()!) / 2, longitude: (lngs.min()! + lngs.max()!) / 2)
        let span = MKCoordinateSpan(latitudeDelta: (lats.max()! - lats.min()!) * 1.5 + 0.02, longitudeDelta: (lngs.max()! - lngs.min()!) * 1.5 + 0.02)
        withAnimation { cameraPosition = .region(MKCoordinateRegion(center: center, span: span)) }
    }

    var routeCoords: [CLLocationCoordinate2D] {
        waypoints.map { CLLocationCoordinate2D(latitude: $0.lat, longitude: $0.lng) }
    }
}

private struct GeocodeResult: Codable {
    let lat: Double
    let lng: Double
    let display_name: String
}

// MARK: - Route Editor View
struct RouteEditorView: View {
    @Binding var savedWaypoints: [Waypoint]
    @Environment(\.dismiss) private var dismiss
    @StateObject private var vm = RouteEditorViewModel()
    @State private var mode: EditorMode = .tap

    private let accentGreen = Color(red: 0.1, green: 0.5, blue: 0.3)

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // MARK: - Mode Selector
                HStack(spacing: 0) {
                    ForEach(EditorMode.allCases, id: \.self) { m in
                        Button {
                            withAnimation(.easeInOut(duration: 0.2)) { mode = m }
                        } label: {
                            Text(m.rawValue)
                                .font(.subheadline)
                                .fontWeight(mode == m ? .bold : .regular)
                                .foregroundColor(mode == m ? accentGreen : .secondary)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 10)
                                .background(
                                    RoundedRectangle(cornerRadius: 10)
                                        .fill(mode == m ? accentGreen.opacity(0.08) : Color.clear)
                                )
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)

                // Hint
                Text(mode == .tap
                     ? "Haritaya dokunarak durak ekleyin."
                     : "Adres yazıp 'Ara' butonuna basın.")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(.horizontal, 16)
                    .padding(.top, 4)
                    .padding(.bottom, 8)
                    .frame(maxWidth: .infinity, alignment: .leading)

                Divider()

                // MARK: - Map
                MapReader { proxy in
                    Map(position: $vm.cameraPosition) {
                        ForEach(Array(vm.waypoints.enumerated()), id: \.element.id) { idx, wp in
                            Annotation(wp.label, coordinate: CLLocationCoordinate2D(latitude: wp.lat, longitude: wp.lng), anchor: .bottom) {
                                WaypointPin(order: wp.order, isFirst: idx == 0, isLast: idx == vm.waypoints.count - 1)
                            }
                        }
                        if vm.routeCoords.count > 1 {
                            MapPolyline(coordinates: vm.routeCoords)
                                .stroke(accentGreen, style: StrokeStyle(lineWidth: 3, dash: [8, 4]))
                        }
                    }
                    .frame(height: 320)
                    .gesture(
                        mode == .tap
                        ? SpatialTapGesture()
                            .onEnded { value in
                                if let coord = proxy.convert(value.location, from: .local) {
                                    vm.addWaypointAt(coordinate: coord)
                                }
                            }
                        : nil
                    )
                    .overlay(alignment: .topTrailing) {
                        if !vm.waypoints.isEmpty {
                            Button {
                                vm.clearAll()
                            } label: {
                                Label("Temizle", systemImage: "trash.fill")
                                    .font(.caption)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.red)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 6)
                                    .background(.ultraThinMaterial)
                                    .cornerRadius(10)
                            }
                            .padding(10)
                        }
                    }
                }

                Divider()

                // MARK: - Address Input (address mode)
                if mode == .address {
                    HStack(spacing: 10) {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.secondary)
                        TextField("Adres veya konum adı ara...", text: $vm.addressQuery)
                            .submitLabel(.search)
                            .onSubmit { Task { await vm.geocodeAndAdd() } }
                        if vm.isGeocoding {
                            ProgressView().tint(accentGreen)
                        } else {
                            Button("Ara") { Task { await vm.geocodeAndAdd() } }
                                .font(.subheadline)
                                .fontWeight(.bold)
                                .foregroundColor(accentGreen)
                                .disabled(vm.addressQuery.trimmingCharacters(in: .whitespaces).isEmpty)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(Color(UIColor.secondarySystemGroupedBackground))

                    if let err = vm.geocodeError {
                        HStack(spacing: 6) {
                            Image(systemName: "exclamationmark.circle.fill").foregroundColor(.orange)
                            Text(err).font(.caption).foregroundColor(.orange)
                        }
                        .padding(.horizontal, 16)
                        .padding(.bottom, 4)
                    }
                    Divider()
                }

                // MARK: - Waypoints List
                ScrollView {
                    if vm.waypoints.isEmpty {
                        VStack(spacing: 12) {
                            Image(systemName: mode == .tap ? "hand.tap.fill" : "magnifyingglass")
                                .font(.system(size: 36))
                                .foregroundColor(.secondary.opacity(0.4))
                            Text(mode == .tap
                                 ? "Haritaya dokunarak ilk durağı ekleyin"
                                 : "Aramak istediğiniz adresi yazın")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 40)
                    } else {
                        VStack(spacing: 0) {
                            HStack {
                                Text("DURAKLAR")
                                    .font(.caption)
                                    .fontWeight(.bold)
                                    .foregroundColor(.secondary)
                                Spacer()
                                Text("\(vm.waypoints.count) durak")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            .padding(.horizontal, 16)
                            .padding(.top, 14)
                            .padding(.bottom, 8)

                            ForEach(Array(vm.waypoints.enumerated()), id: \.element.id) { idx, wp in
                                WaypointRow(
                                    waypoint: wp,
                                    isFirst: idx == 0,
                                    isLast: idx == vm.waypoints.count - 1,
                                    onLabelChange: { vm.updateLabel(at: idx, label: $0) },
                                    onDelete: { vm.removeWaypoint(at: idx) },
                                    onFocus: {
                                        vm.moveCameraTo(CLLocationCoordinate2D(latitude: wp.lat, longitude: wp.lng))
                                    }
                                )
                                if idx < vm.waypoints.count - 1 {
                                    HStack {
                                        Spacer().frame(width: 52)
                                        Rectangle()
                                            .fill(Color.gray.opacity(0.2))
                                            .frame(height: 1)
                                    }
                                }
                            }
                        }
                    }
                }
                .background(Color(UIColor.systemGroupedBackground))
            }
            .navigationTitle("Rota Oluştur")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("İptal") {
                        dismiss()
                    }
                    .foregroundColor(.secondary)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Kaydet") {
                        savedWaypoints = vm.waypoints
                        dismiss()
                    }
                    .fontWeight(.bold)
                    .foregroundColor(accentGreen)
                    .disabled(vm.waypoints.isEmpty)
                }
            }
        }
        .onAppear {
            vm.waypoints = savedWaypoints
            if !savedWaypoints.isEmpty { vm.fitCamera() }
        }
    }
}

// MARK: - Waypoint Row
private struct WaypointRow: View {
    let waypoint: Waypoint
    let isFirst: Bool
    let isLast: Bool
    let onLabelChange: (String) -> Void
    let onDelete: () -> Void
    let onFocus: () -> Void

    @State private var label: String = ""
    @FocusState private var isFocused: Bool

    private var dotColor: Color {
        isFirst ? Color(red: 0.1, green: 0.5, blue: 0.3) : (isLast ? .red : .blue)
    }

    var body: some View {
        HStack(spacing: 12) {
            // Sıra numarası
            Button(action: onFocus) {
                ZStack {
                    Circle()
                        .fill(dotColor)
                        .frame(width: 28, height: 28)
                    Text("\(waypoint.order)")
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                }
            }
            .buttonStyle(PlainButtonStyle())

            // Label düzenleyici
            TextField("Durak adı", text: $label)
                .font(.subheadline)
                .focused($isFocused)
                .onChange(of: label) { _, newVal in onLabelChange(newVal) }
                .onSubmit { isFocused = false }

            // Koordinat göstergesi
            Text("\(waypoint.lat.formatted(.number.precision(.fractionLength(3))))°")
                .font(.caption2)
                .foregroundColor(.secondary)
                .lineLimit(1)

            // Sil
            Button(action: onDelete) {
                Image(systemName: "xmark.circle.fill")
                    .foregroundColor(.secondary)
                    .font(.body)
            }
            .buttonStyle(PlainButtonStyle())
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .contentShape(Rectangle())
        .onAppear { label = waypoint.label }
        .onChange(of: waypoint.label) { _, newLabel in
            if !isFocused { label = newLabel }
        }
    }
}
