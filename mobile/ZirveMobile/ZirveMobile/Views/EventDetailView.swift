import SwiftUI
import MapKit

struct EventDetailView: View {
    let event: Event

    @EnvironmentObject var authManager: AuthManager

    private var hasRoute: Bool {
        guard let wps = event.waypoints else { return false }
        return !wps.isEmpty
    }

    private var isEventCreator: Bool {
        authManager.currentUser?.id == event.created_by
    }

    private var isVolunteer: Bool {
        authManager.currentUser?.role.lowercased() == "volunteer"
    }

    @State private var showDeleteAlert = false
    @State private var isDeleting = false
    @State private var showDirectionsSheet = false
    @State private var showLoginAlert = false
    @State private var showLoginSheet = false
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                
                // Kapak Görseli veya Gradient Arka Plan
                ZStack(alignment: .bottomLeading) {
                    LinearGradient(
                        colors: [Color.green.opacity(0.8), Color.mint.opacity(0.6)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                    .frame(height: 250)
                    .cornerRadius(16, corners: [.bottomLeft, .bottomRight])
                    .shadow(radius: 5)
                    
                    VStack(alignment: .leading, spacing: 5) {
                        Text(event.category.uppercased())
                            .font(.caption)
                            .fontWeight(.bold)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .background(Color.black.opacity(0.3))
                            .foregroundColor(.white)
                            .cornerRadius(8)
                        
                        Text(event.title)
                            .font(.title)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .lineLimit(3)
                    }
                    .padding(20)
                }
                .ignoresSafeArea(edges: .top)
                
                VStack(alignment: .leading, spacing: 24) {
                    // Temel Bilgi Kartları
                    HStack(alignment: .top, spacing: 15) {
                        InfoCard(icon: "calendar", title: "Tarih", value: formatDate(event.start_date))
                        InfoCard(icon: "mappin.and.ellipse", title: "Konum", value: event.location_name ?? "Belirtilmedi")
                        InfoCard(icon: "bolt.fill", title: "Zorluk", value: event.difficulty.capitalized)
                    }

                    // Yol Tarifi Butonu
                    if hasLocation {
                        Button {
                            showDirectionsSheet = true
                        } label: {
                            HStack(spacing: 10) {
                                Image(systemName: "location.fill")
                                    .font(.subheadline)
                                Text("Yol Tarifi Al")
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                Spacer()
                                Image(systemName: "arrow.up.right")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            .foregroundColor(Color(red: 0.05, green: 0.45, blue: 0.3))
                            .padding(.horizontal, 14)
                            .padding(.vertical, 12)
                            .background(Color(red: 0.05, green: 0.45, blue: 0.3).opacity(0.08))
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color(red: 0.05, green: 0.45, blue: 0.3).opacity(0.2), lineWidth: 1)
                            )
                        }
                        .confirmationDialog(
                            event.location_name ?? "Etkinlik Konumu",
                            isPresented: $showDirectionsSheet,
                            titleVisibility: .visible
                        ) {
                            Button("Apple Maps ile Aç") { openInAppleMaps() }
                            if isGoogleMapsInstalled {
                                Button("Google Maps ile Aç") { openInGoogleMaps() }
                            }
                            Button("İptal", role: .cancel) {}
                        }
                    }

                    // Ücret Bilgisi
                    let isFree = event.is_free ?? true
                    let fee = event.fee ?? 0.0
                    HStack(spacing: 10) {
                        Image(systemName: isFree ? "gift.fill" : "creditcard.fill")
                            .font(.subheadline)
                            .foregroundColor(isFree ? Color(red: 0.05, green: 0.45, blue: 0.3) : .orange)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Katılım Ücreti")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Text(isFree ? "Ücretsiz" : String(format: "₺%.2f", fee))
                                .font(.subheadline)
                                .fontWeight(.bold)
                                .foregroundColor(isFree ? Color(red: 0.05, green: 0.45, blue: 0.3) : .orange)
                        }
                        Spacer()
                        Text(isFree ? "ÜCRETSİZ" : "ÜCRETLİ")
                            .font(.system(size: 10, weight: .black))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .background(isFree ? Color(red: 0.05, green: 0.45, blue: 0.3).opacity(0.12) : Color.orange.opacity(0.12))
                            .foregroundColor(isFree ? Color(red: 0.05, green: 0.45, blue: 0.3) : .orange)
                            .cornerRadius(8)
                    }
                    .padding(14)
                    .background(Color(UIColor.secondarySystemGroupedBackground))
                    .cornerRadius(14)
                    .overlay(
                        RoundedRectangle(cornerRadius: 14)
                            .stroke(isFree ? Color(red: 0.05, green: 0.45, blue: 0.3).opacity(0.2) : Color.orange.opacity(0.2), lineWidth: 1)
                    )

                    // Kulüp & Organizatör Kartı
                    if let clubId = event.organization_id {
                        NavigationLink(destination: ClubProfileView(clubId: clubId, clubName: event.organization_name)) {
                            HStack(spacing: 14) {
                                // Logo / Baş harfler
                                ZStack {
                                    Circle()
                                        .fill(Color(red: 0.05, green: 0.45, blue: 0.3).opacity(0.12))
                                        .frame(width: 48, height: 48)

                                    if let logoUrl = event.organization_logo_url,
                                       let url = URL(string: logoUrl) {
                                        AsyncImage(url: url) { image in
                                            image.resizable().scaledToFill()
                                        } placeholder: {
                                            Text(String((event.organization_name ?? "ZV").prefix(2)).uppercased())
                                                .font(.subheadline)
                                                .fontWeight(.bold)
                                                .foregroundColor(Color(red: 0.05, green: 0.45, blue: 0.3))
                                        }
                                        .frame(width: 44, height: 44)
                                        .clipShape(Circle())
                                    } else {
                                        Text(String((event.organization_name ?? "ZV").prefix(2)).uppercased())
                                            .font(.subheadline)
                                            .fontWeight(.bold)
                                            .foregroundColor(Color(red: 0.05, green: 0.45, blue: 0.3))
                                    }
                                }

                                VStack(alignment: .leading, spacing: 3) {
                                    HStack(spacing: 4) {
                                        Image(systemName: "building.2.fill")
                                            .font(.caption2)
                                            .foregroundColor(Color(red: 0.05, green: 0.45, blue: 0.3))
                                        Text("Düzenleyen Kulüp")
                                            .font(.caption)
                                            .fontWeight(.semibold)
                                            .foregroundColor(Color(red: 0.05, green: 0.45, blue: 0.3))
                                    }
                                    Text(event.organization_name ?? "Bilinmeyen Kulüp")
                                        .font(.subheadline)
                                        .fontWeight(.bold)
                                        .foregroundColor(.primary)

                                    if let organizer = event.organizer_name {
                                        HStack(spacing: 4) {
                                            Image(systemName: "person.fill")
                                                .font(.caption2)
                                                .foregroundColor(.secondary)
                                            Text(organizer)
                                                .font(.caption)
                                                .foregroundColor(.secondary)
                                        }
                                    }
                                }

                                Spacer()

                                VStack(spacing: 2) {
                                    Image(systemName: "chevron.right")
                                        .font(.subheadline)
                                        .fontWeight(.semibold)
                                        .foregroundColor(Color(red: 0.05, green: 0.45, blue: 0.3))
                                    Text("Kulüp\nSayfası")
                                        .font(.caption2)
                                        .fontWeight(.medium)
                                        .foregroundColor(Color(red: 0.05, green: 0.45, blue: 0.3))
                                        .multilineTextAlignment(.center)
                                }
                            }
                            .padding(14)
                            .background(
                                LinearGradient(
                                    colors: [
                                        Color(red: 0.05, green: 0.45, blue: 0.3).opacity(0.06),
                                        Color(red: 0.2, green: 0.7, blue: 0.55).opacity(0.06)
                                    ],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .cornerRadius(14)
                            .overlay(
                                RoundedRectangle(cornerRadius: 14)
                                    .stroke(Color(red: 0.05, green: 0.45, blue: 0.3).opacity(0.2), lineWidth: 1)
                            )
                        }
                        .buttonStyle(PlainButtonStyle())
                    }

                    if let maxVol = event.max_volunteers {
                        HStack {
                            Image(systemName: "person.3.sequence.fill")
                                .foregroundColor(.green)
                            Text("Kontenjan: \(maxVol) Gönüllü")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                        }
                        .padding(.vertical, 10)
                        .padding(.horizontal, 15)
                        .background(Color.green.opacity(0.1))
                        .cornerRadius(10)
                    }
                    
                    Divider()

                    VStack(alignment: .leading, spacing: 10) {
                        Text("Etkinlik Detayları")
                            .font(.headline)
                            .fontWeight(.bold)

                        Text(event.description ?? "Bu etkinlik için bir açıklama girilmemiştir.")
                            .font(.body)
                            .foregroundColor(.secondary)
                            .lineSpacing(4)
                    }

                    // Rota Haritası (waypoint varsa)
                    if hasRoute {
                        EventRouteMapView(event: event)
                    }

                    // Konum Paylaşımı (gönüllü için)
                    if isVolunteer, let token = authManager.accessToken {
                        LocationSharingView(token: token)
                    }

                    // Canlı Gönüllü Takibi (organizatör / etkinlik sahibi için)
                    if isEventCreator, let token = authManager.accessToken {
                        VolunteerTrackingMapView(event: event, token: token)
                    }

                    if let photos = event.photos, !photos.isEmpty {
                        EventPhotoGalleryView(photos: photos)
                    }
                    
                    Spacer(minLength: 40)
                    
                    // Başvur veya Düzenle Butonu
                    if authManager.currentUser == nil {
                        // Giriş yapılmamış
                        VStack(spacing: 12) {
                            HStack(alignment: .top, spacing: 12) {
                                Image(systemName: "lock.fill")
                                    .foregroundColor(Color(red: 0.05, green: 0.45, blue: 0.3))
                                    .font(.title3)
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Başvurmak için giriş yapın")
                                        .font(.subheadline)
                                        .fontWeight(.semibold)
                                        .foregroundColor(.primary)
                                    Text("Bu etkinliğe başvurabilmek için hesabınıza giriş yapmanız gerekiyor.")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }
                            .padding()
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color(red: 0.05, green: 0.45, blue: 0.3).opacity(0.06))
                            .cornerRadius(14)
                            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(red: 0.05, green: 0.45, blue: 0.3).opacity(0.2), lineWidth: 1))

                            HStack(spacing: 12) {
                                Button {
                                    showLoginSheet = true
                                } label: {
                                    Text("Giriş Yap")
                                        .font(.headline).fontWeight(.bold)
                                        .foregroundColor(.white)
                                        .frame(maxWidth: .infinity)
                                        .padding()
                                        .background(Color(red: 0.05, green: 0.45, blue: 0.3))
                                        .cornerRadius(14)
                                }

                                NavigationLink(destination: RegisterView().environmentObject(authManager)) {
                                    Text("Kayıt Ol")
                                        .font(.headline).fontWeight(.bold)
                                        .foregroundColor(Color(red: 0.05, green: 0.45, blue: 0.3))
                                        .frame(maxWidth: .infinity)
                                        .padding()
                                        .background(Color(red: 0.05, green: 0.45, blue: 0.3).opacity(0.1))
                                        .cornerRadius(14)
                                        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(red: 0.05, green: 0.45, blue: 0.3).opacity(0.3), lineWidth: 1))
                                }
                                .buttonStyle(PlainButtonStyle())
                            }
                        }
                        .padding(.bottom, 30)
                        .sheet(isPresented: $showLoginSheet) {
                            NavigationStack {
                                LoginView()
                                    .environmentObject(authManager)
                                    .toolbar {
                                        ToolbarItem(placement: .navigationBarLeading) {
                                            Button("Kapat") { showLoginSheet = false }
                                        }
                                    }
                            }
                        }
                    } else if authManager.currentUser?.id == event.created_by {
                        VStack(spacing: 12) {
                            NavigationLink(destination: EventApplicantsView(eventId: event.id)) {
                                HStack(spacing: 8) {
                                    Image(systemName: "person.2.fill")
                                    Text("Başvuruları Görüntüle")
                                }
                                .font(.headline)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color(red: 0.05, green: 0.45, blue: 0.3))
                                .cornerRadius(16)
                                .shadow(color: Color.green.opacity(0.3), radius: 8, x: 0, y: 5)
                            }
                            
                            NavigationLink(destination: EditEventView(event: event)) {
                                HStack(spacing: 8) {
                                    Image(systemName: "pencil")
                                    Text("Etkinliği Düzenle")
                                }
                                .font(.headline)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.blue)
                                .cornerRadius(16)
                            }

                            NavigationLink(destination: PhotoUploaderView(eventId: UUID(uuidString: event.id) ?? UUID())) {
                                HStack(spacing: 8) {
                                    Image(systemName: "photo.on.rectangle.angled")
                                    Text("Fotoğrafları Yönet")
                                }
                                .font(.headline)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.orange)
                                .cornerRadius(16)
                                .shadow(color: .orange.opacity(0.3), radius: 8, x: 0, y: 5)
                            }

                            Button(role: .destructive) {
                                showDeleteAlert = true
                            } label: {
                                HStack(spacing: 8) {
                                    if isDeleting {
                                        ProgressView().tint(.red)
                                    } else {
                                        Image(systemName: "trash.fill")
                                    }
                                    Text(isDeleting ? "Siliniyor…" : "Etkinliği Sil")
                                        .fontWeight(.bold)
                                }
                                .font(.headline)
                                .foregroundColor(.red)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.red.opacity(0.08))
                                .cornerRadius(16)
                                .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.red.opacity(0.25), lineWidth: 1))
                            }
                            .disabled(isDeleting)
                        }
                        .padding(.bottom, 30)
                        .alert("Etkinliği Sil", isPresented: $showDeleteAlert) {
                            Button("Sil", role: .destructive) {
                                Task {
                                    isDeleting = true
                                    await deleteEvent()
                                }
                            }
                            Button("İptal", role: .cancel) {}
                        } message: {
                            Text("\"\(event.title)\" etkinliği kalıcı olarak silinecek. Bu işlem geri alınamaz.")
                        }
                    } else if authManager.currentUser?.role.lowercased() == "organizer" {
                        HStack(alignment: .top, spacing: 12) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.orange)
                                .font(.title3)
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Bu etkinliğe başvuramazsınız")
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.orange)
                                Text("Etkinliklere yalnızca gönüllü hesapları başvurabilir. Başvurmak için gönüllü hesabıyla giriş yapın.")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        .padding()
                        .background(Color.orange.opacity(0.1))
                        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.orange.opacity(0.3), lineWidth: 1))
                        .cornerRadius(14)
                        .padding(.bottom, 30)
                    } else if isPastEvent(event.end_date) {
                        HStack(alignment: .top, spacing: 12) {
                            Image(systemName: "clock.fill")
                                .foregroundColor(.secondary)
                                .font(.title3)
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Bu etkinlik sona erdi")
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.secondary)
                                Text("Tarihi geçmiş etkinliklere başvuru yapılamaz.")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        .padding()
                        .background(Color.gray.opacity(0.08))
                        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.gray.opacity(0.2), lineWidth: 1))
                        .cornerRadius(14)
                        .padding(.bottom, 30)
                    } else {
                        VStack(spacing: 10) {
                            // Ücretli etkinlik uyarısı
                            let appIsFree = event.is_free ?? true
                            let appFee = event.fee ?? 0.0
                            if !appIsFree {
                                HStack(spacing: 10) {
                                    Image(systemName: "creditcard.fill")
                                        .foregroundColor(.orange)
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("Ücretli Etkinlik")
                                            .font(.caption)
                                            .fontWeight(.bold)
                                            .foregroundColor(.orange)
                                        Text("Başvuru sırasında \(String(format: "₺%.2f", appFee)) kart ödemesi alınacaktır.")
                                            .font(.caption2)
                                            .foregroundColor(.secondary)
                                    }
                                }
                                .padding(12)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(Color.orange.opacity(0.08))
                                .cornerRadius(12)
                                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.orange.opacity(0.2), lineWidth: 1))
                            }

                            NavigationLink(destination: EventApplicationView(event: event)) {
                                HStack(spacing: 8) {
                                    Image(systemName: "paperplane.fill")
                                    Text("Etkinliğe Başvur")
                                }
                                .font(.headline)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(
                                    LinearGradient(
                                        colors: [Color.green, Color.mint],
                                        startPoint: .leading,
                                        endPoint: .trailing
                                    )
                                )
                                .cornerRadius(16)
                                .shadow(color: .green.opacity(0.3), radius: 8, x: 0, y: 5)
                            }
                        }
                        .padding(.bottom, 30)
                    }
                }
                .padding(.horizontal, 20)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
    }
    
    // MARK: - Yol Tarifi Helpers

    private var hasLocation: Bool {
        (event.latitude != nil && event.longitude != nil) || event.location_name != nil
    }

    private var isGoogleMapsInstalled: Bool {
        UIApplication.shared.canOpenURL(URL(string: "comgooglemaps://")!)
    }

    private func openInAppleMaps() {
        if let lat = event.latitude, let lng = event.longitude {
            let url = URL(string: "maps://?daddr=\(lat),\(lng)&dirflg=d")!
            openURL(url)
        } else if let name = event.location_name,
                  let encoded = name.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) {
            let url = URL(string: "maps://?daddr=\(encoded)&dirflg=d")!
            openURL(url)
        }
    }

    private func openInGoogleMaps() {
        if let lat = event.latitude, let lng = event.longitude {
            let url = URL(string: "comgooglemaps://?daddr=\(lat),\(lng)&directionsmode=driving")!
            openURL(url)
        } else if let name = event.location_name,
                  let encoded = name.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) {
            let url = URL(string: "comgooglemaps://?daddr=\(encoded)&directionsmode=driving")!
            openURL(url)
        }
    }

    private func deleteEvent() async {
        guard let token = authManager.accessToken,
              let url = URL(string: "\(Config.baseURL)/events/\(event.id)") else {
            isDeleting = false
            return
        }
        var req = URLRequest(url: url)
        req.httpMethod = "DELETE"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        if let (_, response) = try? await URLSession.shared.data(for: req),
           let http = response as? HTTPURLResponse, http.statusCode == 204 {
            dismiss()
        }
        isDeleting = false
    }

    private func isPastEvent(_ isoString: String) -> Bool {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: isoString) else { return false }
        return date < Date()
    }

    private func formatDate(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: isoString) {
            let displayFormatter = DateFormatter()
            displayFormatter.dateStyle = .medium
            displayFormatter.timeStyle = .short
            return displayFormatter.string(from: date)
        }
        return isoString
    }
}

// Helper: Custom Corner Radius
extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCorner(radius: radius, corners: corners))
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners
    
    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(roundedRect: rect, byRoundingCorners: corners, cornerRadii: CGSize(width: radius, height: radius))
        return Path(path.cgPath)
    }
}

struct InfoCard: View {
    let icon: String
    let title: String
    let value: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(.green)
            
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
            
            Text(value)
                .font(.subheadline)
                .fontWeight(.semibold)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 3, x: 0, y: 2)
    }
}

#Preview {
    EventDetailView(event: Event(
        id: "1",
        title: "Kışın Zorlu Tırmanışı ve Kamp Eğitimi",
        description: "Katılımcılarımızla birlikte kış koşullarında zirveye tırmanacağız. Lütfen ekipmanlarınızı tam getirin. Bu etkinlikte ip teknikleri gösterilecektir.",
        category: "Doga Yuruyusu",
        difficulty: "Zor",
        location_name: "Uludağ Zirve, Bursa",
        start_date: "2026-03-31T09:00:00Z",
        end_date: "2026-04-01T15:00:00Z",
        max_volunteers: 15,
        status: "OPEN",
        created_by: "test-user-id",
        organization_id: "club-preview-id",
        organization_name: "Zirve Dağcılık Kulübü",
        organization_logo_url: nil,
        organizer_name: "Ahmet Yılmaz",
        cover_photo_url: nil,
        photos: nil
    ))
    .environmentObject(AuthManager())
}
