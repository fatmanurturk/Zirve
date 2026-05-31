import SwiftUI
import MapKit

// MARK: - Event Map Pin
private struct EventMapPin: View {
    let category: String

    private var pinColor: Color {
        switch category.lowercased() {
        case "hiking":   return Color(red: 0.1, green: 0.55, blue: 0.3)
        case "climbing": return .orange
        case "camping":  return .brown
        case "cycling":  return .blue
        case "kayaking": return .teal
        default:         return Color(red: 0.2, green: 0.5, blue: 0.2)
        }
    }

    private var categoryIcon: String {
        switch category.lowercased() {
        case "hiking":   return "figure.hiking"
        case "climbing": return "mountain.2.fill"
        case "camping":  return "tent.fill"
        case "cycling":  return "bicycle"
        case "kayaking": return "water.waves"
        default:         return "leaf.fill"
        }
    }

    var body: some View {
        ZStack {
            Circle()
                .fill(pinColor)
                .frame(width: 36, height: 36)
                .shadow(color: pinColor.opacity(0.4), radius: 4, x: 0, y: 2)
            Image(systemName: categoryIcon)
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(.white)
        }
    }
}

// MARK: - Event Preview Sheet
private struct EventPreviewSheet: View {
    let event: Event
    let onNavigate: () -> Void

    private let accentGreen = Color(red: 0.1, green: 0.5, blue: 0.3)

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Capsule()
                .fill(Color.secondary.opacity(0.3))
                .frame(width: 40, height: 4)
                .frame(maxWidth: .infinity)
                .padding(.top, 8)

            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text(event.category.uppercased())
                        .font(.caption2)
                        .fontWeight(.bold)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(accentGreen.opacity(0.1))
                        .foregroundColor(accentGreen)
                        .cornerRadius(6)
                    Spacer()
                    Text(event.difficulty.uppercased())
                        .font(.caption2)
                        .fontWeight(.bold)
                        .foregroundColor(.secondary)
                }

                Text(event.title)
                    .font(.headline)
                    .fontWeight(.bold)
                    .lineLimit(2)

                HStack(spacing: 14) {
                    if let loc = event.location_name {
                        Label(loc, systemImage: "mappin.circle.fill")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }
                    Label(formatDate(event.start_date), systemImage: "calendar")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Button(action: onNavigate) {
                    HStack(spacing: 6) {
                        Image(systemName: "arrow.up.right.circle.fill")
                        Text("Etkinliğe Git")
                            .fontWeight(.semibold)
                    }
                    .font(.subheadline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(accentGreen)
                    .cornerRadius(12)
                }
                .padding(.top, 4)
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 24)
        }
        .background(Color(UIColor.systemBackground))
    }

    private func formatDate(_ iso: String) -> String {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = f.date(from: iso) {
            let df = DateFormatter()
            df.locale = Locale(identifier: "tr_TR")
            df.dateFormat = "d MMM"
            return df.string(from: d)
        }
        return iso
    }
}

// MARK: - EventMapView
struct EventMapView: View {
    let events: [Event]
    @EnvironmentObject var authManager: AuthManager

    @State private var cameraPosition: MapCameraPosition = .automatic
    @State private var selectedEvent: Event?
    @State private var navigationTarget: Event?

    private var eventsWithCoords: [Event] {
        events.filter { eventCoord($0) != nil }
    }

    private func eventCoord(_ event: Event) -> CLLocationCoordinate2D? {
        if let lat = event.latitude, let lng = event.longitude {
            return CLLocationCoordinate2D(latitude: lat, longitude: lng)
        }
        if let first = event.waypoints?.min(by: { $0.order < $1.order }) {
            return CLLocationCoordinate2D(latitude: first.lat, longitude: first.lng)
        }
        return nil
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            Map(position: $cameraPosition) {
                ForEach(eventsWithCoords) { event in
                    if let coord = eventCoord(event) {
                        Annotation(event.title, coordinate: coord, anchor: .bottom) {
                            Button {
                                withAnimation(.spring(response: 0.3)) {
                                    selectedEvent = event
                                }
                            } label: {
                                EventMapPin(category: event.category)
                            }
                        }
                    }
                }
                UserAnnotation()
            }
            .mapControls {
                MapCompass()
                MapScaleView()
                MapUserLocationButton()
            }
            .onAppear { fitMap() }

            // Seçili etkinlik preview
            if let event = selectedEvent {
                EventPreviewSheet(event: event) {
                    navigationTarget = event
                }
                .transition(.move(edge: .bottom))
                .shadow(color: .black.opacity(0.1), radius: 20, x: 0, y: -5)
            }

            // Koordinatsız etkinlik uyarısı
            if eventsWithCoords.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "map.fill")
                        .font(.largeTitle)
                        .foregroundColor(.secondary)
                    Text("Haritada gösterilecek koordinat bilgisi olan etkinlik bulunamadı.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 32)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color(UIColor.secondarySystemGroupedBackground))
            }
        }
        .onTapGesture {
            if selectedEvent != nil {
                withAnimation { selectedEvent = nil }
            }
        }
        .navigationDestination(item: $navigationTarget) { event in
            EventDetailView(event: event)
                .environmentObject(authManager)
        }
    }

    private func fitMap() {
        let coords = eventsWithCoords.compactMap { eventCoord($0) }
        guard !coords.isEmpty else { return }
        if coords.count == 1 {
            cameraPosition = .region(MKCoordinateRegion(
                center: coords[0],
                span: MKCoordinateSpan(latitudeDelta: 0.1, longitudeDelta: 0.1)
            ))
        } else {
            let lats = coords.map(\.latitude)
            let lngs = coords.map(\.longitude)
            let center = CLLocationCoordinate2D(
                latitude: (lats.min()! + lats.max()!) / 2,
                longitude: (lngs.min()! + lngs.max()!) / 2
            )
            let span = MKCoordinateSpan(
                latitudeDelta: (lats.max()! - lats.min()!) * 1.4 + 0.05,
                longitudeDelta: (lngs.max()! - lngs.min()!) * 1.4 + 0.05
            )
            cameraPosition = .region(MKCoordinateRegion(center: center, span: span))
        }
    }
}
